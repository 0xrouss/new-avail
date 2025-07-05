# HaloPayment Contract Deployment Guide

## Prerequisites

1. **Foundry installed**: Follow [Foundry installation guide](https://getfoundry.sh/)
2. **Wallet with ETH**: For gas fees on Sepolia testnet
3. **Environment variables**: Set up your deployment configuration

## Environment Setup

Create a `.env` file in the project root:

```bash
# Network Configuration
SEPOLIA_RPC_URL=https://sepolia.drpc.org
PRIVATE_KEY=your_private_key_here

# Contract Configuration
USDC_ADDRESS=0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8  # Sepolia USDC

# Optional: Etherscan verification
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

## Deployment Steps

### 1. Test the Contract

```bash
# Run all tests
forge test

# Run with verbose output
forge test -vvv

# Run specific test
forge test --match-test test_ExecutePayment
```

### 2. Deploy to Sepolia

```bash
# Deploy with script
forge script script/Deploy.s.sol \
    --rpc-url $SEPOLIA_RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY

# Or deploy without verification
forge script script/Deploy.s.sol \
    --rpc-url $SEPOLIA_RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast
```

### 3. Verify Contract (if not done during deployment)

```bash
forge verify-contract \
    <CONTRACT_ADDRESS> \
    src/HaloPayment.sol:HaloPayment \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    --chain sepolia \
    --constructor-args $(cast abi-encode "constructor(address)" $USDC_ADDRESS)
```

## Post-Deployment

### 1. Update Frontend Configuration

Update your frontend configuration with the deployed contract address:

```javascript
// In your frontend code
const HALO_PAYMENT_ADDRESS = "0x..."; // Your deployed contract address
```

### 2. Verify Deployment

```bash
# Check contract code
cast code <CONTRACT_ADDRESS> --rpc-url $SEPOLIA_RPC_URL

# Check contract owner
cast call <CONTRACT_ADDRESS> "owner()" --rpc-url $SEPOLIA_RPC_URL

# Check USDC address
cast call <CONTRACT_ADDRESS> "usdc()" --rpc-url $SEPOLIA_RPC_URL
```

## Mainnet Deployment

⚠️ **WARNING**: Mainnet deployment requires careful consideration and testing.

### Prerequisites for Mainnet

1. **Thorough testing**: Ensure all tests pass and contract is audited
2. **Mainnet ETH**: For deployment gas fees
3. **Mainnet USDC**: Update USDC address to mainnet version

### Mainnet Configuration

```bash
# .env for mainnet
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your-api-key
PRIVATE_KEY=your_mainnet_private_key
USDC_ADDRESS=0xA0b86a33E6441E4C09d0b6b7B8C6a2C3b5e9E5e9  # Mainnet USDC
```

### Mainnet Deployment Command

```bash
forge script script/Deploy.s.sol \
    --rpc-url $MAINNET_RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY
```

## Gas Optimization

### Estimate Gas Costs

```bash
# Estimate deployment gas
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --estimate-gas

# Check function gas costs
forge test --gas-report
```

### Typical Gas Costs (Sepolia)

- **Contract Deployment**: ~1,500,000 gas
- **Register HaLo Address**: ~50,000 gas
- **Execute Payment**: ~120,000 gas
- **Revoke HaLo Address**: ~30,000 gas

## Security Checklist

Before deploying to mainnet:

- [ ] All tests pass
- [ ] Contract has been audited
- [ ] Access controls are properly configured
- [ ] Emergency procedures are in place
- [ ] Upgrade path is considered (if needed)
- [ ] Integration testing completed
- [ ] Gas optimization reviewed

## Troubleshooting

### Common Issues

1. **Insufficient funds**: Ensure wallet has enough ETH for gas
2. **Network issues**: Check RPC URL and network connectivity
3. **Private key issues**: Ensure private key is correct and has proper format
4. **Contract verification fails**: Check constructor arguments and compiler version

### Debug Commands

```bash
# Check account balance
cast balance <YOUR_ADDRESS> --rpc-url $SEPOLIA_RPC_URL

# Check gas price
cast gas-price --rpc-url $SEPOLIA_RPC_URL

# Check nonce
cast nonce <YOUR_ADDRESS> --rpc-url $SEPOLIA_RPC_URL
```

## Contract Addresses

### Sepolia Testnet

- **USDC**: `0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8`
- **HaloPayment**: `<TO_BE_DEPLOYED>`

### Mainnet

- **USDC**: `0xA0b86a33E6441E4C09d0b6b7B8C6a2C3b5e9E5e9`
- **HaloPayment**: `<TO_BE_DEPLOYED>`

## Support

For deployment issues:

1. Check the [Foundry documentation](https://book.getfoundry.sh/)
2. Review contract tests and examples
3. Verify network configuration and RPC endpoints
