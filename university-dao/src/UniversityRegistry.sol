// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @dev The slice of the governor the registry needs to resolve an application
///      from a finished vote's tally.
interface IResolutionGovernor {
    function proposalVotes(uint256 proposalId)
        external
        view
        returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes);
    function quorum(uint256 timepoint) external view returns (uint256);
    function accreditationProposalId(address university) external view returns (uint256);
}

/// @title UniversityRegistry
/// @notice Public, on-chain registry of accredited universities and their
///         self-published public keys. Universities apply permissionlessly from
///         their own address; only the DAO (via its timelock, the owner) can
///         accredit, discredit, reject, or approve a key rotation.
/// @dev Public keys are treated as opaque bytes: the contract does not verify
///      that a key is well-formed for its keyType, nor that the submitter
///      controls the corresponding private key. A production system would
///      require a challenge-response signature at application time.
contract UniversityRegistry is Ownable {
    enum Status {
        None,
        Pending,
        Accredited,
        Revoked
    }

    struct University {
        string name;
        string country; // ISO 3166-1 alpha-2
        string keyType; // e.g. "ed25519", "secp256k1", "rsa-2048"
        bytes publicKey; // opaque key material, supplied by the university
        Status status;
        uint256 lastUpdated; // block.timestamp
    }

    struct PendingKey {
        string keyType;
        bytes publicKey; // length > 0 iff a rotation is pending
    }

    mapping(address => University) private _universities;
    mapping(address => PendingKey) private _pendingKeys;
    address[] private _allApplicants; // for enumeration in the UI
    mapping(address => bool) private _knownApplicant; // guards against duplicate pushes

    /// @notice The governor whose finished resolution votes this registry trusts
    ///         for tallies. Set once at deployment (the governor's address is
    ///         precomputed from the deployer's nonce, since each needs the other).
    address public immutable governor;

    event ApplicationSubmitted(
        address indexed university, string name, string country, string keyType, bytes publicKey
    );
    event ApplicationResolved(
        address indexed university, bool accredited, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes
    );
    event Accredited(address indexed university);
    event Discredited(address indexed university, string reason);
    event ApplicationRejected(address indexed university);
    event KeyRotationRequested(address indexed university, string keyType, bytes publicKey);
    event KeyRotationApproved(address indexed university, string keyType, bytes publicKey);

    constructor(address initialOwner, address governor_) Ownable(initialOwner) {
        require(governor_ != address(0), "Registry: governor required");
        governor = governor_;
    }

    // ---------------------------------------------------------------------
    // Permissionless — called by universities themselves
    // ---------------------------------------------------------------------

    /// @notice A university applies for accreditation with its own key material.
    ///         msg.sender is the university's identity; nobody can apply on its behalf.
    ///         Revoked institutions may re-apply.
    function submitApplication(
        string calldata name,
        string calldata country,
        string calldata keyType,
        bytes calldata publicKey
    ) external {
        Status status = _universities[msg.sender].status;
        require(status == Status.None || status == Status.Revoked, "Registry: application not allowed");
        require(publicKey.length > 0, "Registry: empty public key");

        _universities[msg.sender] = University({
            name: name,
            country: country,
            keyType: keyType,
            publicKey: publicKey,
            status: Status.Pending,
            lastUpdated: block.timestamp
        });
        delete _pendingKeys[msg.sender]; // drop any stale rotation request from a past accreditation

        if (!_knownApplicant[msg.sender]) {
            _knownApplicant[msg.sender] = true;
            _allApplicants.push(msg.sender);
        }

        emit ApplicationSubmitted(msg.sender, name, country, keyType, publicKey);
    }

    /// @notice An accredited university stages a new key for itself. The live key
    ///         is untouched until the DAO votes `approveKeyRotation` through —
    ///         no key becomes authoritative without a vote.
    function requestKeyRotation(string calldata keyType, bytes calldata publicKey) external {
        require(_universities[msg.sender].status == Status.Accredited, "Registry: not accredited");
        require(publicKey.length > 0, "Registry: empty public key");

        _pendingKeys[msg.sender] = PendingKey({keyType: keyType, publicKey: publicKey});

        emit KeyRotationRequested(msg.sender, keyType, publicKey);
    }

    // ---------------------------------------------------------------------
    // DAO-only — reachable only through an executed proposal (owner = timelock)
    // ---------------------------------------------------------------------

    /// @notice Settles a pending application from the outcome of its resolution
    ///         vote (see AccreditationGovernor.proposeAccreditation). Reached only
    ///         through the timelock, after the vote's deadline. Accredits when the
    ///         final tally reached quorum with more For than Against; rejects in
    ///         every other case — including a vote nobody showed up for. One vote,
    ///         both outcomes: a failed vote can no longer strand an application.
    function resolveApplication(address university) external onlyOwner {
        University storage u = _universities[university];
        require(u.status == Status.Pending, "Registry: not pending");

        uint256 proposalId = IResolutionGovernor(governor).accreditationProposalId(university);
        require(proposalId != 0, "Registry: no resolution vote");

        (uint256 against, uint256 forVotes, uint256 abstain) =
            IResolutionGovernor(governor).proposalVotes(proposalId);
        bool accredited =
            forVotes + abstain >= IResolutionGovernor(governor).quorum(0) && forVotes > against;

        if (accredited) {
            u.status = Status.Accredited;
            emit Accredited(university);
        } else {
            u.status = Status.None; // rejected: the university may re-apply
            emit ApplicationRejected(university);
        }
        u.lastUpdated = block.timestamp;

        emit ApplicationResolved(university, accredited, forVotes, against, abstain);
    }

    function accredit(address university) external onlyOwner {
        University storage u = _universities[university];
        require(u.status == Status.Pending, "Registry: not pending");
        u.status = Status.Accredited;
        u.lastUpdated = block.timestamp;
        emit Accredited(university);
    }

    function discredit(address university, string calldata reason) external onlyOwner {
        University storage u = _universities[university];
        require(u.status == Status.Accredited, "Registry: not accredited");
        u.status = Status.Revoked;
        u.lastUpdated = block.timestamp;
        delete _pendingKeys[university];
        emit Discredited(university, reason);
    }

    function rejectApplication(address university) external onlyOwner {
        University storage u = _universities[university];
        require(u.status == Status.Pending, "Registry: not pending");
        u.status = Status.None;
        u.lastUpdated = block.timestamp;
        emit ApplicationRejected(university);
    }

    function approveKeyRotation(address university) external onlyOwner {
        University storage u = _universities[university];
        PendingKey storage pending = _pendingKeys[university];
        require(u.status == Status.Accredited, "Registry: not accredited");
        require(pending.publicKey.length > 0, "Registry: no pending key");

        u.keyType = pending.keyType;
        u.publicKey = pending.publicKey;
        u.lastUpdated = block.timestamp;

        emit KeyRotationApproved(university, u.keyType, u.publicKey);
        delete _pendingKeys[university];
    }

    // ---------------------------------------------------------------------
    // Public reads — the consumer surface (free via eth_call, no wallet needed)
    // ---------------------------------------------------------------------

    function getUniversity(address university) external view returns (University memory) {
        return _universities[university];
    }

    function isAccredited(address university) external view returns (bool) {
        return _universities[university].status == Status.Accredited;
    }

    function publicKeyOf(address university) external view returns (bytes memory) {
        University storage u = _universities[university];
        require(u.status == Status.Accredited, "Registry: not accredited");
        return u.publicKey;
    }

    /// @notice The key a university has staged for DAO approval; empty if none.
    function pendingKeyOf(address university)
        external
        view
        returns (string memory keyType, bytes memory publicKey)
    {
        PendingKey storage pending = _pendingKeys[university];
        return (pending.keyType, pending.publicKey);
    }

    function applicantCount() external view returns (uint256) {
        return _allApplicants.length;
    }

    function applicantAt(uint256 index) external view returns (address) {
        require(index < _allApplicants.length, "Registry: index out of bounds");
        return _allApplicants[index];
    }
}
