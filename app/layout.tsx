import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PrivyProviderWrapper from "./components/PrivyProvider";
import NexusProviderWrapper from "./components/NexusProvider";
import WalletBridge from "./components/WalletBridge";
import Header from "./components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "New Avail",
  description:
    "Avail blockchain application with Privy authentication and Nexus cross-chain functionality",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PrivyProviderWrapper>
          <NexusProviderWrapper>
            <WalletBridge />
            <Header />
            <main className="min-h-screen">{children}</main>
          </NexusProviderWrapper>
        </PrivyProviderWrapper>
      </body>
    </html>
  );
}
