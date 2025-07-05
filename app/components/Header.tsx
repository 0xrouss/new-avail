"use client";

import { usePrivy } from "@privy-io/react-auth";

export default function Header() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  return (
    <header className="w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              New Avail
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {ready && (
              <>
                {authenticated ? (
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {user?.email?.address ||
                        user?.wallet?.address?.slice(0, 6) +
                          "..." +
                          user?.wallet?.address?.slice(-4)}
                    </span>
                    <button
                      onClick={logout}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={login}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Connect Wallet
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
