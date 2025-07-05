// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {HaloPayment} from "../src/HaloPayment.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() public {
        // Get the USDC address from environment variable or use default
        address usdcAddress = vm.envOr("USDC_ADDRESS", address(0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238)); // Sepolia USDC
        
        console.log("Deploying HaloPayment contract...");
        console.log("USDC Address:", usdcAddress);
        
        vm.startBroadcast();
        
        HaloPayment haloPayment = new HaloPayment(usdcAddress);
        
        vm.stopBroadcast();
        
        console.log("HaloPayment deployed at:", address(haloPayment));
        console.log("Owner:", haloPayment.owner());
        console.log("USDC:", address(haloPayment.usdc()));
    }
} 