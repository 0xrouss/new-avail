"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { ReactNode } from "react";

interface PrivyProviderWrapperProps {
  children: ReactNode;
}

export default function PrivyProviderWrapper({
  children,
}: PrivyProviderWrapperProps) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-900/20">
        <div className="text-center p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-4">
            Configuration Required
          </h1>
          <p className="text-red-700 dark:text-red-300 mb-4">
            Please set your Privy App ID in the environment variables.
          </p>
          <div className="bg-red-100 dark:bg-red-800/50 p-4 rounded-lg text-left">
            <p className="text-sm text-red-800 dark:text-red-200 font-mono">
              NEXT_PUBLIC_PRIVY_APP_ID=your-app-id
            </p>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 mt-4">
            Get your App ID from{" "}
            <a
              href="https://dashboard.privy.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              Privy Dashboard
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: "light",
          accentColor: "#676FFF",
          logo: process.env.NEXT_PUBLIC_APP_LOGO_URL,
          showWalletLoginFirst: false,
        },
        loginMethods: ["email", "wallet", "sms"],
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
          requireUserPasswordOnCreate: false,
        },
        mfa: {
          noPromptOnMfaRequired: false,
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
