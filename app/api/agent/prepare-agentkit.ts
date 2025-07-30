import {
  AgentKit,
  cdpApiActionProvider,
  cdpWalletActionProvider,
  CdpWalletProvider,
  erc20ActionProvider,
  pythActionProvider,
  walletActionProvider,
  WalletProvider,
  wethActionProvider,
} from "@coinbase/agentkit";
import * as fs from "fs";

/**
 * AgentKit Integration Route
 *
 * This file is your gateway to integrating AgentKit with your product.
 * It defines the core capabilities of your agent through WalletProvider
 * and ActionProvider configuration.
 *
 * Key Components:
 * 1. WalletProvider Setup:
 *    - Configures the blockchain wallet integration
 *    - Learn more: https://github.com/coinbase/agentkit/tree/main/typescript/agentkit#evm-wallet-providers
 *
 * 2. ActionProviders Setup:
 *    - Defines the specific actions your agent can perform
 *    - Choose from built-in providers or create custom ones:
 *      - Built-in: https://github.com/coinbase/agentkit/tree/main/typescript/agentkit#action-providers
 *      - Custom: https://github.com/coinbase/agentkit/tree/main/typescript/agentkit#creating-an-action-provider
 *
 * # Next Steps:
 * - Explore the AgentKit README: https://github.com/coinbase/agentkit
 * - Experiment with different LLM configurations
 * - Fine-tune agent parameters for your use case
 *
 * ## Want to contribute?
 * Join us in shaping AgentKit! Check out the contribution guide:
 * - https://github.com/coinbase/agentkit/blob/main/CONTRIBUTING.md
 * - https://discord.gg/CDP
 */

// Configure a file to persist the agent's CDP MPC Wallet Data
const WALLET_DATA_FILE = "wallet_data.txt";

/**
 * Prepares the AgentKit and WalletProvider.
 *
 * @function prepareAgentkitAndWalletProvider
 * @param networkId Optional network ID to use (defaults to base-sepolia)
 * @returns {Promise<{ agentkit: AgentKit, walletProvider: WalletProvider }>} The initialized AI agent.
 *
 * @description Handles agent setup
 *
 * @throws {Error} If the agent initialization fails.
 */
export async function prepareAgentkitAndWalletProvider(
  networkId: string = "base-sepolia"
): Promise<{
  agentkit: AgentKit;
  walletProvider: WalletProvider;
}> {
  try {
    // Try to use the existing embedded wallet first
    try {
      const { getCurrentUser } = await import("@coinbase/cdp-core");
      const user = await getCurrentUser();
      
      if (user && user.evmAccounts && user.evmAccounts.length > 0) {
        console.log("🔗 Using existing embedded wallet for AgentKit");
        
        // Use the embedded wallet's address to configure AgentKit
        const walletAddress = user.evmAccounts[0];
        console.log("📍 Embedded wallet address:", walletAddress);
        
        // Initialize WalletProvider with embedded wallet data
        const walletProvider = await CdpWalletProvider.configureWithWallet({
          apiKeyName: process.env.CDP_API_KEY_NAME,
          apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY,
          networkId: networkId,
          // Don't pass wallet data - let it use the authenticated session
        });
        
        return await initializeAgentKitWithProvider(walletProvider);
      }
    } catch (embeddedError) {
      console.log("⚠️ Could not access embedded wallet, falling back to AgentKit wallet:", embeddedError);
    }

    // Fallback: Use AgentKit's own wallet system
    return await initializeAgentKitFallback(networkId);
  } catch (error) {
    console.error("Error initializing agent:", error);
    throw new Error("Failed to initialize agent");
  }
}

// Helper function to initialize AgentKit with a given wallet provider
async function initializeAgentKitWithProvider(walletProvider: any) {
  const agentkit = await AgentKit.from({
    walletProvider,
    actionProviders: [
      wethActionProvider(),
      pythActionProvider(),
      walletActionProvider(),
      erc20ActionProvider(),
      cdpApiActionProvider({
        apiKeyName: process.env.CDP_API_KEY_NAME,
        apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY,
      }),
      cdpWalletActionProvider({
        apiKeyName: process.env.CDP_API_KEY_NAME,
        apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY,
      }),
    ],
  });

  return { agentkit, walletProvider };
}

// Fallback function for AgentKit's own wallet system
async function initializeAgentKitFallback(networkId: string) {
  let walletDataStr: string | null = null;

  // Read existing wallet data if available
  if (fs.existsSync(WALLET_DATA_FILE)) {
    try {
      walletDataStr = fs.readFileSync(WALLET_DATA_FILE, "utf8");
    } catch (error) {
      console.error("Error reading wallet data:", error);
      // Continue without wallet data
    }
  }

  // Initialize WalletProvider: https://docs.cdp.coinbase.com/agentkit/docs/wallet-management
  const walletProvider = await CdpWalletProvider.configureWithWallet({
    apiKeyName: process.env.CDP_API_KEY_NAME,
    apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY,
    networkId: networkId,
    cdpWalletData: walletDataStr || undefined,
  });

  const result = await initializeAgentKitWithProvider(walletProvider);

  // Save wallet data
  const exportedWallet = await walletProvider.exportWallet();
  fs.writeFileSync(WALLET_DATA_FILE, JSON.stringify(exportedWallet));

  return result;
}
