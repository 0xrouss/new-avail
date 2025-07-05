// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HaloPayment
 * @dev Contract for handling meta-transactions with HaLo chip authorization
 * 
 * Flow:
 * 1. User approves this contract to spend their USDC
 * 2. User registers their HaLo address as authorized signer
 * 3. Merchant scans HaLo chip to get signature
 * 4. Merchant calls executePayment with signature to claim USDC
 */
contract HaloPayment is ReentrancyGuard, Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // USDC contract address (will be set in constructor)
    IERC20 public immutable usdc;

    // Mapping from user address to their authorized HaLo address
    mapping(address => address) public authorizedHaloAddresses;

    // Mapping from HaLo address to user address (reverse lookup)
    mapping(address => address) public haloToUserAddress;

    // Mapping to track used nonces to prevent replay attacks
    mapping(address => mapping(uint256 => bool)) public usedNonces;

    // Events
    event HaloAddressRegistered(address indexed user, address indexed haloAddress);
    event HaloAddressRevoked(address indexed user, address indexed haloAddress);
    event PaymentExecuted(
        address indexed payer,
        address indexed merchant,
        uint256 amount,
        uint256 nonce,
        address indexed haloAddress
    );

    // Custom errors
    error InvalidSignature();
    error NonceAlreadyUsed();
    error HaloAddressNotAuthorized();
    error HaloAddressAlreadyRegistered();
    error InsufficientAllowance();
    error TransferFailed();
    error InvalidAmount();
    error ZeroAddress();

    /**
     * @dev Constructor
     * @param _usdc Address of the USDC token contract
     */
    constructor(address _usdc) Ownable(msg.sender) {
        if (_usdc == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
    }

    /**
     * @dev Register a HaLo address as authorized to sign payments
     * @param haloAddress The HaLo address to authorize
     */
    function registerHaloAddress(address haloAddress) external {
        if (haloAddress == address(0)) revert ZeroAddress();
        
        // Check if this HaLo address is already registered to another user
        if (haloToUserAddress[haloAddress] != address(0) && haloToUserAddress[haloAddress] != msg.sender) {
            revert HaloAddressAlreadyRegistered();
        }
        
        // Remove old mapping if user had a different HaLo address
        address oldHaloAddress = authorizedHaloAddresses[msg.sender];
        if (oldHaloAddress != address(0)) {
            delete haloToUserAddress[oldHaloAddress];
        }
        
        // Set new mappings
        authorizedHaloAddresses[msg.sender] = haloAddress;
        haloToUserAddress[haloAddress] = msg.sender;
        
        emit HaloAddressRegistered(msg.sender, haloAddress);
    }

    /**
     * @dev Revoke authorization for a HaLo address
     */
    function revokeHaloAddress() external {
        address haloAddress = authorizedHaloAddresses[msg.sender];
        if (haloAddress == address(0)) revert HaloAddressNotAuthorized();
        
        // Clean up both mappings
        delete authorizedHaloAddresses[msg.sender];
        delete haloToUserAddress[haloAddress];
        
        emit HaloAddressRevoked(msg.sender, haloAddress);
    }

    /**
     * @dev Execute a payment using HaLo signature
     * @param payer Address of the user paying
     * @param merchant Address of the merchant receiving payment
     * @param amount Amount of USDC to transfer
     * @param nonce Unique nonce to prevent replay attacks
     * @param signature Signature from the HaLo chip
     */
    function executePayment(
        address payer,
        address merchant,
        uint256 amount,
        uint256 nonce,
        bytes calldata signature
    ) external nonReentrant {
        // Check for zero addresses first
        if (payer == address(0) || merchant == address(0)) revert ZeroAddress();
        
        // Get the authorized HaLo address for this payer
        address authorizedHalo = authorizedHaloAddresses[payer];
        if (authorizedHalo == address(0)) revert HaloAddressNotAuthorized();
        
        // Execute the payment using the internal function
        _executePaymentInternal(payer, merchant, amount, nonce, signature, authorizedHalo);
    }

    /**
     * @dev Get the message hash for a payment (for signature generation)
     * @param payer Address of the user paying
     * @param merchant Address of the merchant receiving payment
     * @param amount Amount of USDC to transfer
     * @param nonce Unique nonce to prevent replay attacks
     * @return The message hash that should be signed
     */
    function getPaymentMessageHash(
        address payer,
        address merchant,
        uint256 amount,
        uint256 nonce
    ) external view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                "HaloPayment:",
                payer,
                merchant,
                amount,
                nonce,
                block.chainid,
                address(this)
            )
        );
    }

    /**
     * @dev Get the Ethereum signed message hash for a payment
     * @param payer Address of the user paying
     * @param merchant Address of the merchant receiving payment
     * @param amount Amount of USDC to transfer
     * @param nonce Unique nonce to prevent replay attacks
     * @return The Ethereum signed message hash
     */
    function getEthSignedMessageHash(
        address payer,
        address merchant,
        uint256 amount,
        uint256 nonce
    ) external view returns (bytes32) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "HaloPayment:",
                payer,
                merchant,
                amount,
                nonce,
                block.chainid,
                address(this)
            )
        );
        return messageHash.toEthSignedMessageHash();
    }

    /**
     * @dev Check if a nonce has been used
     * @param payer Address of the payer
     * @param nonce Nonce to check
     * @return Whether the nonce has been used
     */
    function isNonceUsed(address payer, uint256 nonce) external view returns (bool) {
        return usedNonces[payer][nonce];
    }

    /**
     * @dev Get the authorized HaLo address for a user
     * @param user Address of the user
     * @return The authorized HaLo address
     */
    function getAuthorizedHaloAddress(address user) external view returns (address) {
        return authorizedHaloAddresses[user];
    }

    /**
     * @dev Get the payer address from a HaLo address
     * @param haloAddress Address of the HaLo chip
     * @return The payer address that registered this HaLo address
     */
    function getPayerFromHaloAddress(address haloAddress) external view returns (address) {
        return haloToUserAddress[haloAddress];
    }

    /**
     * @dev Execute a payment using HaLo address (convenience function)
     * @param haloAddress Address of the HaLo chip that signed the payment
     * @param merchant Address of the merchant receiving payment
     * @param amount Amount of USDC to transfer
     * @param nonce Unique nonce to prevent replay attacks
     * @param signature Signature from the HaLo chip
     */
    function executePaymentFromHalo(
        address haloAddress,
        address merchant,
        uint256 amount,
        uint256 nonce,
        bytes calldata signature
    ) external nonReentrant {
        // Look up the payer address from the HaLo address
        address payer = haloToUserAddress[haloAddress];
        if (payer == address(0)) revert HaloAddressNotAuthorized();
        
        // Execute the payment using the main function
        _executePaymentInternal(payer, merchant, amount, nonce, signature, haloAddress);
    }

    /**
     * @dev Internal function to execute payment (shared logic)
     */
    function _executePaymentInternal(
        address payer,
        address merchant,
        uint256 amount,
        uint256 nonce,
        bytes calldata signature,
        address expectedHaloAddress
    ) internal {
        if (payer == address(0) || merchant == address(0)) revert ZeroAddress();
        if (amount == 0) revert InvalidAmount();
        if (usedNonces[payer][nonce]) revert NonceAlreadyUsed();

        // Get the authorized HaLo address for this payer
        address authorizedHalo = authorizedHaloAddresses[payer];
        if (authorizedHalo == address(0)) revert HaloAddressNotAuthorized();
        if (authorizedHalo != expectedHaloAddress) revert InvalidSignature();

        // Create the message hash
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "HaloPayment:",
                payer,
                merchant,
                amount,
                nonce,
                block.chainid,
                address(this)
            )
        );

        // Convert to Ethereum signed message hash
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();

        // Recover signer from signature
        address signer = ethSignedMessageHash.recover(signature);
        if (signer != authorizedHalo) revert InvalidSignature();

        // Mark nonce as used
        usedNonces[payer][nonce] = true;

        // Check allowance
        uint256 allowance = usdc.allowance(payer, address(this));
        if (allowance < amount) revert InsufficientAllowance();

        // Execute the transfer
        bool success = usdc.transferFrom(payer, merchant, amount);
        if (!success) revert TransferFailed();

        emit PaymentExecuted(payer, merchant, amount, nonce, authorizedHalo);
    }
} 