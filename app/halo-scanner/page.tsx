"use client";

import { useState } from "react";
import {
  createPublicClient,
  http,
  formatEther,
  parseAbi,
  createWalletClient,
  custom,
} from "viem";
import { sepolia } from "viem/chains";
import { recoverMessageAddress } from "viem";
import { useWallets } from "@privy-io/react-auth";

interface HaloCommand {
  name: string;
  [key: string]: any;
}

interface HaloResult {
  etherAddresses?: { [key: string]: string };
  [key: string]: any;
}

interface AddressInfo {
  key: string;
  address: string;
  balance?: string;
  isRegistered?: boolean;
  usdcAllowance?: string;
  registeredBy?: string;
  payerUsdcBalance?: string;
}

export default function SepoliaPage() {
  const [status, setStatus] = useState<string>("Ready to read addresses");
  const [error, setError] = useState<string>("");
  const [addresses, setAddresses] = useState<AddressInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [signature, setSignature] = useState<string>("");
  const [recoveredAddress, setRecoveredAddress] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<string>("");
  const [registrationStatus, setRegistrationStatus] = useState<string>("");

  const { wallets } = useWallets();

  const SEPOLIA_RPC_URL = "https://sepolia.drpc.org";
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(SEPOLIA_RPC_URL),
  });

  // Contract addresses on Sepolia testnet
  const USDC_CONTRACT_ADDRESS =
    "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238" as const;
  const HALO_PAYMENT_CONTRACT_ADDRESS =
    "0xEC0250Af17481f9cB405081D49Fb9228769B3092" as const;

  // Contract ABIs
  const USDC_ABI = parseAbi([
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address account) view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
  ]);

  const HALO_PAYMENT_ABI = parseAbi([
    "function getPayerFromHaloAddress(address haloAddress) view returns (address)",
    "function getAuthorizedHaloAddress(address user) view returns (address)",
    "function executePaymentFromHalo(address haloAddress, address merchant, uint256 amount, uint256 nonce, bytes calldata signature) external",
    "function getPaymentMessageHash(address payer, address merchant, uint256 amount, uint256 nonce) view returns (bytes32)",
    "function registerHaloAddress(address haloAddress) external",
  ]);

  const readAddressesAndBalances = async () => {
    setIsLoading(true);
    setError("");
    setStatus("Preparing NFC scan...");
    setAddresses([]);
    try {
      if (!("NDEFReader" in window) && !navigator.credentials) {
        throw new Error("NFC not supported on this device/browser");
      }
      setStatus(
        "Scanning NFC tag... Please hold your HaLo tag near the device"
      );
      const { execHaloCmdWeb } = await import("@arx-research/libhalo/api/web");
      const result: HaloResult = await execHaloCmdWeb({ name: "get_pkeys" });
      if (!result.etherAddresses) {
        throw new Error("No addresses found on HaLo tag");
      }
      setStatus("Fetching balances and checking HaLo registrations...");
      // Fetch balances and check HaLo registrations for each address
      const entries = Object.entries(result.etherAddresses);
      const addressInfos = await Promise.all(
        entries.map(async ([key, address]) => {
          try {
            // Get ETH balance
            const balanceWei = await publicClient.getBalance({
              address: address as `0x${string}`,
            });
            const balance = formatEther(balanceWei);

            // Check if this HaLo address is registered in the contract
            let isRegistered = false;
            let registeredBy = "";
            let usdcAllowance = "0";
            let payerUsdcBalance = "0";

            try {
              const registeredUser = await publicClient.readContract({
                address: HALO_PAYMENT_CONTRACT_ADDRESS,
                abi: HALO_PAYMENT_ABI,
                functionName: "getPayerFromHaloAddress",
                args: [address as `0x${string}`],
              });

              if (
                registeredUser &&
                registeredUser !== "0x0000000000000000000000000000000000000000"
              ) {
                isRegistered = true;
                registeredBy = registeredUser as string;

                // Check USDC allowance for the registered user
                const allowance = await publicClient.readContract({
                  address: USDC_CONTRACT_ADDRESS,
                  abi: USDC_ABI,
                  functionName: "allowance",
                  args: [
                    registeredUser as `0x${string}`,
                    HALO_PAYMENT_CONTRACT_ADDRESS,
                  ],
                });
                usdcAllowance = (Number(allowance) / 1000000).toString(); // USDC has 6 decimals

                // Check USDC balance for the registered user
                const payerBalance = await publicClient.readContract({
                  address: USDC_CONTRACT_ADDRESS,
                  abi: USDC_ABI,
                  functionName: "balanceOf",
                  args: [registeredUser as `0x${string}`],
                });
                payerUsdcBalance = (Number(payerBalance) / 1000000).toString(); // USDC has 6 decimals
              }
            } catch (contractError) {
              console.log(
                `Contract check failed for ${address}:`,
                contractError
              );
            }

            return {
              key,
              address,
              balance,
              isRegistered,
              registeredBy,
              usdcAllowance,
              payerUsdcBalance,
            };
          } catch {
            return {
              key,
              address,
              balance: "Error",
              isRegistered: false,
              registeredBy: "",
              usdcAllowance: "0",
              payerUsdcBalance: "0",
            };
          }
        })
      );
      setAddresses(addressInfos);
      setStatus("Addresses, balances, and HaLo registrations loaded.");
    } catch (err: any) {
      setError(err.message || "Unknown error");
      setStatus("Ready to read addresses");
    } finally {
      setIsLoading(false);
    }
  };

  const signHelloWorld = async (keyNo: string) => {
    setIsLoading(true);
    setError("");
    setSignature("");
    setRecoveredAddress("");
    setStatus(`Signing 'Hello World' with key ${keyNo}...`);
    try {
      if (!("NDEFReader" in window) && !navigator.credentials) {
        throw new Error("NFC not supported on this device/browser");
      }
      setStatus(
        `Scanning NFC tag... Please hold your HaLo tag near the device to sign with key ${keyNo}`
      );
      const { execHaloCmdWeb } = await import("@arx-research/libhalo/api/web");
      const result = await execHaloCmdWeb({
        name: "sign",
        message: "Hello World",
        format: "text",
        keyNo,
      });
      if (!result.signature || !result.signature.ether) {
        throw new Error("No signature received from HaLo tag");
      }
      setSignature(result.signature.ether);
      setStatus(`Message signed successfully with key ${keyNo}!`);
      // Recover address from signature
      try {
        const address = await recoverMessageAddress({
          message: "Hello World",
          signature: result.signature.ether,
        });
        setRecoveredAddress(address);
      } catch (e) {
        setRecoveredAddress("(Failed to recover address)");
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
      setStatus("Ready to read addresses");
    } finally {
      setIsLoading(false);
    }
  };

  const executePayment = async () => {
    if (!addresses.length) {
      setError("No HaLo addresses found. Please scan a tag first.");
      return;
    }

    const connectedWallet = wallets.find(
      (wallet) => wallet.walletClientType === "privy"
    );
    if (!connectedWallet) {
      setError("No wallet connected. Please connect your wallet first.");
      return;
    }

    const firstAddress = addresses[0];
    if (!firstAddress.isRegistered) {
      setError("First HaLo address is not registered for payments.");
      return;
    }

    if (
      !firstAddress.usdcAllowance ||
      parseFloat(firstAddress.usdcAllowance) < 1
    ) {
      setError("Insufficient USDC allowance for payment.");
      return;
    }

    if (
      !firstAddress.payerUsdcBalance ||
      parseFloat(firstAddress.payerUsdcBalance) < 1
    ) {
      setError("Payer has insufficient USDC balance for payment.");
      return;
    }

    setIsLoading(true);
    setError("");
    setPaymentStatus("Preparing payment...");

    try {
      // Get merchant address from connected wallet
      const merchantAddress = connectedWallet.address;
      const haloAddress = firstAddress.address as `0x${string}`;
      const amount = 1000000; // 1 USDC (6 decimals)
      const nonce = Date.now(); // Simple nonce using timestamp

      // Get the payer address from the contract
      const payerAddress = await publicClient.readContract({
        address: HALO_PAYMENT_CONTRACT_ADDRESS,
        abi: HALO_PAYMENT_ABI,
        functionName: "getPayerFromHaloAddress",
        args: [haloAddress],
      });

      if (
        !payerAddress ||
        payerAddress === "0x0000000000000000000000000000000000000000"
      ) {
        throw new Error("Could not find payer address for HaLo address");
      }

      // Get the message hash that needs to be signed
      const messageHash = await publicClient.readContract({
        address: HALO_PAYMENT_CONTRACT_ADDRESS,
        abi: HALO_PAYMENT_ABI,
        functionName: "getPaymentMessageHash",
        args: [
          payerAddress,
          merchantAddress as `0x${string}`,
          BigInt(amount),
          BigInt(nonce),
        ],
      });

      setPaymentStatus("Scanning HaLo tag for payment signature...");

      // Get signature from HaLo tag
      const { execHaloCmdWeb } = await import("@arx-research/libhalo/api/web");
      const result = await execHaloCmdWeb({
        name: "sign",
        message: messageHash,
        format: "hex",
        keyNo: firstAddress.key,
      });

      if (!result.signature || !result.signature.ether) {
        throw new Error("No signature received from HaLo tag");
      }

      setPaymentStatus("Executing payment on blockchain...");

      // Create wallet client for transaction
      const provider = await connectedWallet.getEthereumProvider();
      const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom(provider),
      });

      // Execute the payment
      const hash = await walletClient.writeContract({
        address: HALO_PAYMENT_CONTRACT_ADDRESS,
        abi: HALO_PAYMENT_ABI,
        functionName: "executePaymentFromHalo",
        args: [
          haloAddress,
          merchantAddress as `0x${string}`,
          BigInt(amount),
          BigInt(nonce),
          result.signature.ether as `0x${string}`,
        ],
        account: merchantAddress as `0x${string}`,
      });

      setPaymentStatus(`Payment successful! Transaction hash: ${hash}`);
    } catch (err: any) {
      setError(err.message || "Payment failed");
      setPaymentStatus("");
    } finally {
      setIsLoading(false);
    }
  };

  const registerHaloAndApproveUSDC = async () => {
    if (!addresses.length) {
      setError("No HaLo addresses found. Please scan a tag first.");
      return;
    }

    const connectedWallet = wallets.find(
      (wallet) => wallet.walletClientType === "privy"
    );
    if (!connectedWallet) {
      setError("No wallet connected. Please connect your wallet first.");
      return;
    }

    const firstAddress = addresses[0];
    const userAddress = connectedWallet.address;
    const haloAddress = firstAddress.address as `0x${string}`;

    setIsLoading(true);
    setError("");
    setRegistrationStatus("Starting registration process...");

    try {
      // Create wallet client for transactions
      const provider = await connectedWallet.getEthereumProvider();
      const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom(provider),
      });

      // Step 1: Register HaLo address in the contract
      setRegistrationStatus("Registering HaLo address in contract...");
      const registerHash = await walletClient.writeContract({
        address: HALO_PAYMENT_CONTRACT_ADDRESS,
        abi: HALO_PAYMENT_ABI,
        functionName: "registerHaloAddress",
        args: [haloAddress],
        account: userAddress as `0x${string}`,
      });

      setRegistrationStatus(
        `HaLo address registered! Waiting for confirmation... (${registerHash})`
      );

      // Wait for registration transaction to be mined
      await publicClient.waitForTransactionReceipt({ hash: registerHash });

      // Step 2: Approve USDC spending (approve a large amount, e.g., 1000 USDC)
      setRegistrationStatus("Approving USDC spending for contract...");
      const approveAmount = BigInt(1000 * 1000000); // 1000 USDC (6 decimals)

      const approveHash = await walletClient.writeContract({
        address: USDC_CONTRACT_ADDRESS,
        abi: USDC_ABI,
        functionName: "approve",
        args: [HALO_PAYMENT_CONTRACT_ADDRESS, approveAmount],
        account: userAddress as `0x${string}`,
      });

      setRegistrationStatus(
        `USDC approval submitted! Waiting for confirmation... (${approveHash})`
      );

      // Wait for approval transaction to be mined
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      setRegistrationStatus(
        "✅ Registration and approval complete! You can now make payments with your HaLo tag."
      );

      // Refresh the addresses to show updated registration status
      setTimeout(() => {
        readAddressesAndBalances();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Registration failed");
      setRegistrationStatus("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              🔗 HaLo → Sepolia
            </h1>
            <p className="text-lg text-gray-600">
              Read addresses and show Sepolia balances
            </p>
          </div>

          {/* Status Display */}
          <div className="p-4 bg-gray-50 rounded-lg mb-4">
            <span className="font-semibold text-lg">Status:</span>
            <p className="text-gray-700">{status}</p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
              <h3 className="font-semibold text-red-800 mb-2">❌ Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={readAddressesAndBalances}
            disabled={isLoading}
            className="w-full p-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2 mb-6"
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Reading...</span>
              </>
            ) : (
              <>
                <span>🔍</span>
                <span>Read Addresses & Show Balances</span>
              </>
            )}
          </button>

          {/* Registration Button */}
          <button
            onClick={registerHaloAndApproveUSDC}
            disabled={
              isLoading || !addresses.length || addresses[0]?.isRegistered
            }
            className="w-full p-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2 mb-6"
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>🔐</span>
                <span>Register First HaLo Address & Approve USDC</span>
              </>
            )}
          </button>

          {/* Payment Button */}
          <button
            onClick={executePayment}
            disabled={
              isLoading || !addresses.length || !addresses[0]?.isRegistered
            }
            className="w-full p-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2 mb-6"
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>💳</span>
                <span>Pay 1 USDC from First HaLo Address</span>
              </>
            )}
          </button>

          {/* Sign Hello World Buttons */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <button
              onClick={() => signHelloWorld("1")}
              disabled={isLoading}
              className="w-full p-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <span>✍️</span>
              <span>Sign Hello World with Key 1</span>
            </button>
            <button
              onClick={() => signHelloWorld("0")}
              disabled={isLoading}
              className="w-full p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <span>✍️</span>
              <span>Sign Hello World with Key 2</span>
            </button>
          </div>

          {/* Registration Status Display */}
          {registrationStatus && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg mb-4">
              <h3 className="font-semibold text-orange-800 mb-2">
                🔐 Registration Status
              </h3>
              <p className="text-orange-700">{registrationStatus}</p>
            </div>
          )}

          {/* Payment Status Display */}
          {paymentStatus && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg mb-4">
              <h3 className="font-semibold text-purple-800 mb-2">
                💳 Payment Status
              </h3>
              <p className="text-purple-700">{paymentStatus}</p>
            </div>
          )}

          {/* Signature Display */}
          {signature && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
              <h3 className="font-semibold text-green-800 mb-2">Signature</h3>
              <pre className="text-xs text-green-700 mt-2 p-2 bg-green-100 rounded overflow-auto">
                {signature}
              </pre>
              {recoveredAddress && (
                <div className="mt-2 text-green-900 text-sm">
                  <strong>Recovered Address:</strong> {recoveredAddress}
                </div>
              )}
            </div>
          )}

          {/* Addresses and Balances Display */}
          {addresses.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">
                Addresses & Balances
              </h3>
              <ul className="space-y-3">
                {addresses.map(
                  ({
                    key,
                    address,
                    balance,
                    isRegistered,
                    registeredBy,
                    usdcAllowance,
                    payerUsdcBalance,
                  }) => (
                    <li key={key} className="p-3 bg-blue-100 rounded-lg">
                      <div className="font-mono text-sm text-blue-900 mb-1">
                        <strong>Key {key}:</strong> {address}
                      </div>
                      <div className="text-blue-700 text-sm mb-2">
                        ETH Balance: {balance} ETH
                      </div>

                      {/* HaLo Registration Status */}
                      <div className="border-t border-blue-200 pt-2">
                        {isRegistered ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-green-600 font-semibold">
                                ✅ Registered
                              </span>
                              <span className="text-xs text-gray-600">
                                for HaLo payments
                              </span>
                            </div>
                            <div className="text-xs text-gray-700">
                              <strong>Registered by:</strong> {registeredBy}
                            </div>
                            <div className="text-xs text-gray-700">
                              <strong>USDC Allowance:</strong> {usdcAllowance}{" "}
                              USDC
                            </div>
                            <div className="text-xs text-gray-700">
                              <strong>Payer USDC Balance:</strong>{" "}
                              {payerUsdcBalance} USDC
                              {usdcAllowance &&
                                parseFloat(usdcAllowance) > 0 &&
                                payerUsdcBalance &&
                                parseFloat(payerUsdcBalance) > 0 && (
                                  <span className="ml-2 text-green-600 font-semibold">
                                    💰 Ready for payments
                                  </span>
                                )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-500">
                              ⚪ Not registered
                            </span>
                            <span className="text-xs text-gray-500">
                              for HaLo payments
                            </span>
                          </div>
                        )}
                      </div>
                    </li>
                  )
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
