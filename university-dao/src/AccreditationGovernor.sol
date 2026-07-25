// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Governor} from "@openzeppelin/contracts/governance/Governor.sol";
import {GovernorSettings} from "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import {GovernorCountingSimple} from "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import {GovernorVotes} from "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import {GovernorTimelockControl} from "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {UniversityRegistry} from "./UniversityRegistry.sol";

/// @title AccreditationGovernor
/// @notice OZ Governor over the soulbound ministry membership NFT, executing
///         through a TimelockController. One ministry, one vote.
/// @dev Quorum is an absolute member count, not a percentage — with a handful
///      of NFTs, fractional quorum rounds to nonsense. Governance itself can
///      amend it via `setQuorum`. proposalThreshold is 1, so any member may
///      propose. The vote clock is block numbers (inherited from ERC721Votes).
contract AccreditationGovernor is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorTimelockControl
{
    uint256 private _quorumMembers;

    /// @notice The registry this governor opens accreditation resolution votes against.
    address public immutable registry;

    /// @notice Latest resolution proposal per university (0 = none yet).
    mapping(address => uint256) public accreditationProposalId;

    /// @notice True for proposals created via `proposeAccreditation`. These are
    ///         always executable once voting closes; the registry reads the final
    ///         tally and accredits on a passing vote, rejects on anything else.
    mapping(uint256 => bool) public isResolutionProposal;

    event QuorumUpdated(uint256 newQuorum);
    event AccreditationVoteOpened(address indexed university, uint256 indexed proposalId);

    constructor(
        IVotes _token,
        TimelockController _timelock,
        uint48 votingDelay_,
        uint32 votingPeriod_,
        uint256 initialQuorum,
        address registry_
    )
        Governor("Accreditation DAO")
        GovernorSettings(votingDelay_, votingPeriod_, 1) // proposalThreshold = 1 -> any member may propose
        GovernorVotes(_token)
        GovernorTimelockControl(_timelock)
    {
        require(initialQuorum > 0, "quorum must be > 0");
        require(registry_ != address(0), "registry required");
        _quorumMembers = initialQuorum;
        registry = registry_;
        emit QuorumUpdated(initialQuorum);
    }

    /// @notice Opens the single, self-resolving vote on a university's application.
    ///         For = accredit, Against = reject. When the voting period ends the
    ///         proposal is executable either way: `registry.resolveApplication`
    ///         reads the tally and accredits only if quorum was reached AND
    ///         For > Against — otherwise the application is rejected. One vote,
    ///         both outcomes; a failed vote can no longer leave an application in limbo.
    /// @dev Goes through the standard `propose` path, so proposalThreshold
    ///      (membership) and the snapshot rules apply unchanged.
    function proposeAccreditation(address university) external returns (uint256 proposalId) {
        uint256 existing = accreditationProposalId[university];
        if (existing != 0) {
            ProposalState s = state(existing);
            require(
                s == ProposalState.Executed || s == ProposalState.Canceled,
                "Governor: resolution already in flight"
            );
        }

        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        targets[0] = registry;
        values[0] = 0;
        calldatas[0] = abi.encodeCall(UniversityRegistry.resolveApplication, (university));

        // Block-number suffix keeps the description (and so the proposalId) unique
        // across re-applications by the same university.
        string memory description = string.concat(
            "Resolve accreditation application of ",
            Strings.toHexString(university),
            " [block ",
            Strings.toString(block.number),
            "]"
        );

        proposalId = propose(targets, values, calldatas, description);
        isResolutionProposal[proposalId] = true;
        accreditationProposalId[university] = proposalId;
        emit AccreditationVoteOpened(university, proposalId);
    }

    /// @notice Absolute number of votes (== ministries) required for quorum.
    function quorum(uint256) public view override returns (uint256) {
        return _quorumMembers;
    }

    /// @notice Amend quorum as membership grows. `onlyGovernance` routes through
    ///         the timelock, so this is only reachable via a passed proposal.
    function setQuorum(uint256 newQuorum) external onlyGovernance {
        require(newQuorum > 0, "quorum must be > 0");
        _quorumMembers = newQuorum;
        emit QuorumUpdated(newQuorum);
    }

    // ---------------------------------------------------------------------
    // Resolution semantics: a resolution vote never "fails" — it always
    // becomes executable after its deadline, and the OUTCOME (accredit vs
    // reject) is decided by the registry from the recorded tally. Standard
    // proposals (discredit, invite, quorum, ...) keep the normal rules.
    // ---------------------------------------------------------------------

    function _quorumReached(uint256 proposalId)
        internal
        view
        override(Governor, GovernorCountingSimple)
        returns (bool)
    {
        if (isResolutionProposal[proposalId]) return true;
        return super._quorumReached(proposalId);
    }

    function _voteSucceeded(uint256 proposalId)
        internal
        view
        override(Governor, GovernorCountingSimple)
        returns (bool)
    {
        if (isResolutionProposal[proposalId]) return true;
        return super._voteSucceeded(proposalId);
    }

    // ---------------------------------------------------------------------
    // Required overrides (Solidity multiple-inheritance plumbing, OZ v5)
    // ---------------------------------------------------------------------

    function votingDelay() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.votingDelay();
    }

    function votingPeriod() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.votingPeriod();
    }

    function proposalThreshold() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.proposalThreshold();
    }

    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function proposalNeedsQueuing(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.proposalNeedsQueuing(proposalId);
    }

    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint48) {
        return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor() internal view override(Governor, GovernorTimelockControl) returns (address) {
        return super._executor();
    }
}
