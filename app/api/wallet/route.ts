import { NextRequest, NextResponse } from 'next/server';
import { CdpClient } from '@coinbase/cdp-sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Base Sepolia USDC contract address
const BASE_SEPOLIA_USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

// Initialize CDP client on the server-side where environment variables are accessible
let cdpClient: CdpClient | undefined = undefined;

// Function to get account balances using direct RPC calls
async function getAccountBalances(address: string): Promise<{ ethBalance: string; usdcBalance: string }> {
  try {
    // Use Base Sepolia RPC endpoint
    const rpcUrl = 'https://sepolia.base.org';
    
    // Get ETH balance
    const ethBalanceResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: 1,
      }),
    });
    
    const ethBalanceData = await ethBalanceResponse.json();
    const ethBalanceWei = parseInt(ethBalanceData.result || '0x0', 16);
    const ethBalance = (ethBalanceWei / 1e18).toFixed(4);

    // Get USDC balance (ERC-20 balanceOf call)
    const usdcCallData = `0x70a08231000000000000000000000000${address.substring(2)}`;
    
    const usdcBalanceResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [
          {
            to: BASE_SEPOLIA_USDC_ADDRESS,
            data: usdcCallData,
          },
          'latest',
        ],
        id: 2,
      }),
    });
    
    const usdcBalanceData = await usdcBalanceResponse.json();
    const usdcBalanceRaw = parseInt(usdcBalanceData.result || '0x0', 16);
    const usdcBalance = (usdcBalanceRaw / 1e6).toFixed(2); // USDC has 6 decimals

    return {
      ethBalance,
      usdcBalance
    };
  } catch (error) {
    console.error('Error fetching account balances:', error);
    return {
      ethBalance: "0.00",
      usdcBalance: "0.00"
    };
  }
}

try {
  console.log("Server: Initializing CDP client...");
  console.log("CDP_API_KEY_ID exists:", !!process.env.CDP_API_KEY_ID);
  console.log("CDP_API_KEY_SECRET exists:", !!process.env.CDP_API_KEY_SECRET);
  console.log("CDP_WALLET_SECRET exists:", !!process.env.CDP_WALLET_SECRET);
  
  cdpClient = new CdpClient();
  console.log("Server: CDP client initialized successfully");
} catch (error) {
  console.error('Server: Error initializing CDP client:', error);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, username, address } = body;
    
    // Initialize CDP client if not already initialized
    if (!cdpClient) {
      try {
        console.log("Server: Attempting to reinitialize CDP client...");
        cdpClient = new CdpClient();
        console.log("Server: CDP client reinitialized successfully");
      } catch (error) {
        console.error('Server: Failed to reinitialize CDP client:', error);
        return NextResponse.json(
          { error: 'CDP client initialization failed. Check server logs for details.' },
          { status: 500 }
        );
      }
    }
    
    if (action === 'createWallet') {
      if (!username) {
        return NextResponse.json(
          { error: 'Username is required for wallet creation' },
          { status: 400 }
        );
      }
      
      console.log(`Server: Creating/retrieving wallet for user: ${username}`);
      
      try {
        // Use the username directly as the account name per CDP documentation
        const evmAccount = await cdpClient.evm.getOrCreateAccount({
          name: username
        });
        
        console.log(`Server: Wallet ready with address: ${evmAccount.address}`);
        
        // Get actual balances
        try {
          const balances = await getAccountBalances(evmAccount.address);
          return NextResponse.json({
            address: evmAccount.address,
            balance: balances.ethBalance,
            usdcBalance: balances.usdcBalance,
            isConnected: true
          });
        } catch (balanceError) {
          console.error('Server: Error fetching balances:', balanceError);
          // Fall back to zeros if balance fetching fails
          return NextResponse.json({
            address: evmAccount.address,
            balance: "0.00",
            usdcBalance: "0.00",
            isConnected: true
          });
        }
      } catch (error) {
        console.error('Server: Error in CDP wallet creation:', error);
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Unknown wallet creation error' },
          { status: 500 }
        );
      }
    }
    
    if (action === 'getBalance') {
      if (!address) {
        return NextResponse.json(
          { error: 'Address is required for balance check' },
          { status: 400 }
        );
      }
      
      try {
        const balances = await getAccountBalances(address);
        return NextResponse.json({
          balance: balances.ethBalance,
          usdcBalance: balances.usdcBalance
        });
      } catch (error) {
        console.error('Server: Error getting balances:', error);
        return NextResponse.json({
          balance: "0.00",
          usdcBalance: "0.00"
        });
      }
    }
    
    return NextResponse.json(
      { error: `Invalid action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    console.error('Server: Error in wallet API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 