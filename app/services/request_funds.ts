import { WalletInfo } from "../types/wordle";

export const requestTestnetFunds = async (walletInfo: WalletInfo): Promise<{ success: boolean; message: string } | null> => {
  try {
    const response = await fetch('/api/request-testnet-funds', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: walletInfo.address,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to request testnet funds');
    }

    const result = await response.json();
    return { success: result.success, message: result.message };
  } catch (error) {
    console.error('Error requesting testnet funds:', error);
    throw error;
  }
}; 