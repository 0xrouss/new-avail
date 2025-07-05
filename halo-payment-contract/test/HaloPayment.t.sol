// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console} from "forge-std/Test.sol";
import {HaloPayment} from "../src/HaloPayment.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock USDC contract for testing
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract HaloPaymentTest is Test {
    HaloPayment public haloPayment;
    MockUSDC public usdc;
    
    address public user = address(0x1);
    address public merchant = address(0x2);
    uint256 public haloPrivateKey = 0x123;
    address public haloAddress = vm.addr(haloPrivateKey);
    
    function setUp() public {
        // Deploy mock USDC
        usdc = new MockUSDC();
        
        // Deploy HaloPayment contract
        haloPayment = new HaloPayment(address(usdc));
        
        // Set up test accounts
        vm.label(user, "User");
        vm.label(merchant, "Merchant");
        vm.label(haloAddress, "HaloAddress");
        
        // Mint USDC to user
        usdc.mint(user, 1000 * 10**6); // 1000 USDC
        
        // User approves contract to spend USDC
        vm.prank(user);
        usdc.approve(address(haloPayment), type(uint256).max);
    }

    function test_RegisterHaloAddress() public {
        vm.prank(user);
        haloPayment.registerHaloAddress(haloAddress);
        
        assertEq(haloPayment.getAuthorizedHaloAddress(user), haloAddress);
        assertEq(haloPayment.getPayerFromHaloAddress(haloAddress), user);
    }

    function test_RegisterHaloAddress_RevertZeroAddress() public {
        vm.prank(user);
        vm.expectRevert(HaloPayment.ZeroAddress.selector);
        haloPayment.registerHaloAddress(address(0));
    }

    function test_RevokeHaloAddress() public {
        // First register
        vm.prank(user);
        haloPayment.registerHaloAddress(haloAddress);
        
        // Then revoke
        vm.prank(user);
        haloPayment.revokeHaloAddress();
        
        assertEq(haloPayment.getAuthorizedHaloAddress(user), address(0));
        assertEq(haloPayment.getPayerFromHaloAddress(haloAddress), address(0));
    }

    function test_RevokeHaloAddress_RevertNotAuthorized() public {
        vm.prank(user);
        vm.expectRevert(HaloPayment.HaloAddressNotAuthorized.selector);
        haloPayment.revokeHaloAddress();
    }

    function test_ExecutePayment() public {
        // Register HaLo address
        vm.prank(user);
        haloPayment.registerHaloAddress(haloAddress);
        
        uint256 amount = 10 * 10**6; // 10 USDC
        uint256 nonce = 1;
        
        // Create signature
        bytes32 messageHash = haloPayment.getPaymentMessageHash(user, merchant, amount, nonce);
        bytes32 ethSignedMessageHash = haloPayment.getEthSignedMessageHash(user, merchant, amount, nonce);
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(haloPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        
        // Record balances before
        uint256 userBalanceBefore = usdc.balanceOf(user);
        uint256 merchantBalanceBefore = usdc.balanceOf(merchant);
        
        // Execute payment
        vm.prank(merchant);
        haloPayment.executePayment(user, merchant, amount, nonce, signature);
        
        // Check balances after
        assertEq(usdc.balanceOf(user), userBalanceBefore - amount);
        assertEq(usdc.balanceOf(merchant), merchantBalanceBefore + amount);
        
        // Check nonce is used
        assertTrue(haloPayment.isNonceUsed(user, nonce));
    }

    function test_ExecutePayment_RevertInvalidSignature() public {
        // Register HaLo address
        vm.prank(user);
        haloPayment.registerHaloAddress(haloAddress);
        
        uint256 amount = 10 * 10**6;
        uint256 nonce = 1;
        
        // Create signature with wrong private key
        bytes32 ethSignedMessageHash = haloPayment.getEthSignedMessageHash(user, merchant, amount, nonce);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0x456, ethSignedMessageHash); // Wrong key
        bytes memory signature = abi.encodePacked(r, s, v);
        
        vm.prank(merchant);
        vm.expectRevert(HaloPayment.InvalidSignature.selector);
        haloPayment.executePayment(user, merchant, amount, nonce, signature);
    }

    function test_ExecutePayment_RevertNonceAlreadyUsed() public {
        // Register HaLo address
        vm.prank(user);
        haloPayment.registerHaloAddress(haloAddress);
        
        uint256 amount = 10 * 10**6;
        uint256 nonce = 1;
        
        // Create signature
        bytes32 ethSignedMessageHash = haloPayment.getEthSignedMessageHash(user, merchant, amount, nonce);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(haloPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        
        // Execute payment first time
        vm.prank(merchant);
        haloPayment.executePayment(user, merchant, amount, nonce, signature);
        
        // Try to execute again with same nonce
        vm.prank(merchant);
        vm.expectRevert(HaloPayment.NonceAlreadyUsed.selector);
        haloPayment.executePayment(user, merchant, amount, nonce, signature);
    }

    function test_ExecutePayment_RevertHaloAddressNotAuthorized() public {
        uint256 amount = 10 * 10**6;
        uint256 nonce = 1;
        
        // Create signature without registering HaLo address
        bytes32 ethSignedMessageHash = haloPayment.getEthSignedMessageHash(user, merchant, amount, nonce);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(haloPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        
        vm.prank(merchant);
        vm.expectRevert(HaloPayment.HaloAddressNotAuthorized.selector);
        haloPayment.executePayment(user, merchant, amount, nonce, signature);
    }

    function test_ExecutePayment_RevertInsufficientAllowance() public {
        // Register HaLo address
        vm.prank(user);
        haloPayment.registerHaloAddress(haloAddress);
        
        // Remove allowance
        vm.prank(user);
        usdc.approve(address(haloPayment), 0);
        
        uint256 amount = 10 * 10**6;
        uint256 nonce = 1;
        
        // Create signature
        bytes32 ethSignedMessageHash = haloPayment.getEthSignedMessageHash(user, merchant, amount, nonce);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(haloPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        
        vm.prank(merchant);
        vm.expectRevert(HaloPayment.InsufficientAllowance.selector);
        haloPayment.executePayment(user, merchant, amount, nonce, signature);
    }

    function test_ExecutePayment_RevertZeroAmount() public {
        // Register HaLo address
        vm.prank(user);
        haloPayment.registerHaloAddress(haloAddress);
        
        uint256 amount = 0;
        uint256 nonce = 1;
        
        // Create signature
        bytes32 ethSignedMessageHash = haloPayment.getEthSignedMessageHash(user, merchant, amount, nonce);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(haloPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        
        vm.prank(merchant);
        vm.expectRevert(HaloPayment.InvalidAmount.selector);
        haloPayment.executePayment(user, merchant, amount, nonce, signature);
    }

    function test_ExecutePayment_RevertZeroAddresses() public {
        // Register HaLo address
        vm.prank(user);
        haloPayment.registerHaloAddress(haloAddress);
        
        uint256 amount = 10 * 10**6;
        uint256 nonce = 1;
        
        // Create signature
        bytes32 ethSignedMessageHash = haloPayment.getEthSignedMessageHash(user, merchant, amount, nonce);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(haloPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        
        // Test zero payer
        vm.prank(merchant);
        vm.expectRevert(HaloPayment.ZeroAddress.selector);
        haloPayment.executePayment(address(0), merchant, amount, nonce, signature);
        
        // Test zero merchant
        vm.prank(merchant);
        vm.expectRevert(HaloPayment.ZeroAddress.selector);
        haloPayment.executePayment(user, address(0), amount, nonce, signature);
    }

    function test_GetPaymentMessageHash() public {
        uint256 amount = 10 * 10**6;
        uint256 nonce = 1;
        
        bytes32 expectedHash = keccak256(
            abi.encodePacked(
                "HaloPayment:",
                user,
                merchant,
                amount,
                nonce,
                block.chainid,
                address(haloPayment)
            )
        );
        
        bytes32 actualHash = haloPayment.getPaymentMessageHash(user, merchant, amount, nonce);
        assertEq(actualHash, expectedHash);
    }

    function test_RegisterHaloAddress_RevertAlreadyRegistered() public {
        address user2 = address(0x4);
        
        // User 1 registers HaLo address
        vm.prank(user);
        haloPayment.registerHaloAddress(haloAddress);
        
        // User 2 tries to register the same HaLo address
        vm.prank(user2);
        vm.expectRevert(HaloPayment.HaloAddressAlreadyRegistered.selector);
        haloPayment.registerHaloAddress(haloAddress);
    }

    function test_ExecutePaymentFromHalo() public {
        // Register HaLo address
        vm.prank(user);
        haloPayment.registerHaloAddress(haloAddress);
        
        uint256 amount = 10 * 10**6; // 10 USDC
        uint256 nonce = 1;
        
        // Create signature
        bytes32 ethSignedMessageHash = haloPayment.getEthSignedMessageHash(user, merchant, amount, nonce);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(haloPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        
        // Record balances before
        uint256 userBalanceBefore = usdc.balanceOf(user);
        uint256 merchantBalanceBefore = usdc.balanceOf(merchant);
        
        // Execute payment using HaLo address (convenience function)
        vm.prank(merchant);
        haloPayment.executePaymentFromHalo(haloAddress, merchant, amount, nonce, signature);
        
        // Check balances after
        assertEq(usdc.balanceOf(user), userBalanceBefore - amount);
        assertEq(usdc.balanceOf(merchant), merchantBalanceBefore + amount);
        
        // Check nonce is used
        assertTrue(haloPayment.isNonceUsed(user, nonce));
    }

    function test_ExecutePaymentFromHalo_RevertUnregisteredHalo() public {
        uint256 amount = 10 * 10**6;
        uint256 nonce = 1;
        
        // Create signature without registering HaLo address
        bytes32 ethSignedMessageHash = haloPayment.getEthSignedMessageHash(user, merchant, amount, nonce);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(haloPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        
        vm.prank(merchant);
        vm.expectRevert(HaloPayment.HaloAddressNotAuthorized.selector);
        haloPayment.executePaymentFromHalo(haloAddress, merchant, amount, nonce, signature);
    }

    function test_GetPayerFromHaloAddress() public {
        // Before registration
        assertEq(haloPayment.getPayerFromHaloAddress(haloAddress), address(0));
        
        // After registration
        vm.prank(user);
        haloPayment.registerHaloAddress(haloAddress);
        assertEq(haloPayment.getPayerFromHaloAddress(haloAddress), user);
        
        // After revocation
        vm.prank(user);
        haloPayment.revokeHaloAddress();
        assertEq(haloPayment.getPayerFromHaloAddress(haloAddress), address(0));
    }

    function test_Events() public {
        // Test HaloAddressRegistered event
        vm.expectEmit(true, true, false, false);
        emit HaloPayment.HaloAddressRegistered(user, haloAddress);
        
        vm.prank(user);
        haloPayment.registerHaloAddress(haloAddress);
        
        // Test HaloAddressRevoked event
        vm.expectEmit(true, true, false, false);
        emit HaloPayment.HaloAddressRevoked(user, haloAddress);
        
        vm.prank(user);
        haloPayment.revokeHaloAddress();
        
        // Test PaymentExecuted event
        vm.prank(user);
        haloPayment.registerHaloAddress(haloAddress);
        
        uint256 amount = 10 * 10**6;
        uint256 nonce = 1;
        
        bytes32 ethSignedMessageHash = haloPayment.getEthSignedMessageHash(user, merchant, amount, nonce);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(haloPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        
        vm.expectEmit(true, true, true, true);
        emit HaloPayment.PaymentExecuted(user, merchant, amount, nonce, haloAddress);
        
        vm.prank(merchant);
        haloPayment.executePayment(user, merchant, amount, nonce, signature);
    }
} 