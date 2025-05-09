import { AgentKit, SmartWalletProvider, walletActionProvider } from '@coinbase/agentkit';
import { getVercelAITools } from '@coinbase/agentkit-vercel-ai-sdk';
import { Message, generateId } from 'ai';
import { Address, Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

// Store wallet data
let walletData: {
  privateKey?: Hex;
  smartWalletAddress?: Address;
} = {};

// Initialize agent kit with smart wallet
let agentKitInstance: AgentKit | null = null;

// Base Sepolia USDC contract address
const BASE_SEPOLIA_USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

// Minimal ERC20 ABI for balance checking
const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [{"name": "_owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "balance", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "type": "function"
  }
];

/**
 * Initialize the wallet and AgentKit
 */
export async function initializeWallet(privateKey?: Hex) {
  try {
    // Use provided key or stored key
    const key = privateKey || walletData.privateKey;
    if (!key) {
      throw new Error('No private key provided');
    }

    const signer = privateKeyToAccount(key);
    
    // Configure Smart Wallet Provider using environment variables
    const walletProvider = await SmartWalletProvider.configureWithWallet({
      networkId: process.env.NETWORK_ID || 'base-sepolia',
      signer,
      smartWalletAddress: walletData.smartWalletAddress as `0x${string}` | undefined,
      paymasterUrl: undefined, // No sponsoring
      cdpApiKeyName: process.env.CDP_API_KEY_CDP_API_KEY_NAME,
      cdpApiKeyPrivateKey: process.env.PRIVATE_KEY,
    });

    // Create AgentKit instance
    agentKitInstance = await AgentKit.from({
      walletProvider,
      actionProviders: [
        walletActionProvider(),
      ],
    });

    // Save wallet data
    const smartWalletAddress = await walletProvider.getAddress();
    walletData = {
      privateKey: key,
      smartWalletAddress: smartWalletAddress as Address,
    };

    return {
      address: smartWalletAddress,
      agentKit: agentKitInstance,
    };
  } catch (error) {
    console.error('Failed to initialize wallet:', error);
    throw error;
  }
}

/**
 * Get ETH balance (legacy function, kept for backward compatibility)
 */
export async function getBalance(address: Address): Promise<string> {
  if (!agentKitInstance) {
    throw new Error('Wallet not initialized');
  }

  try {
    // Access wallet provider safely
    // @ts-ignore - We know this exists but TypeScript doesn't
    const walletProvider = agentKitInstance.walletProvider;
    const balanceWei = await walletProvider.getBalance({ 
      address: address as `0x${string}` 
    });

    // Format balance from wei to ETH
    const balanceEth = Number(balanceWei) / 1e18;
    return balanceEth.toFixed(4);
  } catch (error) {
    console.error('Error getting ETH balance:', error);
    return '0';
  }
}

/**
 * Get USDC balance for an address
 */
export async function getUSDCBalance(address: Address): Promise<string> {
  if (!agentKitInstance) {
    throw new Error('Wallet not initialized');
  }

  try {
    // Access wallet provider safely
    // @ts-ignore - We know this exists but TypeScript doesn't
    const walletProvider = agentKitInstance.walletProvider;
    const provider = walletProvider.provider;
    
    // Call the balanceOf function
    const balanceData = await provider.call({
      to: BASE_SEPOLIA_USDC_ADDRESS as `0x${string}`,
      data: `0x70a08231000000000000000000000000${address.substring(2)}`, // balanceOf(address)
    });
    
    // Convert the hex balance to a number
    const balanceHex = balanceData.toString();
    const balanceInt = parseInt(balanceHex, 16);
    
    // USDC has 6 decimals
    const balance = balanceInt / 1e6;
    return balance.toFixed(2);
  } catch (error) {
    console.error('Error getting USDC balance:', error);
    return '0';
  }
}

/**
 * Process a user message using AgentKit
 */
export async function processMessage(
  userMessage: string,
  previousMessages: Message[] = []
): Promise<string> {
  if (!agentKitInstance) {
    throw new Error('Wallet not initialized');
  }

  try {
    // Get the tools from AgentKit for AI SDK
    const tools = getVercelAITools(agentKitInstance);
    
    // Format previous messages for AI SDK
    const formattedMessages = previousMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Add the current user message
    formattedMessages.push({
      role: 'user',
      content: userMessage
    });
    
    // Try using generateText, but handle errors gracefully
    try {
      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        system: 'You are a helpful assistant for a Wordle game that can interact with the blockchain. You can check balances, request testnet funds, and answer questions about the Base Sepolia testnet. Important: The game requires USDC tokens instead of ETH to play. Be helpful, friendly, and concise with your responses.',
        messages: formattedMessages,
        tools,
        maxSteps: 5, // Allow multiple steps for tool usage
        temperature: 0.7,
      });
      
      return text;
    } catch (llmError) {
      console.error('Error with LLM:', llmError);
      
      // Fallback to simpler implementation that doesn't rely on AI SDK
      if (userMessage.toLowerCase().includes('balance') || 
          userMessage.toLowerCase().includes('wallet') ||
          userMessage.toLowerCase().includes('usdc') ||
          userMessage.toLowerCase().includes('address')) {
        
        // Important: Get the signer address (MetaMask wallet) instead of the smart wallet address
        // The signer address is what's displayed in the UI
        // @ts-ignore - Access private field
        const walletProvider = agentKitInstance.walletProvider;
        // Get the signer address from the wallet provider
        // @ts-ignore - Access private field
        const signerAddress = await walletProvider.signer.getAddress();
        
        // Get both ETH and USDC balances
        const ethBalance = await getBalance(signerAddress as Address);
        const usdcBalance = await getUSDCBalance(signerAddress as Address);
        
        return `Your wallet address is ${signerAddress} with balances of:\n- ${usdcBalance} USDC (required for gameplay)\n- ${ethBalance} ETH (used for gas fees)\n\nOn Base Sepolia testnet.`;
      }
      
      if (userMessage.toLowerCase().includes('fund') || 
          userMessage.toLowerCase().includes('faucet')) {
        return `You need USDC tokens on Base Sepolia to play this game. To get USDC, you can use the "Get Funds" button, which will attempt to mint test USDC to your wallet. You'll also need a small amount of ETH for transaction fees, which you can get from faucet.sepolia.dev.`;
      }
      
      if (userMessage.toLowerCase().includes('help')) {
        return `This is a Wordle game with blockchain integration that requires USDC tokens on Base Sepolia to play. Try to guess the 5-letter word in 6 attempts. After each guess, you'll see which letters are correct (green), present but in the wrong position (yellow), or not in the word (gray).`;
      }
      
      return `Try guessing a 5-letter word! You need USDC tokens to play. Ask for 'help' if you need assistance.`;
    }
  } catch (error) {
    console.error('Error processing message:', error);
    return `I encountered an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Request testnet funds from faucet
 */
export async function requestTestnetFunds(address: Address): Promise<{ 
  success: boolean;
  txHash?: string;
  error?: string;
}> {
  if (!agentKitInstance) {
    throw new Error('Wallet not initialized');
  }

  try {
    // Call a custom faucet API for USDC tokens (example)
    // This would need to be implemented or replaced with an actual USDC faucet
    const response = await fetch('https://faucet-api.basesepolia.coinbase.com/api/v1/mint-usdc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });
    
    const data = await response.json();
    
    if (data.txHash) {
      return {
        success: true,
        txHash: data.txHash,
      };
    } else {
      return {
        success: false,
        error: data.error || 'Unknown error',
      };
    }
  } catch (error) {
    console.error('Error requesting testnet funds:', error);
    
    // Fallback: If the faucet API is not available, provide a helpful error message
    return {
      success: false,
      error: 'USDC faucet API not available. Please mint test USDC tokens using a Base Sepolia USDC faucet.',
    };
  }
}

// Function to check if wallet is initialized
export function isWalletInitialized(): boolean {
  return agentKitInstance !== null;
}

// Get the current wallet address
export function getWalletAddress(): Address | undefined {
  return walletData.smartWalletAddress;
} 