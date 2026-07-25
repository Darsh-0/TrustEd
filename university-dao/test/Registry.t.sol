// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {UniversityRegistry} from "../src/UniversityRegistry.sol";

/// Minimal stand-in for the governor's tally surface, so registry resolution
/// logic is unit-testable without a full governance stack.
contract MockResolutionGovernor {
    uint256 public quorumValue;
    uint256 internal _against;
    uint256 internal _for;
    uint256 internal _abstain;
    mapping(address => uint256) public accreditationProposalId;

    function set(
        address uni,
        uint256 id,
        uint256 againstVotes,
        uint256 forVotes,
        uint256 abstainVotes,
        uint256 quorum_
    ) external {
        accreditationProposalId[uni] = id;
        _against = againstVotes;
        _for = forVotes;
        _abstain = abstainVotes;
        quorumValue = quorum_;
    }

    function proposalVotes(uint256) external view returns (uint256, uint256, uint256) {
        return (_against, _for, _abstain);
    }

    function quorum(uint256) external view returns (uint256) {
        return quorumValue;
    }
}

contract RegistryTest is Test {
    UniversityRegistry internal registry;
    MockResolutionGovernor internal mockGov;

    address internal dao = makeAddr("dao"); // stands in for the timelock
    address internal uni = makeAddr("university");
    address internal rando = makeAddr("rando");

    bytes internal constant KEY = hex"d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a";
    bytes internal constant NEW_KEY = hex"3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c";

    function setUp() public {
        mockGov = new MockResolutionGovernor();
        registry = new UniversityRegistry(dao, address(mockGov));
    }

    function _apply(address u) internal {
        vm.prank(u);
        registry.submitApplication("University of Canterbury", "NZ", "ed25519", KEY);
    }

    function _accredit(address u) internal {
        vm.prank(dao);
        registry.accredit(u);
    }

    function _status(address u) internal view returns (UniversityRegistry.Status) {
        return registry.getUniversity(u).status;
    }

    // ------------------------------------------------------------------
    // submitApplication — permissionless, msg.sender is the identity
    // ------------------------------------------------------------------

    function test_Submit_IsPermissionless_RecordsSenderAndFields() public {
        vm.warp(1_000_000);
        vm.expectEmit(true, false, false, true);
        emit UniversityRegistry.ApplicationSubmitted(uni, "University of Canterbury", "NZ", "ed25519", KEY);
        _apply(uni);

        UniversityRegistry.University memory u = registry.getUniversity(uni);
        assertEq(uint8(u.status), uint8(UniversityRegistry.Status.Pending));
        assertEq(u.name, "University of Canterbury");
        assertEq(u.country, "NZ");
        assertEq(u.keyType, "ed25519");
        assertEq(u.publicKey, KEY);
        assertEq(u.lastUpdated, 1_000_000);

        assertEq(registry.applicantCount(), 1);
        assertEq(registry.applicantAt(0), uni);
        assertFalse(registry.isAccredited(uni));
    }

    function test_Submit_RevertsOnEmptyKey() public {
        vm.prank(uni);
        vm.expectRevert("Registry: empty public key");
        registry.submitApplication("U", "NZ", "ed25519", "");
    }

    function test_Submit_RevertsWhilePending() public {
        _apply(uni);
        vm.prank(uni);
        vm.expectRevert("Registry: application not allowed");
        registry.submitApplication("U", "NZ", "ed25519", KEY);
    }

    function test_Submit_RevertsWhileAccredited() public {
        _apply(uni);
        _accredit(uni);
        vm.prank(uni);
        vm.expectRevert("Registry: application not allowed");
        registry.submitApplication("U", "NZ", "ed25519", KEY);
    }

    function test_RevokedUniversity_CanReapply_WithoutDuplicateEnumeration() public {
        _apply(uni);
        _accredit(uni);
        vm.prank(dao);
        registry.discredit(uni, "diploma mill");

        _apply(uni); // re-application after revocation is allowed
        assertEq(uint8(_status(uni)), uint8(UniversityRegistry.Status.Pending));
        assertEq(registry.applicantCount(), 1); // enumerated once, ever
    }

    function test_RejectedUniversity_CanReapply_WithoutDuplicateEnumeration() public {
        _apply(uni);
        vm.prank(dao);
        registry.rejectApplication(uni);
        assertEq(uint8(_status(uni)), uint8(UniversityRegistry.Status.None));

        _apply(uni);
        assertEq(uint8(_status(uni)), uint8(UniversityRegistry.Status.Pending));
        assertEq(registry.applicantCount(), 1);
    }

    function testFuzz_Submit_AnyAddressAnyKey(address u, bytes calldata key) public {
        vm.assume(u != address(0));
        vm.assume(key.length > 0);

        vm.prank(u);
        registry.submitApplication("Fuzz University", "XX", "opaque", key);

        assertEq(uint8(_status(u)), uint8(UniversityRegistry.Status.Pending));
        assertFalse(registry.isAccredited(u));
        assertEq(registry.applicantCount(), 1);
    }

    // ------------------------------------------------------------------
    // DAO-only transitions
    // ------------------------------------------------------------------

    function test_DaoActions_RevertFromNonOwner_IncludingTheUniversity() public {
        _apply(uni);

        address[2] memory callers = [rando, uni];
        for (uint256 i = 0; i < callers.length; i++) {
            vm.startPrank(callers[i]);
            bytes memory err = abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, callers[i]);
            vm.expectRevert(err);
            registry.accredit(uni);
            vm.expectRevert(err);
            registry.discredit(uni, "nope");
            vm.expectRevert(err);
            registry.rejectApplication(uni);
            vm.expectRevert(err);
            registry.approveKeyRotation(uni);
            vm.stopPrank();
        }
    }

    function test_Accredit_MovesPendingToAccredited() public {
        _apply(uni);
        vm.expectEmit(true, false, false, true);
        emit UniversityRegistry.Accredited(uni);
        _accredit(uni);

        assertTrue(registry.isAccredited(uni));
        assertEq(registry.publicKeyOf(uni), KEY);
    }

    function test_Accredit_RequiresPending() public {
        vm.prank(dao);
        vm.expectRevert("Registry: not pending");
        registry.accredit(uni); // never applied

        _apply(uni);
        _accredit(uni);
        vm.prank(dao);
        vm.expectRevert("Registry: not pending");
        registry.accredit(uni); // already accredited
    }

    function test_Discredit_MovesAccreditedToRevoked_WithReason() public {
        _apply(uni);
        _accredit(uni);

        vm.expectEmit(true, false, false, true);
        emit UniversityRegistry.Discredited(uni, "diploma mill");
        vm.prank(dao);
        registry.discredit(uni, "diploma mill");

        assertEq(uint8(_status(uni)), uint8(UniversityRegistry.Status.Revoked));
        assertFalse(registry.isAccredited(uni));
    }

    function test_Discredit_RequiresAccredited() public {
        _apply(uni);
        vm.prank(dao);
        vm.expectRevert("Registry: not accredited");
        registry.discredit(uni, "still pending");
    }

    function test_PublicKeyOf_RevertsUnlessAccredited() public {
        vm.expectRevert("Registry: not accredited");
        registry.publicKeyOf(uni); // None

        _apply(uni);
        vm.expectRevert("Registry: not accredited");
        registry.publicKeyOf(uni); // Pending

        _accredit(uni);
        assertEq(registry.publicKeyOf(uni), KEY); // Accredited: works

        vm.prank(dao);
        registry.discredit(uni, "gone");
        vm.expectRevert("Registry: not accredited");
        registry.publicKeyOf(uni); // Revoked
    }

    function test_ApplicantAt_RevertsOutOfBounds() public {
        vm.expectRevert("Registry: index out of bounds");
        registry.applicantAt(0);
    }

    // ------------------------------------------------------------------
    // resolveApplication — one vote settles the application either way
    // ------------------------------------------------------------------

    function test_Resolve_AccreditsWhenQuorumMet_AndMoreForThanAgainst() public {
        _apply(uni);
        mockGov.set(uni, 42, 1, 3, 0, 3); // against=1 for=3 abstain=0, quorum 3

        vm.expectEmit(true, false, false, true);
        emit UniversityRegistry.ApplicationResolved(uni, true, 3, 1, 0);
        vm.prank(dao);
        registry.resolveApplication(uni);

        assertTrue(registry.isAccredited(uni));
        assertEq(registry.publicKeyOf(uni), KEY);
    }

    function test_Resolve_RejectsWhenMajorityAgainst() public {
        _apply(uni);
        mockGov.set(uni, 42, 2, 2, 1, 3); // quorum met (2+1), but For is not > Against

        vm.prank(dao);
        registry.resolveApplication(uni);

        assertEq(uint8(_status(uni)), uint8(UniversityRegistry.Status.None));
        assertFalse(registry.isAccredited(uni));
    }

    function test_Resolve_RejectsWhenQuorumUnmet_EvenIfUnanimous() public {
        _apply(uni);
        mockGov.set(uni, 42, 0, 2, 0, 3); // 2 For, nobody else showed up

        vm.expectEmit(true, false, false, true);
        emit UniversityRegistry.ApplicationRejected(uni);
        vm.prank(dao);
        registry.resolveApplication(uni);

        assertEq(uint8(_status(uni)), uint8(UniversityRegistry.Status.None));
    }

    function test_Resolve_RejectedUniversityCanReapply() public {
        _apply(uni);
        mockGov.set(uni, 42, 0, 0, 0, 3);
        vm.prank(dao);
        registry.resolveApplication(uni); // rejected

        _apply(uni); // None -> may re-apply
        assertEq(uint8(_status(uni)), uint8(UniversityRegistry.Status.Pending));
        assertEq(registry.applicantCount(), 1);
    }

    function test_Resolve_RevertsWithoutResolutionVote() public {
        _apply(uni); // mock still maps uni -> 0
        vm.prank(dao);
        vm.expectRevert("Registry: no resolution vote");
        registry.resolveApplication(uni);
    }

    function test_Resolve_RevertsUnlessPending() public {
        mockGov.set(uni, 42, 0, 3, 0, 3);
        vm.prank(dao);
        vm.expectRevert("Registry: not pending");
        registry.resolveApplication(uni); // never applied
    }

    function test_Resolve_RevertsFromNonOwner() public {
        _apply(uni);
        mockGov.set(uni, 42, 0, 3, 0, 3);
        vm.prank(uni);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, uni));
        registry.resolveApplication(uni);
    }

    // ------------------------------------------------------------------
    // Key rotation — staged by the university, authoritative only after a vote
    // ------------------------------------------------------------------

    function test_RequestKeyRotation_OnlyAccredited() public {
        _apply(uni); // Pending is not enough
        vm.prank(uni);
        vm.expectRevert("Registry: not accredited");
        registry.requestKeyRotation("ed25519", NEW_KEY);
    }

    function test_RequestKeyRotation_DoesNotTouchLiveKey() public {
        _apply(uni);
        _accredit(uni);

        vm.expectEmit(true, false, false, true);
        emit UniversityRegistry.KeyRotationRequested(uni, "ed25519", NEW_KEY);
        vm.prank(uni);
        registry.requestKeyRotation("ed25519", NEW_KEY);

        assertEq(registry.publicKeyOf(uni), KEY); // live key unchanged until the DAO votes
        (, bytes memory stagedKey) = registry.pendingKeyOf(uni);
        assertEq(stagedKey, NEW_KEY);
    }

    function test_ApproveKeyRotation_AppliesStagedKey() public {
        _apply(uni);
        _accredit(uni);
        vm.prank(uni);
        registry.requestKeyRotation("secp256k1", NEW_KEY);

        vm.expectEmit(true, false, false, true);
        emit UniversityRegistry.KeyRotationApproved(uni, "secp256k1", NEW_KEY);
        vm.prank(dao);
        registry.approveKeyRotation(uni);

        assertEq(registry.publicKeyOf(uni), NEW_KEY);
        UniversityRegistry.University memory u = registry.getUniversity(uni);
        assertEq(u.keyType, "secp256k1");
        (, bytes memory stagedKey) = registry.pendingKeyOf(uni);
        assertEq(stagedKey.length, 0); // staging area cleared
    }

    function test_ApproveKeyRotation_RevertsWithoutRequest() public {
        _apply(uni);
        _accredit(uni);
        vm.prank(dao);
        vm.expectRevert("Registry: no pending key");
        registry.approveKeyRotation(uni);
    }

    function test_Discredit_ClearsPendingRotation() public {
        _apply(uni);
        _accredit(uni);
        vm.prank(uni);
        registry.requestKeyRotation("ed25519", NEW_KEY);

        vm.prank(dao);
        registry.discredit(uni, "revoked mid-rotation");

        (, bytes memory stagedKey) = registry.pendingKeyOf(uni);
        assertEq(stagedKey.length, 0);

        // even after re-applying and re-accrediting, the stale request stays dead
        _apply(uni);
        _accredit(uni);
        vm.prank(dao);
        vm.expectRevert("Registry: no pending key");
        registry.approveKeyRotation(uni);
    }
}
