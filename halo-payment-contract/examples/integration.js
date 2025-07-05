/**
 * Example integration script for HaloPayment contract
 * This shows how to integrate the contract with a frontend application
 */

// Example contract ABI (simplified)
const HALO_PAYMENT_ABI = [
    "function registerHaloAddress(address haloAddress) external",
    "function executePayment(address payer, address merchant, uint256 amount, uint256 nonce, bytes calldata signature) external",
    "function executePaymentFromHalo(address haloAddress, address merchant, uint256 amount, uint256 nonce, bytes calldata signature) external",
    "function getPaymentMessageHash(address payer, address merchant, uint256 amount, uint256 nonce) external view returns (bytes32)",
    "function getEthSignedMessageHash(address payer, address merchant, uint256 amount, uint256 nonce) external view returns (bytes32)",
    "function getAuthorizedHaloAddress(address user) external view returns (address)",
    "function getPayerFromHaloAddress(address haloAddress) external view returns (address)",
    "function isNonceUsed(address payer, uint256 nonce) external view returns (bool)"
];

const USDC_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)"
];

// Contract addresses (Sepolia)
const HALO_PAYMENT_ADDRESS = "0x..."; // Deploy and update this
const USDC_ADDRESS = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";

/**
 * Step 1: User Setup
 * User approves the contract and registers their HaLo address
 */
async function setupUser(provider, userAddress, haloAddress) {
    const signer = provider.getSigner(userAddress);

    // Initialize contracts
    const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
    const haloPaymentContract = new ethers.Contract(HALO_PAYMENT_ADDRESS, HALO_PAYMENT_ABI, signer);

    console.log("Setting up user...");

    // 1. Approve contract for USDC spending
    console.log("Approving USDC spending...");
    const approveTx = await usdcContract.approve(
        HALO_PAYMENT_ADDRESS,
        ethers.constants.MaxUint256
    );
    await approveTx.wait();
    console.log("✅ USDC approved");

    // 2. Register HaLo address
    console.log("Registering HaLo address...");
    const registerTx = await haloPaymentContract.registerHaloAddress(haloAddress);
    await registerTx.wait();
    console.log("✅ HaLo address registered");

    return { usdcContract, haloPaymentContract };
}

/**
 * Step 2: Merchant Payment Flow
 * Merchant scans HaLo chip and executes payment
 */
async function executePayment(provider, merchantAddress, payerAddress, amount) {
    const signer = provider.getSigner(merchantAddress);
    const haloPaymentContract = new ethers.Contract(HALO_PAYMENT_ADDRESS, HALO_PAYMENT_ABI, signer);

    console.log("Executing payment...");

    // Generate unique nonce
    const nonce = Date.now();

    // 1. Get message hash to sign
    const messageHash = await haloPaymentContract.getPaymentMessageHash(
        payerAddress,
        merchantAddress,
        amount,
        nonce
    );

    console.log("Message hash:", messageHash);

    // 2. Get HaLo signature (this would be done with NFC scan)
    const signature = await getHaloSignature(messageHash);

    // 3. Execute payment
    console.log("Executing payment transaction...");
    const paymentTx = await haloPaymentContract.executePayment(
        payerAddress,
        merchantAddress,
        amount,
        nonce,
        signature
    );

    const receipt = await paymentTx.wait();
    console.log("✅ Payment executed:", receipt.transactionHash);

    return receipt;
}

/**
 * Step 2b: Alternative Payment Flow using HaLo Address
 * Merchant scans HaLo chip and executes payment without knowing payer address
 */
async function executePaymentFromHalo(provider, merchantAddress, haloAddress, amount) {
    const signer = provider.getSigner(merchantAddress);
    const haloPaymentContract = new ethers.Contract(HALO_PAYMENT_ADDRESS, HALO_PAYMENT_ABI, signer);

    console.log("Executing payment from HaLo address...");

    // 1. Get the payer address from HaLo address
    const payerAddress = await haloPaymentContract.getPayerFromHaloAddress(haloAddress);
    if (payerAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error("HaLo address not registered");
    }
    console.log("Found payer address:", payerAddress);

    // Generate unique nonce
    const nonce = Date.now();

    // 2. Get message hash to sign
    const messageHash = await haloPaymentContract.getPaymentMessageHash(
        payerAddress,
        merchantAddress,
        amount,
        nonce
    );

    console.log("Message hash:", messageHash);

    // 3. Get HaLo signature (this would be done with NFC scan)
    const signature = await getHaloSignature(messageHash);

    // 4. Execute payment using HaLo address
    console.log("Executing payment transaction...");
    const paymentTx = await haloPaymentContract.executePaymentFromHalo(
        haloAddress,
        merchantAddress,
        amount,
        nonce,
        signature
    );

    const receipt = await paymentTx.wait();
    console.log("✅ Payment executed:", receipt.transactionHash);

    return receipt;
}

