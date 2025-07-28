import { WalletInfo, NetworkConfig } from "../types/wordle";

interface PaymentHintResponse {
  success: boolean;
  hint?: string;
  network?: NetworkConfig;
  error?: string;
}

/**
 * Get a payment hint using the embedded wallet for X402 payments
 * This approach uses the embedded wallet provider for signing instead of server-side CDP SDK
 */
export async function getEmbeddedPaymentHint(
  walletInfo: WalletInfo,
  walletProvider: any, // EIP-1193 provider from embedded wallet
  network?: NetworkConfig
): Promise<PaymentHintResponse> {
  try {
    console.log("Requesting payment hint with embedded wallet:", walletInfo.address);

    // First, get the payment requirements from the backend
    const response = await fetch("/api/payment-hint-embedded", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        walletAddress: walletInfo.address,
        network: network?.id || "base-sepolia",
        action: "get-requirements"
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to get payment requirements");
    }

    const data = await response.json();
    console.log("Payment requirements received:", data);

    // If no payment is required or it's a fallback, return immediately
    if (data.fallback || !data.requiresPayment) {
      return {
        success: true,
        hint: data.hint,
        network: data.network
      };
    }

    // If payment is required, handle X402 flow with embedded wallet
    if (data.requiresPayment && data.paymentRequest) {
      try {
        // Use embedded wallet to sign the payment request
        const signature = await signPaymentRequest(walletProvider, data.paymentRequest);
        
        // Send the signed payment to complete the request
        const paymentResponse = await fetch("/api/payment-hint-embedded", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            walletAddress: walletInfo.address,
            network: network?.id || "base-sepolia",
            action: "complete-payment",
            signature: signature,
            paymentRequest: data.paymentRequest
          }),
        });

        if (!paymentResponse.ok) {
          throw new Error("Payment completion failed");
        }

        const paymentData = await paymentResponse.json();
        return {
          success: true,
          hint: paymentData.hint,
          network: paymentData.network
        };

      } catch (paymentError) {
        console.error("Payment failed, falling back:", paymentError);
        // Fall back to free hint
        return {
          success: true,
          hint: data.hint,
          network: data.network,
          error: "Payment failed, providing free hint"
        };
      }
    }

    return data;
  } catch (error) {
    console.error("Error getting embedded payment hint:", error);
    throw error;
  }
}

/**
 * Sign a payment request using the embedded wallet provider
 */
async function signPaymentRequest(provider: any, paymentRequest: any): Promise<string> {
  try {
    // Ensure we're connected to the right account
    const accounts = await provider.request({ method: 'eth_accounts' });
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts connected");
    }

    const account = accounts[0];
    console.log("Signing payment request with account:", account);

    // Sign the payment request using EIP-712 typed data signing
    if (paymentRequest.typedData) {
      const signature = await provider.request({
        method: 'eth_signTypedData_v4',
        params: [account, JSON.stringify(paymentRequest.typedData)]
      });
      return signature;
    }

    // Fallback to message signing if typed data is not available
    if (paymentRequest.message) {
      const signature = await provider.request({
        method: 'personal_sign',
        params: [paymentRequest.message, account]
      });
      return signature;
    }

    throw new Error("No signable data in payment request");
  } catch (error) {
    console.error("Error signing payment request:", error);
    throw error;
  }
}