"use client";

import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import NexusDashboard from "./components/NexusDashboard";
import BridgeInterface from "./components/BridgeInterface";

export default function Home() {
  const { ready, authenticated, user } = usePrivy();

  return (
    <div className="flex flex-col items-center justify-start min-h-[calc(100vh-64px)] p-8 pb-20 gap-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="flex flex-col gap-[32px] items-center max-w-6xl w-full">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />

        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to New Avail
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Your Avail blockchain application with Privy authentication and
            Nexus cross-chain functionality
          </p>
        </div>

        {ready && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Connection Status
            </h2>
            {authenticated ? (
              <div className="space-y-2">
                <p className="text-green-600 dark:text-green-400">
                  ✅ Connected
                </p>
                {user?.email?.address && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Email: {user.email.address}
                  </p>
                )}
                {user?.wallet?.address && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Wallet: {user.wallet.address}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-red-600 dark:text-red-400">❌ Not connected</p>
            )}
          </div>
        )}

        {/* Nexus Dashboard - only show when authenticated */}
        {ready && (
          <div className="w-full max-w-6xl">
            <NexusDashboard />
          </div>
        )}

        {/* Nexus Dashboard - only show when authenticated */}
        {ready && (
          <div className="w-full max-w-6xl">
            <BridgeInterface />
          </div>
        )}

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="https://docs.availproject.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            📚 Avail Docs
          </a>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
            href="https://docs.privy.io/"
            target="_blank"
            rel="noopener noreferrer"
          >
            🔐 Privy Docs
          </a>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
            href="https://github.com/availproject/nexus"
            target="_blank"
            rel="noopener noreferrer"
          >
            🌉 Nexus Docs
          </a>
        </div>
      </div>
    </div>
  );
}
