"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useNexus } from "@avail-project/nexus";
import type {
  BridgeParams,
  BridgeResult,
  SimulationResult,
  UserAsset,
} from "@avail-project/nexus";

// Testnet chains supported by Nexus
const SUPPORTED_CHAINS = [
  { id: 11155420, name: "Optimism Sepolia", symbol: "ETH" },
  { id: 80002, name: "Polygon Amoy", symbol: "MATIC" },
  { id: 421614, name: "Arbitrum Sepolia", symbol: "ETH" },
  { id: 84532, name: "Base Sepolia", symbol: "ETH" },
];

const BRIDGE_TOKEN = "USDC";

export default function BridgeInterface() {
  const { authenticated } = usePrivy();
  const { sdk } = useNexus();

  const [balances, setBalances] = useState<UserAsset[]>([]);
  const [amount, setAmount] = useState<string>("");
  const [destinationChain, setDestinationChain] = useState<number>(11155420); // Default to Optimism Sepolia
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [bridging, setBridging] = useState(false);
  const [error, setError] = useState<string>("");
  const [bridgeResult, setBridgeResult] = useState<BridgeResult | null>(null);

  // Fetch balances on component mount
  useEffect(() => {
    const fetchBalances = async () => {
      if (!authenticated || !sdk) return;

      try {
        const unifiedBalances = await sdk.getUnifiedBalances();
        setBalances(unifiedBalances);
      } catch (error) {
        console.error("Failed to fetch balances:", error);
      }
    };

    fetchBalances();
  }, [authenticated, sdk]);

  // Simulate bridge when parameters change
  useEffect(() => {
    const simulateBridge = async () => {
      if (!sdk || !amount || parseFloat(amount) <= 0) {
        setSimulation(null);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const result = await sdk.simulateBridge({
          token: BRIDGE_TOKEN,
          amount: parseFloat(amount),
          chainId: destinationChain as any, // Type assertion to avoid chain ID type issues
        });
        setSimulation(result);
      } catch (error) {
        console.error("Simulation failed:", error);
        setError(error instanceof Error ? error.message : "Simulation failed");
        setSimulation(null);
      } finally {
        setLoading(false);
      }
    };

    // Debounce simulation calls
    const timer = setTimeout(simulateBridge, 500);
    return () => clearTimeout(timer);
  }, [sdk, amount, destinationChain]);

  const handleBridge = async () => {
    if (!sdk || !amount || parseFloat(amount) <= 0) return;

    setBridging(true);
    setError("");
    setBridgeResult(null);

    try {
      const result: BridgeResult = await sdk.bridge({
        token: BRIDGE_TOKEN,
        amount: parseFloat(amount),
        chainId: destinationChain as any, // Type assertion to avoid chain ID type issues
      } as BridgeParams);

      setBridgeResult(result);

      if (result.success) {
        console.log("✅ Bridge successful!", result);
        if (result.explorerUrl) {
          console.log("View transaction:", result.explorerUrl);
        }

        // Reset form on success
        setAmount("");
        setSimulation(null);

        // Refresh balances
        const updatedBalances = await sdk.getUnifiedBalances();
        setBalances(updatedBalances);
      } else {
        console.error("❌ Bridge failed:", result.error);
        setError(result.error || "Bridge operation failed");
      }
    } catch (error) {
      console.error("❌ Bridge error:", error);
      setError(
        error instanceof Error ? error.message : "Bridge operation failed"
      );
    } finally {
      setBridging(false);
    }
  };

  const usdcBalance = balances.find((b) => b.symbol === BRIDGE_TOKEN);
  const maxAmount = usdcBalance ? parseFloat(usdcBalance.balance) : 0;

  if (!authenticated) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-yellow-800 dark:text-yellow-200">
          🔐 Please connect your wallet to use the bridge
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          🌉 USDC Cross-Chain Bridge
        </h2>
      </div>

      <div className="space-y-4">
        {/* Token Display */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Token
          </label>
          <div className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
            <div className="flex items-center justify-between">
              <span className="font-medium">USDC</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Balance: {usdcBalance?.balance || "0.00"} USDC
              </span>
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Amount
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.000001"
              min="0"
              max={maxAmount}
              className="w-full p-3 pr-16 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => setAmount(maxAmount.toString())}
              disabled={maxAmount <= 0}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800 disabled:text-gray-400 text-sm font-medium"
            >
              MAX
            </button>
          </div>
          {usdcBalance && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Available: {usdcBalance.balance} USDC
            </p>
          )}
        </div>

        {/* Destination Chain */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Destination Chain
          </label>
          <select
            value={destinationChain}
            onChange={(e) => setDestinationChain(parseInt(e.target.value))}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {SUPPORTED_CHAINS.map((chain) => (
              <option key={chain.id} value={chain.id}>
                {chain.name} ({chain.symbol})
              </option>
            ))}
          </select>
        </div>

        {/* Simulation Results */}
        {loading && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                Calculating bridge costs...
              </p>
            </div>
          </div>
        )}

        {simulation && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="font-medium text-green-800 dark:text-green-200 mb-2">
              📊 Bridge Preview
            </h3>
            <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
              <p>
                Amount to receive: {(simulation as any).amountOut || amount}{" "}
                USDC
              </p>
              {(simulation as any).estimatedGas && (
                <p>Estimated gas: {(simulation as any).estimatedGas}</p>
              )}
              {(simulation as any).bridgeFee && (
                <p>Bridge fee: {(simulation as any).bridgeFee}</p>
              )}
              {(simulation as any).estimatedTime && (
                <p>Estimated time: {(simulation as any).estimatedTime}</p>
              )}
            </div>
          </div>
        )}

        {/* Bridge Result */}
        {bridgeResult && (
          <div
            className={`border rounded-lg p-4 ${
              bridgeResult.success
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            }`}
          >
            <h3
              className={`font-medium mb-2 ${
                bridgeResult.success
                  ? "text-green-800 dark:text-green-200"
                  : "text-red-800 dark:text-red-200"
              }`}
            >
              {bridgeResult.success
                ? "✅ Bridge Successful!"
                : "❌ Bridge Failed"}
            </h3>
            <div
              className={`space-y-1 text-sm ${
                bridgeResult.success
                  ? "text-green-700 dark:text-green-300"
                  : "text-red-700 dark:text-red-300"
              }`}
            >
              {bridgeResult.success ? (
                <>
                  <p>
                    Your USDC has been successfully bridged to{" "}
                    {
                      SUPPORTED_CHAINS.find((c) => c.id === destinationChain)
                        ?.name
                    }
                    !
                  </p>
                  {bridgeResult.explorerUrl && (
                    <div className="mt-2">
                      <a
                        href={bridgeResult.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline"
                      >
                        <span>View transaction</span>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <p>
                  {bridgeResult.error ||
                    "An unknown error occurred during the bridge operation."}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && !bridgeResult && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200 text-sm">❌ {error}</p>
          </div>
        )}

        {/* Bridge Button */}
        <button
          onClick={handleBridge}
          disabled={
            !amount ||
            parseFloat(amount) <= 0 ||
            parseFloat(amount) > maxAmount ||
            bridging ||
            loading ||
            maxAmount <= 0
          }
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {bridging ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Bridging...</span>
            </div>
          ) : (
            `Bridge ${amount || "0"} USDC to ${
              SUPPORTED_CHAINS.find((c) => c.id === destinationChain)?.name ||
              "Chain"
            }`
          )}
        </button>
      </div>

      {/* Info Section */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          💡 <strong>Testnet Bridge:</strong> Nexus automatically selects the
          best route from your available USDC balances across all testnet
          chains. You only need to specify the destination chain and amount.
        </p>
      </div>

      {/* Supported Chains Info */}
      <div className="mt-4 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
          🔗 Supported Testnet Chains
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
          {SUPPORTED_CHAINS.map((chain) => (
            <div key={chain.id} className="flex items-center space-x-2">
              <span className="text-green-500">✅</span>
              <span>{chain.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
