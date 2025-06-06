import { WalletInfo } from "../types/wordle";

export const getPaymentHint = async (walletInfo: WalletInfo): Promise<{ data: unknown; hint: string } | null> => {
  try {
    const response = await fetch('/api/payment-hint', {
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
      throw new Error(errorData.error || 'Failed to get payment hint');
    }

    const result = await response.json();
    return { data: result.data, hint: result.hint };
  } catch (error) {
    console.error('Error getting payment hint:', error);
    throw error;
  }
};
