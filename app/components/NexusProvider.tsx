"use client";

import { NexusProvider } from "@avail-project/nexus";
import { ReactNode } from "react";

interface NexusProviderWrapperProps {
  children: ReactNode;
}

export default function NexusProviderWrapper({
  children,
}: NexusProviderWrapperProps) {
  return (
    <NexusProvider
      config={{
        network: "testnet", // Use testnet for development
      }}
    >
      {children}
    </NexusProvider>
  );
}
