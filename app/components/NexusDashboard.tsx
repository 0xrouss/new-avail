"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useNexus } from "@avail-project/nexus";
import type { UserAsset } from "@avail-project/nexus";

export default function NexusDashboard() {
  const { authenticated } = usePrivy();
  const { sdk } = useNexus();
  const [balances, setBalances] = useState<UserAsset[]>([]);
  const [loading, setLoading] = useState(false);
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

  const fetchBalances = async () => {
    if (!authenticated || !sdk || !isInitialized) return;

    setLoading(true);
    try {
      const unifiedBalances = await sdk.getUnifiedBalances();
      setBalances(unifiedBalances);
      console.log("📊 Balances fetched:", unifiedBalances);
    } catch (error) {
      console.error("❌ Failed to fetch balances:", error);
    } finally {
      setLoading(false);
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
    if (isInitialized) {
      fetchBalances();
    }
  }, [authenticated, sdk, isInitialized]);

  if (!authenticated) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-yellow-800 dark:text-yellow-200">
          🔐 Please connect your wallet to access Nexus features
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
    <div className="space-y-6">
      {/* Balances Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            💰 Portfolio Overview
          </h2>
          <button
            onClick={fetchBalances}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-1 rounded text-sm transition-colors"
          >
            {loading ? "🔄 Loading..." : "🔄 Refresh"}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Loading balances...
            </p>
          </div>
        ) : balances.length > 0 ? (
          <div className="space-y-3">
            {balances.map((asset, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {asset.symbol}
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Balance: {asset.balance}
                  </p>
                  {asset.balanceInFiat && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      ≈ ${asset.balanceInFiat}
                    </p>
                  )}
                </div>
                {asset.breakdown && asset.breakdown.length > 1 && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Across {asset.breakdown.length} chains
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">
              No balances found. Fund your wallet to get started!
            </p>
          </div>
        )}
      </div>

      {/* Network Status */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          🧪 <strong>Testnet Mode:</strong> You're connected to Avail Nexus
          testnet. Use testnet tokens for safe experimentation.
        </p>
      </div>
    </div>
  );
}
