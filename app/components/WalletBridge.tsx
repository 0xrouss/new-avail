"use client";

import { useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useNexus } from "@avail-project/nexus";

export default function WalletBridge() {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { setProvider, sdk } = useNexus();

  useEffect(() => {
    const connectProvider = async () => {
      if (authenticated && wallets.length > 0 && sdk) {
        try {
          // Get the first embedded wallet
          const wallet = wallets[0];
          // Get the Ethereum provider from the wallet
          const provider = await wallet.getEthereumProvider();
          if (provider) {
            // Set the provider in Nexus
            setProvider(provider);
            console.log("✅ Nexus connected to Privy wallet provider");

            // Initialize the SDK from context with the provider
            // This will ask user to sign for CA initialization
            await sdk.initialize(provider);
            console.log("✅ Nexus SDK initialized with CA signature");
          }
        } catch (error) {
          console.error("❌ Failed to connect Nexus to Privy provider:", error);
        }
      }
    };

    connectProvider();
  }, [authenticated, wallets, setProvider, sdk]);

  return null; // This component doesn't render anything
}
