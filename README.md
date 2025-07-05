# New Avail - Cross-Chain DApp

A modern cross-chain decentralized application built with **Privy** authentication and **Avail Nexus** SDK for seamless multi-chain operations.

## Features

🔐 **Privy Authentication**

- Email, wallet, and SMS login options
- Embedded wallet creation
- Secure user management

🌉 **Avail Nexus Integration**

- Cross-chain token bridging
- Unified balance management across 16+ chains
- Direct token transfers
- Smart contract execution
- Bridge & Execute workflows

🎨 **Modern UI**

- Beautiful Tailwind CSS design
- Dark/light mode support
- Responsive design
- Real-time balance updates

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo>
cd new-avail
bun install
```

### 2. Configure Privy

1. Create a [Privy account](https://dashboard.privy.io/)
2. Create a new app in the Privy Dashboard
3. Copy your App ID
4. Create a `.env.local` file:

```bash
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
```

### 3. Run the Application

```bash
bun dev
```

Visit `http://localhost:3000` to see your app!

## Architecture

### Provider Stack

```
PrivyProvider (Authentication)
  └── NexusProvider (Cross-chain operations)
      └── WalletBridge (Connects Privy wallet to Nexus)
          └── App Components
```

### Key Components

- **`PrivyProvider`** - Handles user authentication and embedded wallets
- **`NexusProvider`** - Provides cross-chain functionality
- **`WalletBridge`** - Connects Privy's embedded wallet to Nexus SDK
- **`Header`** - Navigation with connect/disconnect button
- **`NexusDashboard`** - Portfolio overview and cross-chain actions

## Usage Examples

### Bridge Tokens

```typescript
import { BridgeButton } from "@avail-project/nexus";

<BridgeButton prefill={{ chainId: 137, token: "USDC", amount: "100" }}>
  {({ onClick, isLoading }) => (
    <button onClick={onClick} disabled={isLoading}>
      {isLoading ? "Bridging..." : "Bridge to Polygon"}
    </button>
  )}
</BridgeButton>;
```

### Transfer Tokens

```typescript
import { TransferButton } from "@avail-project/nexus";

<TransferButton>
  {({ onClick }) => <button onClick={onClick}>Send Funds</button>}
</TransferButton>;
```

### Bridge & Execute

```typescript
import { BridgeAndExecuteButton } from "@avail-project/nexus";

<BridgeAndExecuteButton
  contractAddress="0x..."
  contractAbi={abi}
  functionName="deposit"
  buildFunctionParams={(token, amount, chainId, userAddress) => ({
    functionParams: [token, amount, userAddress, 0],
    value: "0",
  })}
>
  {({ onClick, isLoading }) => (
    <button onClick={onClick} disabled={isLoading}>
      Bridge & Execute
    </button>
  )}
</BridgeAndExecuteButton>;
```

## Supported Networks

### Mainnet

- Ethereum (1)
- Optimism (10)
- Polygon (137)
- Arbitrum (42161)
- Avalanche (43114)
- Base (8453)
- Scroll (534352)

### Testnet

- Optimism Sepolia (11155420)
- Polygon Amoy (80002)
- Arbitrum Sepolia (421614)
- Base Sepolia (84532)

## Environment Variables

```bash
# Required
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id

# Optional
NEXT_PUBLIC_APP_LOGO_URL=https://your-logo-url.com/logo.png
```

## Development

### Project Structure

```
app/
├── components/
│   ├── Header.tsx              # Navigation with connect button
│   ├── PrivyProvider.tsx       # Privy authentication wrapper
│   ├── NexusProvider.tsx       # Nexus cross-chain wrapper
│   ├── WalletBridge.tsx        # Connects Privy to Nexus
│   └── NexusDashboard.tsx      # Portfolio and cross-chain UI
├── globals.css                 # Global styles
├── layout.tsx                  # Root layout with providers
└── page.tsx                    # Main page
```

### Key Dependencies

- **Next.js 15** - React framework
- **@privy-io/react-auth** - Authentication and embedded wallets
- **@avail-project/nexus** - Cross-chain operations
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety

## Customization

### Privy Configuration

Edit `app/components/PrivyProvider.tsx`:

```typescript
config={{
  appearance: {
    theme: 'light',
    accentColor: '#676FFF',
    logo: 'your-logo-url',
  },
  loginMethods: ['email', 'wallet', 'sms'],
  embeddedWallets: {
    createOnLogin: 'users-without-wallets',
  },
}}
```

### Nexus Configuration

Edit `app/components/NexusProvider.tsx`:

```typescript
config={{
  network: 'testnet', // or 'mainnet'
}}
```

## Troubleshooting

### Common Issues

1. **"Configuration Required" error**

   - Make sure `NEXT_PUBLIC_PRIVY_APP_ID` is set in `.env.local`

2. **Wallet not connecting to Nexus**

   - Check browser console for connection errors
   - Ensure user has completed Privy authentication

3. **Balance loading issues**
   - Verify wallet has testnet tokens
   - Check network connectivity

### Getting Help

- [Privy Documentation](https://docs.privy.io/)
- [Avail Nexus Documentation](https://github.com/availproject/nexus)
- [Avail Documentation](https://docs.availproject.org/)

## License

MIT License - see LICENSE file for details.
