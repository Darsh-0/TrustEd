// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Votes} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Votes.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MinistryMembership
/// @notice Soulbound ERC721 where one token == one ministry == one vote.
///         Owned by the TimelockController, so membership changes only happen
///         through executed DAO proposals.
contract MinistryMembership is ERC721, EIP712, ERC721Votes, Ownable {
    uint256 private _nextTokenId = 1; // 0 is reserved as "no token" in _tokenIdOf
    uint256 private _memberCount;

    mapping(address => uint256) private _tokenIdOf;
    mapping(address => string) private _memberNames;

    event MinistryInvited(address indexed ministry, uint256 indexed tokenId, string name);
    event MinistryRevoked(address indexed ministry, uint256 indexed tokenId);

    constructor(address initialOwner)
        ERC721("Ministry Membership", "MIN")
        EIP712("MinistryMembership", "1")
        Ownable(initialOwner)
    {}

    /// @notice Mints a membership token to a new ministry. Only reachable
    ///         through an executed DAO proposal (owner is the timelock).
    /// @dev Self-delegates on mint so the ministry has voting power immediately;
    ///      without this, getVotes() stays 0 until they remember to delegate.
    function inviteMinistry(address ministry, string calldata ministryName)
        external
        onlyOwner
        returns (uint256 tokenId)
    {
        require(ministry != address(0), "Membership: zero address");
        require(balanceOf(ministry) == 0, "Membership: already a member");

        tokenId = _nextTokenId++;
        _delegate(ministry, ministry);
        _mint(ministry, tokenId);

        _tokenIdOf[ministry] = tokenId;
        _memberNames[ministry] = ministryName;
        _memberCount++;

        emit MinistryInvited(ministry, tokenId, ministryName);
    }

    /// @notice Burns a ministry's membership token, removing its vote going forward.
    function revokeMembership(address ministry) external onlyOwner {
        uint256 tokenId = _tokenIdOf[ministry];
        require(tokenId != 0, "Membership: not a member");

        _burn(tokenId);

        delete _tokenIdOf[ministry];
        delete _memberNames[ministry];
        _memberCount--;

        emit MinistryRevoked(ministry, tokenId);
    }

    function isMember(address account) external view returns (bool) {
        return _tokenIdOf[account] != 0;
    }

    function memberName(address account) external view returns (string memory) {
        return _memberNames[account];
    }

    /// @dev Explicit counter — _nextTokenId over-counts once members are revoked.
    function memberCount() external view returns (uint256) {
        return _memberCount;
    }

    /// @dev Soulbound: mint (from == 0) and burn (to == 0) are legal, transfers are not.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Votes)
        returns (address)
    {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), "Soulbound: non-transferable");
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 amount) internal override(ERC721, ERC721Votes) {
        super._increaseBalance(account, amount);
    }
}
