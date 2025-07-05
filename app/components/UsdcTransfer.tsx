"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useNexus } from "@avail-project/nexus";
import type {
  TransferParams,
  TransferResult,
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

const TRANSFER_TOKEN = "USDC";

export default function UsdcTransfer() {
  const { authenticated } = usePrivy();
  const { sdk } = useNexus();

  const [balances, setBalances] = useState<UserAsset[]>([]);
  const [amount, setAmount] = useState<string>("");
  const [recipient, setRecipient] = useState<string>("");
  const [chainId, setChainId] = useState<number>(11155420); // Default to Optimism Sepolia
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState<string>("");
  const [transferResult, setTransferResult] = useState<TransferResult | null>(
    null
  );
  const [isInitialized, setIsInitialized] = useState(false);

  const checkInitialization = async () => {
    if (!sdk) return false;

    try {
      // Try to call a method that would fail if not initialized
      await sdk.getUnifiedBalances();
      return true;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("CA not initialized")
      ) {
        return false;
      }
      // If it's a different error, assume it's initialized but there's another issue
      return true;
    }
  };

  // Check if SDK is initialized
  useEffect(() => {
    const checkInit = async () => {
      if (sdk) {
        const initialized = await checkInitialization();
        setIsInitialized(initialized);
      }
    };

    checkInit();

    // Check periodically until initialized
    const interval = setInterval(checkInit, 1000);

    return () => clearInterval(interval);
  }, [sdk]);

  // Fetch balances when SDK becomes initialized
  useEffect(() => {
    const fetchBalances = async () => {
      if (!authenticated || !sdk || !isInitialized) return;

      try {
        const unifiedBalances = await sdk.getUnifiedBalances();
        setBalances(unifiedBalances);
      } catch (error) {
        console.error("Failed to fetch balances:", error);
      }
    };

    if (isInitialized) {
      fetchBalances();
    }
  }, [authenticated, sdk, isInitialized]);

  // Simulate transfer when parameters change
  useEffect(() => {
    const simulateTransfer = async () => {
      if (
        !sdk ||
        !isInitialized ||
        !amount ||
        parseFloat(amount) <= 0 ||
        !recipient ||
        !isValidAddress(recipient)
      ) {
        setSimulation(null);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const result = await sdk.simulateTransfer({
          token: TRANSFER_TOKEN,
          amount: parseFloat(amount),
          chainId: chainId as any,
          recipient: recipient,
        } as TransferParams);
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
    const timer = setTimeout(simulateTransfer, 500);
    return () => clearTimeout(timer);
  }, [sdk, isInitialized, amount, recipient, chainId]);

  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const handleTransfer = async () => {
    if (
      !sdk ||
      !amount ||
      parseFloat(amount) <= 0 ||
      !recipient ||
      !isValidAddress(recipient)
    )
      return;

    setTransferring(true);
    setError("");
    setTransferResult(null);

    try {
      const result: TransferResult = await sdk.transfer({
        token: TRANSFER_TOKEN,
        amount: parseFloat(amount),
        chainId: chainId as any,
        recipient: recipient,
      } as TransferParams);

      setTransferResult(result);

      if (result.success) {
        console.log("✅ Transfer successful!", result);
        if (result.explorerUrl) {
          console.log("View transaction:", result.explorerUrl);
        }

        // Reset form on success
        setAmount("");
        setRecipient("");
        setSimulation(null);

        // Refresh balances
        const updatedBalances = await sdk.getUnifiedBalances();
        setBalances(updatedBalances);
      } else {
        console.error("❌ Transfer failed:", result.error);
        setError(result.error || "Transfer operation failed");
      }
    } catch (error) {
      console.error("❌ Transfer error:", error);
      setError(
        error instanceof Error ? error.message : "Transfer operation failed"
      );
    } finally {
      setTransferring(false);
    }
  };

  const usdcBalance = balances.find((b) => b.symbol === TRANSFER_TOKEN);
  const maxAmount = usdcBalance ? parseFloat(usdcBalance.balance) : 0;

  if (!authenticated) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-yellow-800 dark:text-yellow-200">
          🔐 Please connect your wallet to use USDC transfer
        </p>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <p className="text-blue-800 dark:text-blue-200">
            🔄 Initializing Nexus SDK... Please sign the transaction in your
            wallet if prompted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          💸 USDC Transfer
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

        {/* Recipient Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            className={`w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              recipient && !isValidAddress(recipient)
                ? "border-red-300 dark:border-red-600"
                : "border-gray-300 dark:border-gray-600"
            }`}
          />
          {recipient && !isValidAddress(recipient) && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              Please enter a valid Ethereum address
            </p>
          )}
        </div>

        {/* Chain Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target Chain
          </label>
          <select
            value={chainId}
            onChange={(e) => setChainId(parseInt(e.target.value))}
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
                Calculating transfer costs...
              </p>
            </div>
          </div>
        )}

        {simulation && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="font-medium text-green-800 dark:text-green-200 mb-2">
              📊 Transfer Preview
            </h3>
            <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
              <p>Amount to send: {amount} USDC</p>
              <p>
                Recipient: {recipient.slice(0, 6)}...{recipient.slice(-4)}
              </p>
              <p>
                Target chain:{" "}
                {SUPPORTED_CHAINS.find((c) => c.id === chainId)?.name}
              </p>
              {(simulation as any).estimatedGas && (
                <p>Estimated gas: {(simulation as any).estimatedGas}</p>
              )}
              {(simulation as any).transferFee && (
                <p>Transfer fee: {(simulation as any).transferFee}</p>
              )}
              {(simulation as any).estimatedTime && (
                <p>Estimated time: {(simulation as any).estimatedTime}</p>
              )}
            </div>
          </div>
        )}

        {/* Transfer Result */}
        {transferResult && (
          <div
            className={`border rounded-lg p-4 ${
              transferResult.success
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            }`}
          >
            <h3
              className={`font-medium mb-2 ${
                transferResult.success
                  ? "text-green-800 dark:text-green-200"
                  : "text-red-800 dark:text-red-200"
              }`}
            >
              {transferResult.success
                ? "✅ Transfer Successful!"
                : "❌ Transfer Failed"}
            </h3>
            <div
              className={`space-y-1 text-sm ${
                transferResult.success
                  ? "text-green-700 dark:text-green-300"
                  : "text-red-700 dark:text-red-300"
              }`}
            >
              {transferResult.success ? (
                <>
                  <p>
                    Your USDC has been successfully transferred to{" "}
                    {recipient.slice(0, 6)}...{recipient.slice(-4)} on{" "}
                    {SUPPORTED_CHAINS.find((c) => c.id === chainId)?.name}!
                  </p>
                  {transferResult.explorerUrl && (
                    <div className="mt-2">
                      <a
                        href={transferResult.explorerUrl}
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
                  {transferResult.error ||
                    "An unknown error occurred during the transfer operation."}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && !transferResult && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200 text-sm">❌ {error}</p>
          </div>
        )}

        {/* Transfer Button */}
        <button
          onClick={handleTransfer}
          disabled={
            !amount ||
            parseFloat(amount) <= 0 ||
            parseFloat(amount) > maxAmount ||
            !recipient ||
            !isValidAddress(recipient) ||
            transferring ||
            loading ||
            maxAmount <= 0
          }
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {transferring ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Transferring...</span>
            </div>
          ) : (
            `Transfer ${amount || "0"} USDC to ${
              recipient
                ? `${recipient.slice(0, 6)}...${recipient.slice(-4)}`
                : "recipient"
            }`
          )}
        </button>
      </div>

      {/* Info Section */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          💡 <strong>Testnet Transfer:</strong> Nexus will automatically route
          your USDC from the best available source chain to the target chain and
          recipient address. The transfer may involve cross-chain bridging if
          needed.
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
