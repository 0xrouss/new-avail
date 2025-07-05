# HaLo Payment Contract

A smart contract system for handling meta-transactions with HaLo chip authorization for USDC payments.

## Overview

This project implements a payment system where:

1. **Users** approve the contract to spend their USDC and register their HaLo addresses
2. **Merchants** scan HaLo chips to get payment authorizations
3. **Merchants** execute payments using their own wallets (paying gas fees)

## Contract Architecture

### HaloPayment.sol

The main contract that handles:

- **User Registration**: Users register their HaLo addresses as authorized signers
- **Meta-Transaction Execution**: Merchants execute payments with HaLo signatures
- **Security**: Nonce-based replay protection and signature verification

## Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Customer      │    │   HaLo Chip     │    │   Merchant      │
│   (Privy)       │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. Approve contract   │                       │
         │    for USDC           │                       │
         │◄──────────────────────┤                       │
         │                       │                       │
         │ 2. Register HaLo      │                       │
         │    address            │                       │
         │◄──────────────────────┤                       │
         │                       │                       │
         │                       │ 3. Scan & Sign       │
         │                       │    payment request    │
         │                       │◄──────────────────────┤
         │                       │                       │
         │                       │ 4. Submit signature   │
         │                       │──────────────────────►│
         │                       │                       │
         │ 5. Execute payment    │                       │
         │    (transferFrom)     │                       │
         │◄──────────────────────┼───────────────────────┤
         │                       │                       │
```

## Key Features

### 🔐 Security Features

- **Signature Verification**: Only authorized HaLo addresses can authorize payments
- **Nonce Protection**: Prevents replay attacks
- **Chain-specific**: Messages include chain ID and contract address
- **Access Control**: Only registered HaLo addresses can authorize payments

### 💰 Payment Features

- **Meta-Transactions**: Merchants pay gas fees, not customers
- **USDC Support**: Built for USDC token transfers
- **Flexible Amounts**: Support for any payment amount
- **Event Logging**: Complete audit trail of all payments

### 🛡️ Error Handling

- **Invalid Signature**: Rejects unauthorized signatures
- **Insufficient Allowance**: Checks USDC approval before execution
- **Nonce Already Used**: Prevents replay attacks
- **Zero Address**: Validates all addresses
- **Invalid Amount**: Rejects zero-amount payments

## Contract Functions

### User Functions

#### `registerHaloAddress(address haloAddress)`

Register a HaLo address as authorized to sign payments for the caller.

#### `revokeHaloAddress()`

Revoke authorization for the caller's HaLo address.

### Merchant Functions

#### `executePayment(address payer, address merchant, uint256 amount, uint256 nonce, bytes calldata signature)`

Execute a payment using a HaLo signature.

**Parameters:**

- `payer`: Address of the customer paying
- `merchant`: Address of the merchant receiving payment
- `amount`: Amount of USDC to transfer (in wei, 6 decimals)
- `nonce`: Unique nonce to prevent replay attacks
- `signature`: Signature from the HaLo chip

#### `executePaymentFromHalo(address haloAddress, address merchant, uint256 amount, uint256 nonce, bytes calldata signature)`

Execute a payment using only the HaLo address (convenience function).

**Parameters:**

- `haloAddress`: Address of the HaLo chip that signed the payment
- `merchant`: Address of the merchant receiving payment
- `amount`: Amount of USDC to transfer (in wei, 6 decimals)
- `nonce`: Unique nonce to prevent replay attacks
- `signature`: Signature from the HaLo chip

This function automatically looks up the payer address from the HaLo address, making it ideal for merchants who only have the HaLo address from scanning.

### View Functions

#### `getPaymentMessageHash(address payer, address merchant, uint256 amount, uint256 nonce)`

Get the message hash that should be signed by the HaLo chip.

#### `getEthSignedMessageHash(address payer, address merchant, uint256 amount, uint256 nonce)`

Get the Ethereum signed message hash for verification.

#### `getAuthorizedHaloAddress(address user)`

Get the authorized HaLo address for a user.

#### `getPayerFromHaloAddress(address haloAddress)`

Get the payer address associated with a HaLo address. Returns `address(0)` if the HaLo address is not registered.

#### `isNonceUsed(address payer, uint256 nonce)`

Check if a nonce has been used.

## Message Format

The message that needs to be signed by the HaLo chip:

```solidity
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
```

## Events

### `HaloAddressRegistered(address indexed user, address indexed haloAddress)`

Emitted when a user registers a HaLo address.

### `HaloAddressRevoked(address indexed user, address indexed haloAddress)`

Emitted when a user revokes their HaLo address.

### `PaymentExecuted(address indexed payer, address indexed merchant, uint256 amount, uint256 nonce, address indexed haloAddress)`

Emitted when a payment is successfully executed.

## Setup & Deployment

### Prerequisites

- [Foundry](https://getfoundry.sh/)
- Node.js and npm (for frontend integration)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd halo-payment-contract

# Install dependencies
forge install

# Run tests
forge test

# Deploy to Sepolia
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast
```

