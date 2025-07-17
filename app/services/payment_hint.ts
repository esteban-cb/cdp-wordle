import { WalletInfo, NetworkConfig } from "../types/wordle";

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

interface PaymentHintResponse {
  success: boolean;
  hint?: string;
  paymentDetails?: PaymentDetails;
  network?: NetworkConfig;
  fallback?: boolean;
  data?: any;
  error?: string;
}

/**
 * Get a payment hint from the server using X402 payment protocol
 * @param walletInfo The wallet information
 * @param network The current network configuration
 * @returns Promise with payment hint response
 */
export async function getPaymentHint(
  walletInfo: WalletInfo,
  network?: NetworkConfig
): Promise<PaymentHintResponse> {
  try {
    console.log("Requesting payment hint for wallet:", walletInfo.address);

    const response = await fetch("/api/payment-hint", {
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
      throw new Error(errorData.error || "Failed to get payment hint");
    }

    const data = await response.json();
    console.log("Payment hint response:", data);

    return data;
  } catch (error) {
    console.error("Error getting payment hint:", error);
    throw error;
  }
}
