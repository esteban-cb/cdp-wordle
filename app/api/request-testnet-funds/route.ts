import { NextRequest, NextResponse } from "next/server";
import { CdpClient } from "@coinbase/cdp-sdk";
import dotenv from "dotenv";
import { NETWORKS, DEFAULT_NETWORK } from "../../config/networks";

// Load environment variables
dotenv.config();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, network } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Use provided network or default to base-sepolia
    const networkId = network || "base-sepolia";
    const networkConfig = NETWORKS[networkId] || DEFAULT_NETWORK;

    console.log(
      `Server: Requesting funds for wallet: ${walletAddress} on network: ${networkConfig.name}`
    );

    // Check if this is a testnet network (faucet only works on testnets)
    if (!networkConfig.isTestnet) {
      return NextResponse.json(
        {
          error:
            "Faucet is only available for testnet networks. Please switch to Base Sepolia testnet.",
          network: networkConfig.name,
        },
        { status: 400 }
      );
    }

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
        network: networkId,
        token: "eth",
      });

      console.log("Server: ETH faucet request successful:", ethFaucetResp);

      // Also request USDC testnet funds
      let usdcFaucetResp = null;
      try {
        usdcFaucetResp = await cdp.evm.requestFaucet({
          address: walletAddress,
          network: networkId,
          token: "usdc",
        });
        console.log("Server: USDC faucet request successful:", usdcFaucetResp);
      } catch (usdcError) {
        console.log("Server: USDC faucet request failed:", usdcError);
      }

      const message = usdcFaucetResp
        ? `✅ Successfully requested testnet funds on ${networkConfig.name}!\n\n🔸 ETH Transaction: ${ethFaucetResp.transactionHash}\n🔸 USDC Transaction: ${usdcFaucetResp.transactionHash}\n\nView transactions:\n• ETH: ${networkConfig.blockExplorer}/tx/${ethFaucetResp.transactionHash}\n• USDC: ${networkConfig.blockExplorer}/tx/${usdcFaucetResp.transactionHash}\n\nNote: It may take a few moments for the funds to appear in your wallet.`
        : `✅ Successfully requested testnet ETH on ${networkConfig.name}! (USDC request failed)\n\nETH Transaction Hash: ${ethFaucetResp.transactionHash}\n\nYou can view the transaction at: ${networkConfig.blockExplorer}/tx/${ethFaucetResp.transactionHash}\n\nNote: It may take a few moments for the ETH to appear in your wallet.`;

      return NextResponse.json({
        success: true,
        message: message,
        ethTransactionHash: ethFaucetResp.transactionHash,
        usdcTransactionHash: usdcFaucetResp?.transactionHash,
        walletAddress: walletAddress,
        network: networkConfig,
        ethExplorerUrl: `${networkConfig.blockExplorer}/tx/${ethFaucetResp.transactionHash}`,
        usdcExplorerUrl: usdcFaucetResp
          ? `${networkConfig.blockExplorer}/tx/${usdcFaucetResp.transactionHash}`
          : null,
      });
    } catch (faucetError) {
      console.error("Server: Faucet request failed:", faucetError);

      // If faucet fails, provide manual instructions
      const fallbackMessage = `⚠️ Automatic faucet request failed on ${
        networkConfig.name
      }. Please get funds manually:

🌟 **${networkConfig.name} Faucet**: ${
        networkConfig.faucetUrl || "No faucet available"
      }

Instructions:
1. Visit the faucet link above
2. Paste your address: ${walletAddress}
3. Request both ETH (for gas fees) and USDC (for gameplay)

💡 **Alternative USDC Sources:**
• Uniswap testnet swaps
• Bridge from other testnets
• Community Discord/Telegram faucets

Error: ${faucetError instanceof Error ? faucetError.message : "Unknown error"}`;

      return NextResponse.json({
        success: false,
        message: fallbackMessage,
        walletAddress: walletAddress,
        network: networkConfig,
        faucetUrl: networkConfig.faucetUrl,
        error:
          faucetError instanceof Error
            ? faucetError.message
            : "Faucet request failed",
      });
    }
  } catch (error) {
    console.error("Server: Error requesting testnet funds:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to request testnet funds",
        success: false,
      },
      { status: 500 }
    );
  }
}
