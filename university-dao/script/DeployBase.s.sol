// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {MinistryMembership} from "../src/MinistryMembership.sol";
import {UniversityRegistry} from "../src/UniversityRegistry.sol";
import {AccreditationGovernor} from "../src/AccreditationGovernor.sol";

/// @notice Shared deployment logic for Deploy.s.sol and DemoFlow.s.sol.
abstract contract DeployBase is Script {
    struct Profile {
        string name;
        uint48 votingDelay; // blocks
        uint32 votingPeriod; // blocks
        uint256 timelockDelay; // seconds
        uint256 quorum; // absolute number of ministries
    }

    struct Deployment {
        TimelockController timelock;
        MinistryMembership membership;
        UniversityRegistry registry;
        AccreditationGovernor governor;
    }

    /// @dev Selected via PROFILE env var; defaults to "demo" (see spec section 9).
    function _profile() internal view returns (Profile memory) {
        string memory name = vm.envOr("PROFILE", string("demo"));
        if (keccak256(bytes(name)) == keccak256("realistic")) {
            return Profile({
                name: "realistic",
                votingDelay: 7200, // ~1 day of blocks
                votingPeriod: 50400, // ~1 week of blocks
                timelockDelay: 172800, // 2 days
                quorum: 3
            });
        }
        require(keccak256(bytes(name)) == keccak256("demo"), "PROFILE must be 'demo' or 'realistic'");
        return Profile({
            name: "demo",
            votingDelay: 0,
            votingPeriod: 50, // ~10 min on a 12s chain
            timelockDelay: 60,
            quorum: 3
        });
    }

    /// @dev Founding ministries: anvil accounts 1-5 by default, overridable via
    ///      comma-separated FOUNDING_MINISTRIES / FOUNDING_MINISTRY_NAMES env vars.
    function _founders() internal view returns (address[] memory addrs, string[] memory names) {
        address[] memory defaultAddrs = new address[](5);
        defaultAddrs[0] = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8; // anvil #1
        defaultAddrs[1] = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC; // anvil #2
        defaultAddrs[2] = 0x90F79bf6EB2c4f870365E785982E1f101E93b906; // anvil #3
        defaultAddrs[3] = 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65; // anvil #4
        defaultAddrs[4] = 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc; // anvil #5

        string[] memory defaultNames = new string[](5);
        defaultNames[0] = "New Zealand Ministry of Education";
        defaultNames[1] = "German Federal Ministry of Education";
        defaultNames[2] = "Japanese Ministry of Education";
        defaultNames[3] = "Brazilian Ministry of Education";
        defaultNames[4] = "Kenyan Ministry of Education";

        addrs = vm.envOr("FOUNDING_MINISTRIES", ",", defaultAddrs);
        names = vm.envOr("FOUNDING_MINISTRY_NAMES", ",", defaultNames);
        require(addrs.length > 0, "need at least one founding ministry");
        require(addrs.length == names.length, "FOUNDING_MINISTRIES/NAMES length mismatch");
    }

    /// @dev Deploys and wires the full stack. Must run with `deployer` as the
    ///      active sender (broadcast or prank). Order matters — see spec section 5.
    function _deployStack(
        address deployer,
        Profile memory p,
        address[] memory founders,
        string[] memory founderNames
    ) internal returns (Deployment memory d) {
        // 1. Timelock: no proposers/executors yet, deployer as temporary admin.
        d.timelock = new TimelockController(p.timelockDelay, new address[](0), new address[](0), deployer);

        // 2. Membership token. The deployer owns it during bootstrap only: the DAO
        //    cannot invite its first members because there is nobody to vote yet.
        //    Ownership moves to the timelock right after seeding (step 8).
        d.membership = new MinistryMembership(deployer);

        // 3+4. Registry and governor reference each other (the registry reads
        //      finished vote tallies to resolve applications), so the governor's
        //      address is precomputed from the deployer's next-but-one nonce.
        address governorAddr = vm.computeCreateAddress(deployer, vm.getNonce(deployer) + 1);
        d.registry = new UniversityRegistry(address(d.timelock), governorAddr);
        d.governor = new AccreditationGovernor(
            IVotes(address(d.membership)),
            d.timelock,
            p.votingDelay,
            p.votingPeriod,
            p.quorum,
            address(d.registry)
        );
        require(address(d.governor) == governorAddr, "governor address precompute drift");

        // 5-7. Only the governor proposes/cancels; anyone may execute a matured operation.
        d.timelock.grantRole(d.timelock.PROPOSER_ROLE(), address(d.governor));
        d.timelock.grantRole(d.timelock.CANCELLER_ROLE(), address(d.governor));
        d.timelock.grantRole(d.timelock.EXECUTOR_ROLE(), address(0));

        // 8. Bootstrap the founding ministries, then hand the token to the DAO.
        for (uint256 i = 0; i < founders.length; i++) {
            d.membership.inviteMinistry(founders[i], founderNames[i]);
        }
        d.membership.transferOwnership(address(d.timelock));

        // 9. Deployer renounces timelock admin — no privileged EOA remains.
        d.timelock.renounceRole(d.timelock.DEFAULT_ADMIN_ROLE(), deployer);
    }

    /// @dev Post-deploy invariant: every privileged handle belongs to the DAO.
    function _assertNoPrivilegedEOA(Deployment memory d, address deployer) internal view {
        require(d.membership.owner() == address(d.timelock), "membership not timelock-owned");
        require(d.registry.owner() == address(d.timelock), "registry not timelock-owned");
        require(
            !d.timelock.hasRole(d.timelock.DEFAULT_ADMIN_ROLE(), deployer), "deployer still timelock admin"
        );
        require(d.timelock.hasRole(d.timelock.PROPOSER_ROLE(), address(d.governor)), "governor not proposer");
        require(d.timelock.hasRole(d.timelock.EXECUTOR_ROLE(), address(0)), "executor role not open");
    }
}
