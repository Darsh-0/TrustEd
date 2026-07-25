// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {console2} from "forge-std/console2.sol";
import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";
import {DeployBase} from "./DeployBase.s.sol";
import {UniversityRegistry} from "../src/UniversityRegistry.sol";

/// @notice The pitch demo, scripted end-to-end. Runs the whole accreditation
///         narrative in one self-contained command — no node, no keys, no waiting:
///
///         forge script script/DemoFlow.s.sol
///
///         Deploy -> university applies -> ministry proposes -> three ministries
///         vote yes -> queue -> timelock matures -> execute -> registry answers.
contract DemoFlow is DeployBase {
    // RFC 8032 ed25519 test-vector public key — stands in for a real university key.
    bytes internal constant CANTERBURY_KEY =
        hex"d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a";

    function run() external {
        Profile memory p = _profile();
        (address[] memory founders, string[] memory founderNames) = _founders();

        // --- Act 0: deploy and hand everything to the DAO -------------------
        address deployer = makeAddr("deployer");
        vm.startPrank(deployer);
        Deployment memory d = _deployStack(deployer, p, founders, founderNames);
        vm.stopPrank();
        _assertNoPrivilegedEOA(d, deployer);

        console2.log("=== University Accreditation DAO demo flow (%s profile) ===", p.name);
        console2.log("[0] Deployed. %s founding ministries seeded; no privileged EOA remains.", d.membership.memberCount());

        // Founders' voting checkpoints must be strictly in the past before proposing.
        vm.roll(block.number + 1);

        // --- Act 1: the university applies, from its own address ------------
        address university = makeAddr("university-of-canterbury");
        vm.prank(university);
        d.registry.submitApplication("University of Canterbury", "NZ", "ed25519", CANTERBURY_KEY);
        console2.log("[1] University of Canterbury (%s) submitted its own ed25519 key. Status: Pending.", university);

        // --- Act 2: a ministry proposes accreditation ------------------------
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        targets[0] = address(d.registry);
        values[0] = 0;
        calldatas[0] = abi.encodeCall(UniversityRegistry.accredit, (university));
        string memory description = "Accredit University of Canterbury";

        vm.prank(founders[0]);
        uint256 proposalId = d.governor.propose(targets, values, calldatas, description);
        console2.log("[2] %s proposed: '%s'", founderNames[0], description);

        // --- Act 3: quorum of ministries votes For ---------------------------
        vm.roll(block.number + p.votingDelay + 1); // voting delay elapses
        for (uint256 i = 0; i < p.quorum; i++) {
            vm.prank(founders[i]);
            d.governor.castVote(proposalId, 1); // 1 = For
            console2.log("[3] %s voted FOR (weight 1: one ministry, one vote).", founderNames[i]);
        }

        // --- Act 4: voting period ends; the proposal succeeds ----------------
        vm.roll(block.number + p.votingPeriod + 1);
        require(d.governor.state(proposalId) == IGovernor.ProposalState.Succeeded, "demo: proposal did not succeed");
        console2.log("[4] Voting period over: %s For / quorum %s. Proposal Succeeded.", p.quorum, d.governor.quorum(0));

        // --- Act 5: queue into the timelock, mature, execute ------------------
        bytes32 descriptionHash = keccak256(bytes(description));
        d.governor.queue(targets, values, calldatas, descriptionHash);
        console2.log("[5] Queued in timelock; %s second delay...", p.timelockDelay);

        vm.warp(block.timestamp + p.timelockDelay + 1);
        d.governor.execute(targets, values, calldatas, descriptionHash);
        console2.log("[5] Executed through the timelock.");

        // --- Act 6: anyone can now verify, for free ---------------------------
        require(d.registry.isAccredited(university), "demo: university not accredited");
        UniversityRegistry.University memory u = d.registry.getUniversity(university);
        console2.log("[6] isAccredited(university) == true");
        console2.log("    name:    %s", u.name);
        console2.log("    country: %s", u.country);
        console2.log("    keyType: %s", u.keyType);
        console2.log("    publicKey:");
        console2.logBytes(d.registry.publicKeyOf(university));
        console2.log("Any diploma verifier can read this with a free eth_call. No wallet, no gas, no permission.");
    }
}
