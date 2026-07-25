// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {console2} from "forge-std/console2.sol";
import {DeployBase} from "./DeployBase.s.sol";

/// @notice Deploys the full stack, seeds the founding ministries, hands every
///         privileged handle to the DAO, and writes deployments/<chainid>.json.
///
///         forge script script/Deploy.s.sol --rpc-url $RPC --broadcast
///
///         PRIVATE_KEY defaults to anvil account #0 so a local deploy needs no setup.
contract Deploy is DeployBase {
    uint256 internal constant ANVIL_KEY_0 =
        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

    function run() external {
        Profile memory p = _profile();
        (address[] memory founders, string[] memory founderNames) = _founders();

        uint256 deployerKey = vm.envOr("PRIVATE_KEY", ANVIL_KEY_0);
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);
        Deployment memory d = _deployStack(deployer, p, founders, founderNames);
        vm.stopBroadcast();

        _assertNoPrivilegedEOA(d, deployer);

        console2.log("=== University Accreditation DAO deployed ===");
        console2.log("profile:            %s", p.name);
        console2.log("chain id:           %s", block.chainid);
        console2.log("TimelockController: %s", address(d.timelock));
        console2.log("MinistryMembership: %s", address(d.membership));
        console2.log("UniversityRegistry: %s", address(d.registry));
        console2.log("AccreditationGovernor: %s", address(d.governor));
        console2.log("founding ministries:");
        for (uint256 i = 0; i < founders.length; i++) {
            console2.log("  %s  %s", founders[i], founderNames[i]);
        }
        console2.log("deployer %s holds no roles; the DAO owns everything.", deployer);

        _writeDeploymentJson(d, p);
    }

    function _writeDeploymentJson(Deployment memory d, Profile memory p) internal {
        vm.createDir("deployments", true);
        string memory obj = "deployment";
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeString(obj, "profile", p.name);
        vm.serializeAddress(obj, "timelock", address(d.timelock));
        vm.serializeAddress(obj, "membership", address(d.membership));
        vm.serializeAddress(obj, "registry", address(d.registry));
        string memory json = vm.serializeAddress(obj, "governor", address(d.governor));

        string memory path = string.concat("deployments/", vm.toString(block.chainid), ".json");
        vm.writeJson(json, path);
        console2.log("addresses written to %s", path);
    }
}
