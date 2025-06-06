import { WalletInfo } from '../types/wordle';
// Import dotenv to ensure environment variables are loaded
import 'dotenv/config';

// Wallet state variables
let walletAddress: string | null = null;

/**
 * Create or get a CDP wallet for the user - now using server API
 * @param username The username to use for the wallet (from Passage)
 */
export async function createCDPWallet(username: string): Promise<WalletInfo> {
  try {
    console.log(`Attempting to get or create CDP wallet for account: ${username}`);
    
    // Fix the URL by using absolute path with origin
    const origin = window.location.origin;
    const response = await fetch(`${origin}/api/wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'createWallet',
        username: username,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error creating wallet');
    }
    
    const walletData = await response.json();
    console.log(`CDP Wallet ready with address: ${walletData.address}`);
    
    // Store wallet address for future reference
    walletAddress = walletData.address;
    
    return walletData;
  } catch (error) {
    console.error('Error creating CDP wallet:', error);
    
    // Provide more detailed error information to help debugging
    if (error instanceof Error) {
      console.error(`Error message: ${error.message}`);
    }
    
    throw error;
  }
}

/**
 * Initialize the CDP wallet (alternative name for createCDPWallet)
 * @param username The username to use for the wallet (from Passage)
 */
export async function initializeWallet(username: string): Promise<string | null> {
  try {
    const walletInfo = await createCDPWallet(username);
    return walletInfo.address;
  } catch (error) {
    console.error('Error initializing wallet:', error);
    return null;
  }
}

/**
 * Get the wallet balance information
 * @param address The wallet address to check
 */
export async function getWalletBalance(address: string): Promise<{ balance: string, usdcBalance: string }> {
  try {
    // Fix the URL by using absolute path with origin
    const origin = window.location.origin;
    const response = await fetch(`${origin}/api/wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'getBalance',
        address,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error getting wallet balance');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    return {
      balance: "0",
      usdcBalance: "0"
    };
  }
}

/**
 * Get ETH balance
 * @param address The wallet address
 */
export async function getBalance(address: string): Promise<string> {
  try {
    const balances = await getWalletBalance(address);
    return balances.balance;
  } catch (error) {
    console.error('Error getting balance:', error);
    return '0';
  }
}

/**
 * Get USDC balance for an address
 * @param address The wallet address
 */
export async function getUSDCBalance(address: string): Promise<string> {
  try {
    const balances = await getWalletBalance(address);
    return balances.usdcBalance;
  } catch (error) {
    console.error('Error getting USDC balance:', error);
    return '0';
  }
}

/**
 * Process a user message related to wallet functions
 * @param userMessage The user's message
 */
export async function processMessage(userMessage: string): Promise<string> {
  try {
    // Handle basic wallet queries
    const message = userMessage.toLowerCase();
    
    if (message.includes('wallet') || message.includes('address')) {
      return `Your wallet address is: ${walletAddress || 'Not connected'}`;
    }
    
    if (message.includes('balance')) {
      if (!walletAddress) return "Please connect your wallet first.";
      
      const ethBalance = await getBalance(walletAddress);
      const usdcBalance = await getUSDCBalance(walletAddress);
      
      return `Your wallet balance is: ${usdcBalance} USDC (for gameplay) and ${ethBalance} ETH (for gas fees).`;
    }
    
    if (message.includes('funds') || message.includes('faucet')) {
      return "To get test USDC for Base Sepolia, you can request funds using the 'request funds' button. You'll need some ETH for gas fees as well, which you can get from the Base Sepolia faucet.";
    }
    
    // Default fallback for any other message
    return "I'm your blockchain assistant. You can ask about your wallet, balance, or how to get test funds.";
  } catch (error) {
    console.error('Error processing message:', error);
    return `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Request testnet funds from faucet
 * @param address The wallet address to fund
 */
export async function requestTestnetFunds(address: string): Promise<{ 
  success: boolean;
  txHash?: string;
  error?: string;
}> {
  try {
    // Call the server-side API endpoint (we would implement this endpoint)
    // For now, return mock data
    console.log(`Requesting testnet funds for ${address}`);
    
    // Simulate a delay for the API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return a mock transaction hash
    const txHash = `0x${Math.random().toString(16).substring(2, 62)}`;
    
    return {
      success: true,
      txHash,
    };
  } catch (error) {
    console.error('Error requesting testnet funds:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if wallet is initialized
 */
export function isWalletInitialized(): boolean {
  return walletAddress !== null;
}

/**
 * Get the current wallet address
 */
export function getWalletAddress(): string | null {
  return walletAddress;
}

/**
 * Format address for display
 * @param address The address to format
 */
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
} 