### Environment Variables

Create a `.env` file:

```bash
SEPOLIA_RPC_URL=https://sepolia.drpc.org
PRIVATE_KEY=your_private_key_here
USDC_ADDRESS=0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8  # Sepolia USDC
```

## Integration with Frontend

### 1. User Setup

```javascript
// User approves contract for USDC spending
await usdcContract.approve(haloPaymentAddress, ethers.constants.MaxUint256);

// User registers their HaLo address
await haloPaymentContract.registerHaloAddress(haloAddress);
```

### 2. Merchant Payment Flow

#### Method 1: Using Payer Address

```javascript
// 1. Get payment message hash
const messageHash = await haloPaymentContract.getPaymentMessageHash(
  payer,
  merchant,
  amount,
  nonce
);

// 2. Get HaLo signature (using libhalo)
const { execHaloCmdWeb } = await import("@arx-research/libhalo/api/web");
const result = await execHaloCmdWeb({
  name: "sign",
  keyNo: 1,
  digest: messageHash.slice(2), // Remove 0x prefix
});

// 3. Execute payment
await haloPaymentContract.executePayment(
  payer,
  merchant,
  amount,
  nonce,
  result.signature.ether
);
```

#### Method 2: Using HaLo Address Only (Recommended)

```javascript
// 1. Get payer address from HaLo address (optional - for display purposes)
const payer = await haloPaymentContract.getPayerFromHaloAddress(haloAddress);
if (payer === "0x0000000000000000000000000000000000000000") {
  throw new Error("HaLo address not registered");
}

// 2. Get payment message hash
const messageHash = await haloPaymentContract.getPaymentMessageHash(
  payer,
  merchant,
  amount,
  nonce
);

// 3. Get HaLo signature (using libhalo)
const { execHaloCmdWeb } = await import("@arx-research/libhalo/api/web");
const result = await execHaloCmdWeb({
  name: "sign",
  keyNo: 1,
  digest: messageHash.slice(2), // Remove 0x prefix
});

// 4. Execute payment using HaLo address
await haloPaymentContract.executePaymentFromHalo(
  haloAddress,
  merchant,
  amount,
  nonce,
  result.signature.ether
);
```

## Testing

The contract includes comprehensive tests covering:

- ✅ User registration and revocation
- ✅ Payment execution with valid signatures
- ✅ Security validations (invalid signatures, replay protection)
- ✅ Error conditions (insufficient allowance, zero addresses)
- ✅ Event emissions
- ✅ Message hash generation

Run tests:

```bash
forge test -vvv
```

## Security Considerations

1. **Signature Verification**: Always verify signatures match registered HaLo addresses
2. **Nonce Management**: Use unique nonces to prevent replay attacks
3. **Allowance Checks**: Verify USDC allowance before execution
4. **Chain Validation**: Messages include chain ID for cross-chain protection
5. **Access Control**: Only registered HaLo addresses can authorize payments

## Gas Optimization

- Uses `immutable` for USDC contract address
- Efficient storage layout with mappings
- Custom errors instead of string messages
- ReentrancyGuard for secure external calls

## License

MIT License - see LICENSE file for details.
