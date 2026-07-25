// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {MinistryMembership} from "../src/MinistryMembership.sol";

contract MembershipTest is Test {
    MinistryMembership internal membership;

    address internal dao = makeAddr("dao"); // stands in for the timelock
    address internal alice = makeAddr("ministry-alice");
    address internal bob = makeAddr("ministry-bob");
    address internal rando = makeAddr("rando");

    function setUp() public {
        membership = new MinistryMembership(dao);
    }

    function _invite(address ministry, string memory name) internal returns (uint256) {
        vm.prank(dao);
        return membership.inviteMinistry(ministry, name);
    }

    // ------------------------------------------------------------------
    // Invite
    // ------------------------------------------------------------------

    function test_Invite_MintsToken_RecordsName_CountsMember() public {
        vm.expectEmit(true, true, false, true);
        emit MinistryMembership.MinistryInvited(alice, 1, "Alice Ministry");
        uint256 tokenId = _invite(alice, "Alice Ministry");

        assertEq(tokenId, 1);
        assertEq(membership.balanceOf(alice), 1);
        assertEq(membership.ownerOf(1), alice);
        assertTrue(membership.isMember(alice));
        assertEq(membership.memberName(alice), "Alice Ministry");
        assertEq(membership.memberCount(), 1);
    }

    /// A ministry has voting power immediately after being invited; if mint did
    /// not self-delegate, getVotes() would be 0 and every proposal would
    /// silently fail quorum.
    function test_Invite_AutoDelegates_VotesAvailableImmediately() public {
        _invite(alice, "Alice Ministry");
        assertEq(membership.getVotes(alice), 1);
        assertEq(membership.delegates(alice), alice);
    }

    function test_Invite_RevertsForSecondToken() public {
        _invite(alice, "Alice Ministry");
        vm.prank(dao);
        vm.expectRevert("Membership: already a member");
        membership.inviteMinistry(alice, "Alice Again");
    }

    function test_Invite_RevertsForZeroAddress() public {
        vm.prank(dao);
        vm.expectRevert("Membership: zero address");
        membership.inviteMinistry(address(0), "Nobody");
    }

    function test_Invite_RevertsFromNonOwner() public {
        vm.prank(rando);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, rando));
        membership.inviteMinistry(rando, "Self-Invited Ministry");
    }

    // ------------------------------------------------------------------
    // Revoke
    // ------------------------------------------------------------------

    function test_Revoke_BurnsToken_ClearsState_ZeroesVotes() public {
        uint256 tokenId = _invite(alice, "Alice Ministry");

        vm.expectEmit(true, true, false, true);
        emit MinistryMembership.MinistryRevoked(alice, tokenId);
        vm.prank(dao);
        membership.revokeMembership(alice);

        assertEq(membership.balanceOf(alice), 0);
        assertFalse(membership.isMember(alice));
        assertEq(membership.memberName(alice), "");
        assertEq(membership.memberCount(), 0);
        assertEq(membership.getVotes(alice), 0);
    }

    function test_Revoke_RevertsFromNonOwner() public {
        _invite(alice, "Alice Ministry");
        vm.prank(rando);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, rando));
        membership.revokeMembership(alice);
    }

    function test_Revoke_RevertsForNonMember() public {
        vm.prank(dao);
        vm.expectRevert("Membership: not a member");
        membership.revokeMembership(bob);
    }

    /// memberCount must survive burn + re-invite cycles (_nextTokenId alone would drift).
    function test_RevokeThenReinvite_CountStaysCorrect() public {
        _invite(alice, "Alice Ministry");
        _invite(bob, "Bob Ministry");
        vm.prank(dao);
        membership.revokeMembership(alice);

        uint256 newId = _invite(alice, "Alice Ministry v2");
        assertEq(newId, 3); // ids never reused
        assertEq(membership.memberCount(), 2);
        assertEq(membership.getVotes(alice), 1);
    }

    // ------------------------------------------------------------------
    // Soulbound: mint and burn succeed (above); any transfer reverts
    // ------------------------------------------------------------------

    function test_Transfer_Reverts() public {
        uint256 tokenId = _invite(alice, "Alice Ministry");

        vm.prank(alice);
        vm.expectRevert("Soulbound: non-transferable");
        membership.transferFrom(alice, bob, tokenId);

        vm.prank(alice);
        vm.expectRevert("Soulbound: non-transferable");
        membership.safeTransferFrom(alice, bob, tokenId);
    }

    function testFuzz_Transfer_AlwaysReverts(address to) public {
        vm.assume(to != address(0)); // transferFrom rejects the zero address before the soulbound check
        uint256 tokenId = _invite(alice, "Alice Ministry");

        vm.prank(alice);
        vm.expectRevert("Soulbound: non-transferable");
        membership.transferFrom(alice, to, tokenId);
    }
}
