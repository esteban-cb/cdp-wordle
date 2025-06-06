import { NextRequest, NextResponse } from 'next/server';
import { CdpClient } from '@coinbase/cdp-sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    console.log(`Server: Requesting testnet funds for wallet: ${walletAddress}`);
    
    // Initialize CDP client
    const cdp = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_ID,
      apiKeySecret: process.env.CDP_API_KEY_SECRET,
      walletSecret: process.env.CDP_WALLET_SECRET?.trim(),
    });
    
    try {
      // Request testnet ETH and USDC using the official CDP SDK method
      const ethFaucetResp = await cdp.evm.requestFaucet({
        address: walletAddress,
        network: "base-sepolia",
        token: "eth",
      });
      
      console.log('Server: ETH faucet request successful:', ethFaucetResp);
      
      // Also request USDC testnet funds
      let usdcFaucetResp = null;
      try {
        usdcFaucetResp = await cdp.evm.requestFaucet({
          address: walletAddress,
          network: "base-sepolia",
          token: "usdc",
        });
        console.log('Server: USDC faucet request successful:', usdcFaucetResp);
      } catch (usdcError) {
        console.log('Server: USDC faucet request failed:', usdcError);
      }
      
      const message = usdcFaucetResp 
        ? `✅ Successfully requested testnet funds!\n\n🔸 ETH Transaction: ${ethFaucetResp.transactionHash}\n🔸 USDC Transaction: ${usdcFaucetResp.transactionHash}\n\nView transactions:\n• ETH: https://sepolia.basescan.org/tx/${ethFaucetResp.transactionHash}\n• USDC: https://sepolia.basescan.org/tx/${usdcFaucetResp.transactionHash}\n\nNote: It may take a few moments for the funds to appear in your wallet.`
        : `✅ Successfully requested testnet ETH! (USDC request failed)\n\nETH Transaction Hash: ${ethFaucetResp.transactionHash}\n\nYou can view the transaction at: https://sepolia.basescan.org/tx/${ethFaucetResp.transactionHash}\n\nNote: It may take a few moments for the ETH to appear in your wallet.`;
      
      return NextResponse.json({
        success: true,
        message: message,
        ethTransactionHash: ethFaucetResp.transactionHash,
        usdcTransactionHash: usdcFaucetResp?.transactionHash,
        walletAddress: walletAddress,
        ethExplorerUrl: `https://sepolia.basescan.org/tx/${ethFaucetResp.transactionHash}`,
        usdcExplorerUrl: usdcFaucetResp ? `https://sepolia.basescan.org/tx/${usdcFaucetResp.transactionHash}` : null
      });
      
    } catch (faucetError) {
      console.error('Server: Faucet request failed:', faucetError);
      
             // If faucet fails, provide manual instructions
       const fallbackMessage = `⚠️ Automatic faucet request failed. Please get funds manually:

🌟 **Base Sepolia Faucet**: https://www.coinbase.com/faucets/base-sepolia-faucet

Instructions:
1. Visit the faucet link above
2. Paste your address: ${walletAddress}
3. Request both ETH (for gas fees) and USDC (for gameplay)

💡 **Alternative USDC Sources:**
• Uniswap testnet swaps
• Bridge from other testnets
• Community Discord/Telegram faucets

Error: ${faucetError instanceof Error ? faucetError.message : 'Unknown error'}`;
      
      return NextResponse.json({
        success: false,
        message: fallbackMessage,
        walletAddress: walletAddress,
        faucetUrl: 'https://www.coinbase.com/faucets/base-sepolia-faucet',
        error: faucetError instanceof Error ? faucetError.message : 'Faucet request failed'
      });
    }

  } catch (error) {
    console.error('Server: Error requesting testnet funds:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to request testnet funds',
        success: false
      },
      { status: 500 }
    );
  }
} 