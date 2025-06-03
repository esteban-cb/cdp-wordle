import { NextRequest, NextResponse } from 'next/server';
import { CdpClient } from '@coinbase/cdp-sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize CDP client on the server-side where environment variables are accessible
let cdpClient: CdpClient | undefined = undefined;

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
        
        // Return wallet info with mocked balances for now
        return NextResponse.json({
          address: evmAccount.address,
          balance: "0.01",
          usdcBalance: "10.00",
          isConnected: true
        });
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
      
      // For now, return mock values - in production we would implement actual balance checking
      return NextResponse.json({
        balance: "0.01",
        usdcBalance: "10.00"
      });
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