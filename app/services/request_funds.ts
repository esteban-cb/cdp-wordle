import { WalletInfo, NetworkConfig } from "../types/wordle";

interface RequestFundsResponse {
  success: boolean;
  message?: string;
  ethTransactionHash?: string;
  usdcTransactionHash?: string;
  walletAddress?: string;
  network?: NetworkConfig;
  ethExplorerUrl?: string;
  usdcExplorerUrl?: string;
  faucetUrl?: string;
  error?: string;
}

/**
 * Request testnet funds from the faucet
 * @param walletInfo The wallet information
 * @param network The current network configuration
 * @returns Promise with request funds response
 */
export async function requestTestnetFunds(
  walletInfo: WalletInfo,
  network?: NetworkConfig
): Promise<RequestFundsResponse> {
  try {
    console.log("Requesting testnet funds for wallet:", walletInfo.address);

    const response = await fetch("/api/request-testnet-funds", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        walletAddress: walletInfo.address,
        network: network?.id || "base-sepolia",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to request testnet funds");
    }

    const data = await response.json();
    console.log("Request funds response:", data);

    return data;
  } catch (error) {
    console.error("Error requesting testnet funds:", error);
    throw error;
  }
}
