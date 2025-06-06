import { WalletInfo } from "../types/wordle";

interface PaymentDetails {
  walletAddress: string;
  timestamp: string;
  
  // CDP Integration Status
  cdpAccountCreated: boolean;
  viemAdapterCreated: boolean;
  
  // X402 Payment Protocol Details
  x402PaymentAttempted: boolean;
  x402ProtocolVersion: number | null;
  paymentScheme: string | null;
  paymentNetwork: string | null;
  paymentResource: string;
  
  // EIP-712 Signing Details
  eip712SigningAttempted: boolean;
  eip712SigningSuccessful: boolean;
  
  // Payment Settlement Details  
  paymentSuccessful: boolean;
  transactionHash: string | null;
  networkId: string | null;
  settlementDetails: Record<string, unknown> | null;
  
  // Payment Execution Response (from X402 facilitator)
  paymentExecutionResponse: Record<string, unknown> | null;
  
  // Error Handling
  fallbackUsed: boolean;
  errorMessage: string | null;
  signingEvents: string[];
  
  // Payment Requirements & Payload (X402 spec)
  paymentRequirements: Record<string, unknown> | null;
  paymentPayload: Record<string, unknown> | null;
  
  // Additional X402 Details
  maxAmountRequired: string | null;
  assetAddress: string | null;
  payToAddress: string | null;
  paymentDescription: string | null;
}

interface PaymentHintData {
  paymentDetails?: PaymentDetails;
  message?: string;
}

export const getPaymentHint = async (walletInfo: WalletInfo): Promise<{ 
  data: PaymentHintData; 
  hint: string; 
  paymentDetails?: PaymentDetails;
} | null> => {
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
    return { 
      data: result.data, 
      hint: result.hint, 
      paymentDetails: result.paymentDetails 
    };
  } catch (error) {
    console.error('Error getting payment hint:', error);
    throw error;
  }
};