/**
 * Get payer address from HaLo address
 */
async function getPayerFromHaloAddress(provider, haloAddress) {
    const haloPaymentContract = new ethers.Contract(HALO_PAYMENT_ADDRESS, HALO_PAYMENT_ABI, provider);

    const payerAddress = await haloPaymentContract.getPayerFromHaloAddress(haloAddress);

    if (payerAddress === '0x0000000000000000000000000000000000000000') {
        console.log("HaLo address not registered");
        return null;
    }

    console.log("Payer address for HaLo", haloAddress, ":", payerAddress);
    return payerAddress;
}

/**
 * Get HaLo signature using libhalo
 * This function simulates the NFC interaction
 */
async function getHaloSignature(messageHash) {
    console.log("Scanning HaLo chip...");

    try {
        // Import libhalo dynamically
        const { execHaloCmdWeb } = await import("@arx-research/libhalo/api/web");

        // Execute HaLo command to sign the message
        const result = await execHaloCmdWeb({
            name: "sign",
            keyNo: 1, // Use key 1
            digest: messageHash.slice(2), // Remove 0x prefix
        });

        if (!result.signature || !result.signature.ether) {
            throw new Error("No signature received from HaLo chip");
        }

        console.log("✅ HaLo signature received");
        return result.signature.ether;

    } catch (error) {
        console.error("HaLo signature error:", error);
        throw error;
    }
}

/**
 * Check payment status and balances
 */
async function checkStatus(provider, userAddress, merchantAddress) {
    const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
    const haloPaymentContract = new ethers.Contract(HALO_PAYMENT_ADDRESS, HALO_PAYMENT_ABI, provider);

    console.log("Checking status...");

    // Check balances
    const userBalance = await usdcContract.balanceOf(userAddress);
    const merchantBalance = await usdcContract.balanceOf(merchantAddress);

    // Check allowance
    const allowance = await usdcContract.allowance(userAddress, HALO_PAYMENT_ADDRESS);

    // Check registered HaLo address
    const haloAddress = await haloPaymentContract.getAuthorizedHaloAddress(userAddress);

    console.log("📊 Status:");
    console.log(`User USDC balance: ${ethers.utils.formatUnits(userBalance, 6)} USDC`);
    console.log(`Merchant USDC balance: ${ethers.utils.formatUnits(merchantBalance, 6)} USDC`);
    console.log(`Contract allowance: ${ethers.utils.formatUnits(allowance, 6)} USDC`);
    console.log(`Registered HaLo address: ${haloAddress}`);

    return {
        userBalance,
        merchantBalance,
        allowance,
        haloAddress
    };
}

/**
 * Example usage
 */
async function main() {
    // Initialize provider (example with ethers.js)
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    // Example addresses
    const userAddress = "0x..."; // User's wallet address
    const merchantAddress = "0x..."; // Merchant's wallet address
    const haloAddress = "0x..."; // HaLo chip address

    try {
        // Step 1: Setup user
        await setupUser(provider, userAddress, haloAddress);

        // Step 2: Execute payment (1 USDC) - Method 1: Using payer address
        const amount = ethers.utils.parseUnits("1", 6); // 1 USDC
        await executePayment(provider, merchantAddress, userAddress, amount);

        // Step 2b: Alternative method - Using HaLo address directly
        console.log("\n--- Alternative payment method ---");
        const amount2 = ethers.utils.parseUnits("0.5", 6); // 0.5 USDC
        await executePaymentFromHalo(provider, merchantAddress, haloAddress, amount2);

        // Step 3: Check status
        await checkStatus(provider, userAddress, merchantAddress);

    } catch (error) {
        console.error("Error:", error);
    }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        setupUser,
        executePayment,
        executePaymentFromHalo,
        getPayerFromHaloAddress,
        getHaloSignature,
        checkStatus,
        HALO_PAYMENT_ABI,
        USDC_ABI,
        HALO_PAYMENT_ADDRESS,
        USDC_ADDRESS
    };
}

// Example usage in browser
if (typeof window !== 'undefined') {
    window.HaloPaymentIntegration = {
        setupUser,
        executePayment,
        getHaloSignature,
        checkStatus,
        main
    };
} 