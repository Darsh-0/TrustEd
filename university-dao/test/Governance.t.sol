// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {MinistryMembership} from "../src/MinistryMembership.sol";
import {UniversityRegistry} from "../src/UniversityRegistry.sol";
import {AccreditationGovernor} from "../src/AccreditationGovernor.sol";

/// Full proposal lifecycle over the real timelock + governor + token + registry
/// stack, wired exactly like script/Deploy.s.sol (demo profile).
contract GovernanceTest is Test {
    TimelockController internal timelock;
    MinistryMembership internal membership;
    UniversityRegistry internal registry;
    AccreditationGovernor internal governor;

    uint48 internal constant VOTING_DELAY = 0; // blocks
    uint32 internal constant VOTING_PERIOD = 50; // blocks
    uint256 internal constant TIMELOCK_DELAY = 60; // seconds
    uint256 internal constant QUORUM = 3;
    uint256 internal constant NUM_MINISTRIES = 5;

    address internal deployer = makeAddr("deployer");
    address[] internal ministries;
    address internal university = makeAddr("university-of-canterbury");
    address internal rando = makeAddr("rando");

    bytes internal constant KEY = hex"d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a";
    bytes internal constant NEW_KEY = hex"3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c";

    function setUp() public {
        for (uint256 i = 0; i < NUM_MINISTRIES; i++) {
            ministries.push(makeAddr(string.concat("ministry-", vm.toString(i))));
        }

        // Mirror the deploy script: timelock owns everything, deployer bootstraps
        // the founding ministries, then renounces every privileged handle.
        vm.startPrank(deployer);
        timelock = new TimelockController(TIMELOCK_DELAY, new address[](0), new address[](0), deployer);
        membership = new MinistryMembership(deployer);
        // registry <-> governor reference each other; precompute the governor address
        address governorAddr = vm.computeCreateAddress(deployer, vm.getNonce(deployer) + 1);
        registry = new UniversityRegistry(address(timelock), governorAddr);
        governor = new AccreditationGovernor(
            IVotes(address(membership)), timelock, VOTING_DELAY, VOTING_PERIOD, QUORUM, address(registry)
        );
        assertEq(address(governor), governorAddr, "governor precompute drift");
        timelock.grantRole(timelock.PROPOSER_ROLE(), address(governor));
        timelock.grantRole(timelock.CANCELLER_ROLE(), address(governor));
        timelock.grantRole(timelock.EXECUTOR_ROLE(), address(0));
        for (uint256 i = 0; i < NUM_MINISTRIES; i++) {
            membership.inviteMinistry(ministries[i], string.concat("Ministry ", vm.toString(i)));
        }
        membership.transferOwnership(address(timelock));
        timelock.renounceRole(timelock.DEFAULT_ADMIN_ROLE(), deployer);
        vm.stopPrank();

        // Voting checkpoints must be strictly older than a proposal's snapshot.
        vm.roll(block.number + 1);
    }

    // ------------------------------------------------------------------
    // Helpers (queue/execute take targets+calldatas+descriptionHash, not the id)
    // ------------------------------------------------------------------

    function _single(address target, bytes memory data)
        internal
        pure
        returns (address[] memory targets, uint256[] memory values, bytes[] memory calldatas)
    {
        targets = new address[](1);
        values = new uint256[](1);
        calldatas = new bytes[](1);
        targets[0] = target;
        values[0] = 0;
        calldatas[0] = data;
    }

    function _propose(address proposer, address target, bytes memory data, string memory description)
        internal
        returns (uint256 proposalId)
    {
        (address[] memory t, uint256[] memory v, bytes[] memory c) = _single(target, data);
        vm.prank(proposer);
        proposalId = governor.propose(t, v, c, description);
    }

    /// Rolls past the voting delay, then casts For votes from the first `count` ministries.
    function _voteFor(uint256 proposalId, uint256 count) internal {
        vm.roll(block.number + VOTING_DELAY + 1);
        for (uint256 i = 0; i < count; i++) {
            vm.prank(ministries[i]);
            governor.castVote(proposalId, 1); // 1 = For
        }
    }

    function _queueAndExecute(address target, bytes memory data, string memory description) internal {
        (address[] memory t, uint256[] memory v, bytes[] memory c) = _single(target, data);
        bytes32 descriptionHash = keccak256(bytes(description));
        governor.queue(t, v, c, descriptionHash);
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        governor.execute(t, v, c, descriptionHash);
    }

    /// Full happy-path lifecycle: propose -> quorum votes For -> queue -> execute.
    function _govern(address target, bytes memory data, string memory description)
        internal
        returns (uint256 proposalId)
    {
        proposalId = _propose(ministries[0], target, data, description);
        _voteFor(proposalId, QUORUM);
        vm.roll(block.number + VOTING_PERIOD + 1);
        _queueAndExecute(target, data, description);
    }

    function _applyAsUniversity() internal {
        vm.prank(university);
        registry.submitApplication("University of Canterbury", "NZ", "ed25519", KEY);
    }

    function _accreditCall() internal view returns (bytes memory) {
        return abi.encodeCall(UniversityRegistry.accredit, (university));
    }

    function _assertState(uint256 proposalId, IGovernor.ProposalState expected) internal view {
        assertEq(uint8(governor.state(proposalId)), uint8(expected));
    }

    // ------------------------------------------------------------------
    // Deployment wiring
    // ------------------------------------------------------------------

    function test_Deployment_NoPrivilegedEOA_AndDaoOwnsEverything() public view {
        assertEq(membership.owner(), address(timelock));
        assertEq(registry.owner(), address(timelock));
        assertFalse(timelock.hasRole(timelock.DEFAULT_ADMIN_ROLE(), deployer));
        assertTrue(timelock.hasRole(timelock.PROPOSER_ROLE(), address(governor)));
        assertTrue(timelock.hasRole(timelock.EXECUTOR_ROLE(), address(0))); // open execution
        assertEq(membership.memberCount(), NUM_MINISTRIES);
        assertEq(governor.quorum(0), QUORUM);
        assertEq(governor.proposalThreshold(), 1);
    }

    // ------------------------------------------------------------------
    // The full lifecycle
    // ------------------------------------------------------------------

    function test_FullLifecycle_ApplyProposeVoteQueueExecute() public {
        _applyAsUniversity();
        assertFalse(registry.isAccredited(university));

        uint256 proposalId =
            _propose(ministries[0], address(registry), _accreditCall(), "Accredit University of Canterbury");

        _voteFor(proposalId, QUORUM);
        _assertState(proposalId, IGovernor.ProposalState.Active);
        (uint256 against, uint256 forVotes, uint256 abstain) = governor.proposalVotes(proposalId);
        assertEq(forVotes, QUORUM);
        assertEq(against + abstain, 0);

        vm.roll(block.number + VOTING_PERIOD + 1);
        _assertState(proposalId, IGovernor.ProposalState.Succeeded);

        (address[] memory t, uint256[] memory v, bytes[] memory c) =
            _single(address(registry), _accreditCall());
        bytes32 descriptionHash = keccak256(bytes("Accredit University of Canterbury"));
        governor.queue(t, v, c, descriptionHash);
        _assertState(proposalId, IGovernor.ProposalState.Queued);

        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        governor.execute(t, v, c, descriptionHash);
        _assertState(proposalId, IGovernor.ProposalState.Executed);

        assertTrue(registry.isAccredited(university));
        assertEq(registry.publicKeyOf(university), KEY);
    }

    function test_Proposal_Defeated_WhenBelowQuorum() public {
        _applyAsUniversity();
        uint256 proposalId = _propose(ministries[0], address(registry), _accreditCall(), "Accredit");

        _voteFor(proposalId, QUORUM - 1); // one vote short
        vm.roll(block.number + VOTING_PERIOD + 1);
        _assertState(proposalId, IGovernor.ProposalState.Defeated);

        (address[] memory t, uint256[] memory v, bytes[] memory c) =
            _single(address(registry), _accreditCall());
        vm.expectRevert(
            abi.encodeWithSelector(
                IGovernor.GovernorUnexpectedProposalState.selector,
                proposalId,
                IGovernor.ProposalState.Defeated,
                bytes32(uint256(1) << uint8(IGovernor.ProposalState.Succeeded))
            )
        );
        governor.queue(t, v, c, keccak256(bytes("Accredit")));
        assertFalse(registry.isAccredited(university));
    }

    // ------------------------------------------------------------------
    // Membership gates participation
    // ------------------------------------------------------------------

    function test_NonMember_CannotPropose() public {
        _applyAsUniversity();
        (address[] memory t, uint256[] memory v, bytes[] memory c) =
            _single(address(registry), _accreditCall());

        vm.prank(rando);
        vm.expectRevert(
            abi.encodeWithSelector(IGovernor.GovernorInsufficientProposerVotes.selector, rando, 0, 1)
        );
        governor.propose(t, v, c, "Accredit");
    }

    function test_NonMemberVote_CarriesZeroWeight() public {
        _applyAsUniversity();
        uint256 proposalId = _propose(ministries[0], address(registry), _accreditCall(), "Accredit");
        vm.roll(block.number + 1);

        vm.prank(rando);
        uint256 weight = governor.castVote(proposalId, 1);
        assertEq(weight, 0);

        // two real votes + the weightless one still miss quorum of 3
        vm.prank(ministries[0]);
        governor.castVote(proposalId, 1);
        vm.prank(ministries[1]);
        governor.castVote(proposalId, 1);
        (, uint256 forVotes,) = governor.proposalVotes(proposalId);
        assertEq(forVotes, 2);

        vm.roll(block.number + VOTING_PERIOD + 1);
        _assertState(proposalId, IGovernor.ProposalState.Defeated);
    }

    // ------------------------------------------------------------------
    // Nothing privileged is reachable without a passed proposal
    // ------------------------------------------------------------------

    function test_DirectAccredit_Reverts_ForEOA_Ministry_AndGovernor() public {
        _applyAsUniversity();

        address[3] memory callers = [rando, ministries[0], address(governor)];
        for (uint256 i = 0; i < callers.length; i++) {
            vm.prank(callers[i]);
            vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, callers[i]));
            registry.accredit(university);
        }
    }

    function test_DirectInviteMinistry_Reverts_ForEOA_AndMinistry() public {
        address[2] memory callers = [rando, ministries[0]];
        for (uint256 i = 0; i < callers.length; i++) {
            vm.prank(callers[i]);
            vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, callers[i]));
            membership.inviteMinistry(rando, "Backdoor Ministry");
        }
    }

    function test_SetQuorum_RevertsForEOA_SucceedsViaProposal() public {
        vm.prank(ministries[0]);
        vm.expectRevert(abi.encodeWithSelector(IGovernor.GovernorOnlyExecutor.selector, ministries[0]));
        governor.setQuorum(4);

        _govern(address(governor), abi.encodeCall(AccreditationGovernor.setQuorum, (4)), "Raise quorum to 4");
        assertEq(governor.quorum(0), 4);
    }

    // ------------------------------------------------------------------
    // Membership changes via governance
    // ------------------------------------------------------------------

    function test_InviteViaProposal_NewMinistryCanVoteOnNextProposal() public {
        address estonia = makeAddr("ministry-estonia");
        _govern(
            address(membership),
            abi.encodeCall(MinistryMembership.inviteMinistry, (estonia, "Estonian Ministry of Education")),
            "Invite Estonia"
        );

        assertEq(membership.memberCount(), NUM_MINISTRIES + 1);
        assertTrue(membership.isMember(estonia));
        assertEq(membership.getVotes(estonia), 1); // auto-delegated on mint

        // the new ministry participates fully in the *next* proposal
        vm.roll(block.number + 1); // its checkpoint must predate the next snapshot
        _applyAsUniversity();
        uint256 proposalId = _propose(estonia, address(registry), _accreditCall(), "Accredit");
        vm.roll(block.number + 1);
        vm.prank(estonia);
        uint256 weight = governor.castVote(proposalId, 1);
        assertEq(weight, 1);
    }

    function test_DisinviteViaProposal_ZeroesVotingPowerGoingForward() public {
        _govern(
            address(membership),
            abi.encodeCall(MinistryMembership.revokeMembership, (ministries[4])),
            "Disinvite ministry 4"
        );

        assertEq(membership.memberCount(), NUM_MINISTRIES - 1);
        assertFalse(membership.isMember(ministries[4]));
        assertEq(membership.getVotes(ministries[4]), 0);

        // on the next proposal, their vote carries zero weight
        vm.roll(block.number + 1);
        _applyAsUniversity();
        uint256 proposalId = _propose(ministries[0], address(registry), _accreditCall(), "Accredit");
        vm.roll(block.number + 1);
        vm.prank(ministries[4]);
        uint256 weight = governor.castVote(proposalId, 1);
        assertEq(weight, 0);
    }

    /// Voting power is snapshotted at vote start: a ministry invited after the
    /// snapshot cannot vote on that proposal, and one revoked mid-vote keeps its
    /// power for that proposal. Correct behaviour, asserted rather than "fixed".
    function test_SnapshotSemantics_InviteAndRevokeMidProposal() public {
        _applyAsUniversity();
        uint256 proposalId = _propose(ministries[0], address(registry), _accreditCall(), "Accredit");
        // snapshot == proposal block (votingDelay = 0)

        vm.roll(block.number + 1); // strictly after the snapshot
        address latecomer = makeAddr("ministry-latecomer");
        vm.startPrank(address(timelock)); // the owner acting directly, sans proposal, for brevity
        membership.inviteMinistry(latecomer, "Latecomer Ministry");
        membership.revokeMembership(ministries[4]);
        vm.stopPrank();

        vm.prank(latecomer);
        uint256 latecomerWeight = governor.castVote(proposalId, 1);
        assertEq(latecomerWeight, 0); // invited after snapshot: no say on this one

        vm.prank(ministries[4]);
        uint256 revokedWeight = governor.castVote(proposalId, 1);
        assertEq(revokedWeight, 1); // revoked after snapshot: keeps its say on this one
    }

    // ------------------------------------------------------------------
    // Resolution votes: one vote settles an application either way
    // ------------------------------------------------------------------

    /// Opens the resolution vote and returns what queue/execute need.
    function _openResolution(address proposer)
        internal
        returns (uint256 proposalId, bytes memory data, bytes32 descriptionHash)
    {
        data = abi.encodeCall(UniversityRegistry.resolveApplication, (university));
        descriptionHash = keccak256(
            bytes(
                string.concat(
                    "Resolve accreditation application of ",
                    Strings.toHexString(university),
                    " [block ",
                    Strings.toString(block.number),
                    "]"
                )
            )
        );
        vm.prank(proposer);
        proposalId = governor.proposeAccreditation(university);
    }

    function _executeResolution(bytes memory data, bytes32 descriptionHash) internal {
        (address[] memory t, uint256[] memory v, bytes[] memory c) = _single(address(registry), data);
        governor.queue(t, v, c, descriptionHash);
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        governor.execute(t, v, c, descriptionHash);
    }

    function test_Resolution_PassingVote_Accredits() public {
        _applyAsUniversity();
        (uint256 id, bytes memory data, bytes32 dh) = _openResolution(ministries[0]);
        assertTrue(governor.isResolutionProposal(id));
        assertEq(governor.accreditationProposalId(university), id);

        vm.roll(block.number + 1);
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(ministries[i]);
            governor.castVote(id, 1); // For = accredit
        }
        vm.prank(ministries[3]);
        governor.castVote(id, 0); // one dissenter changes nothing

        vm.roll(block.number + VOTING_PERIOD + 1);
        _assertState(id, IGovernor.ProposalState.Succeeded);
        _executeResolution(data, dh);

        assertTrue(registry.isAccredited(university));
        assertEq(registry.publicKeyOf(university), KEY);
    }

    function test_Resolution_MajorityAgainst_AutoRejects() public {
        _applyAsUniversity();
        (uint256 id, bytes memory data, bytes32 dh) = _openResolution(ministries[0]);

        vm.roll(block.number + 1);
        uint8[5] memory support = [1, 1, 0, 0, 2]; // 2 For, 2 Against, 1 Abstain: quorum met, no majority
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(ministries[i]);
            governor.castVote(id, support[i]);
        }

        vm.roll(block.number + VOTING_PERIOD + 1);
        _assertState(id, IGovernor.ProposalState.Succeeded); // resolutions never sit Defeated
        _executeResolution(data, dh);

        assertEq(
            uint8(registry.getUniversity(university).status), uint8(UniversityRegistry.Status.None)
        );
        assertFalse(registry.isAccredited(university));
    }

    /// The headline behaviour: a vote nobody (or too few) shows up for rejects
    /// the application automatically instead of stranding it Pending forever.
    function test_Resolution_QuorumUnmet_AutoRejects() public {
        _applyAsUniversity();
        (uint256 id, bytes memory data, bytes32 dh) = _openResolution(ministries[0]);

        vm.roll(block.number + 1);
        vm.prank(ministries[0]);
        governor.castVote(id, 1); // a single For is not quorum

        vm.roll(block.number + VOTING_PERIOD + 1);
        _assertState(id, IGovernor.ProposalState.Succeeded); // still executable
        _executeResolution(data, dh);

        assertEq(
            uint8(registry.getUniversity(university).status), uint8(UniversityRegistry.Status.None)
        );
    }

    function test_Resolution_RejectedCanReapply_AndWinTheSecondVote() public {
        test_Resolution_QuorumUnmet_AutoRejects();

        _applyAsUniversity(); // Status.None allows re-application
        vm.roll(block.number + 1);
        (uint256 id2, bytes memory data2, bytes32 dh2) = _openResolution(ministries[1]);

        vm.roll(block.number + 1);
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(ministries[i]);
            governor.castVote(id2, 1);
        }
        vm.roll(block.number + VOTING_PERIOD + 1);
        _executeResolution(data2, dh2);

        assertTrue(registry.isAccredited(university));
    }

    function test_Resolution_SecondOpenWhileInFlight_Reverts() public {
        _applyAsUniversity();
        _openResolution(ministries[0]);

        vm.roll(block.number + 1);
        vm.prank(ministries[1]);
        vm.expectRevert("Governor: resolution already in flight");
        governor.proposeAccreditation(university);
    }

    function test_Resolution_NonMemberCannotOpen() public {
        _applyAsUniversity();
        vm.prank(rando);
        vm.expectRevert(
            abi.encodeWithSelector(IGovernor.GovernorInsufficientProposerVotes.selector, rando, 0, 1)
        );
        governor.proposeAccreditation(university);
    }

    function test_Resolution_DirectResolveReverts() public {
        _applyAsUniversity();
        vm.prank(ministries[0]);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, ministries[0])
        );
        registry.resolveApplication(university);
    }

    // ------------------------------------------------------------------
    // Key rotation is inert until the DAO approves it
    // ------------------------------------------------------------------

    function test_KeyRotation_LiveKeyUnchangedUntilApprovalExecutes() public {
        _applyAsUniversity();
        _govern(address(registry), _accreditCall(), "Accredit University of Canterbury");
        assertEq(registry.publicKeyOf(university), KEY);

        vm.prank(university);
        registry.requestKeyRotation("ed25519", NEW_KEY);
        assertEq(registry.publicKeyOf(university), KEY); // a university cannot change its own live key

        _govern(
            address(registry),
            abi.encodeCall(UniversityRegistry.approveKeyRotation, (university)),
            "Approve key rotation for University of Canterbury"
        );
        assertEq(registry.publicKeyOf(university), NEW_KEY); // only the vote made it authoritative
    }
}
