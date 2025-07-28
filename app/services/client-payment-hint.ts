'use client';

import { withPaymentInterceptor, decodeXPaymentResponse } from "x402-axios";
import axios, { AxiosInstance, AxiosResponse } from "axios";
import { getViemAccount } from "./embedded-viem-account";
import { LocalAccount } from "viem";
import { NetworkConfig } from "../types/wordle";
import { 
  trackRealPayment, 
  verifyRealPayment, 
  generateX402PaymentId, 
  logRealPaymentDetails,
  createRealPaymentProof,
  type RealPaymentTransaction 
} from "./payment-transaction-tracker";

interface PaymentHintResponse {
  success: boolean;
  hint?: string;
  paymentDetails?: any;
  network?: NetworkConfig;
  fallback?: boolean;
  data?: any;
  error?: string;
}

// Network-specific X402 payment endpoints
function getPaymentEndpoint(networkId: string): {
  baseURL: string;
  endpointPath: string;
} {
  if (networkId === "base") {
    console.log("🌐 Using Base mainnet X402 endpoint");
    return {
      baseURL: "https://73scps14lf.execute-api.us-east-1.amazonaws.com/prod",
      endpointPath: "/hint",
    };
  } else {
    console.log("🌐 Using Base Sepolia testnet X402 endpoint");
    return {
      baseURL: "https://ippt4twld3.execute-api.us-east-1.amazonaws.com/prod",
      endpointPath: "/hint",
    };
  }
}

function getRandomLetterHint(targetWord: string): string {
  const uniqueLetters: string[] = [];
  for (const letter of targetWord.split("")) {
    if (!uniqueLetters.includes(letter)) {
      uniqueLetters.push(letter);
    }
  }

  const randomIndex = Math.floor(Math.random() * uniqueLetters.length);
  const randomLetter = uniqueLetters[randomIndex].toUpperCase();
  const article = ["A", "E", "I", "O", "U"].includes(randomLetter) ? "an" : "a";

  return `The word has ${article} ${randomLetter}`;
}

/**
 * Get a payment hint using X402 payment protocol on the client-side
 * @param walletAddress The wallet address
 * @param network The current network configuration
 * @returns Promise with payment hint response
 */
export async function getClientPaymentHint(
  walletAddress: string,
  network?: NetworkConfig
): Promise<PaymentHintResponse> {
  try {
    console.log("🚀 Client-side payment hint request started");
    console.log("📍 Request details:", { walletAddress, networkId: network?.id });

    if (!walletAddress) {
      throw new Error("Wallet address is required");
    }

    // Use provided network or default to base-sepolia
    const networkId = network?.id || "base-sepolia";

    console.log("🌐 Network configuration:", {
      networkId,
      name: network?.name,
      chainId: network?.chainId,
      usdcAddress: network?.usdcAddress,
    });

    // Get network-specific payment endpoint
    const { baseURL, endpointPath } = getPaymentEndpoint(networkId);
    console.log("🎯 Payment endpoint:", `${baseURL}${endpointPath}`);

    // Get game state for fallback hint (call the simplified API)
    console.log("🎮 Getting game state for fallback hint...");
    const gameStateResponse = await fetch("/api/game-state", {
      method: "GET",
    });
    
    if (!gameStateResponse.ok) {
      throw new Error("Failed to get game state");
    }
    
    const gameState = await gameStateResponse.json();
    const letterHint = getRandomLetterHint(gameState.targetWord);
    console.log("🎮 Game state loaded:", {
      targetWord: gameState.targetWord,
      guessCount: gameState.guesses?.length || 0,
    });

    // Create Viem account from embedded wallet (uses CDP Core client-side context)
    console.log("🔑 Creating Viem account from embedded wallet...");
    const viemAccount: LocalAccount = await getViemAccount();
    console.log("✅ Embedded wallet Viem account created successfully");
    console.log("📍 Account address:", viemAccount.address);
    
    // Test the account by signing a test message
    console.log("🧪 Testing embedded wallet signing capability...");
    try {
      const testSignature = await viemAccount.signMessage({ message: "test-x402-payment" });
      console.log("✅ Embedded wallet can sign messages:", testSignature.substring(0, 20) + "...");
    } catch (signError) {
      console.error("❌ Embedded wallet signing test failed:", signError);
      throw new Error("Embedded wallet cannot sign messages: " + signError);
    }

    // Create axios instance with X402 payment interceptor
    console.log("⚡ Creating X402 payment interceptor...");
    const api: AxiosInstance = withPaymentInterceptor(
      axios.create({
        baseURL,
        timeout: 30000,
      }),
      viemAccount
    );

    // Add request interceptor to see what's being sent
    api.interceptors.request.use(
      (config) => {
        console.log("📤 REQUEST INTERCEPTOR - Headers being sent:");
        console.log("Authorization:", config.headers?.Authorization);
        console.log("X-PAYMENT:", config.headers?.["X-PAYMENT"]);
        console.log("All headers:", config.headers);
        console.log("Request URL:", config.url);
        console.log("Base URL:", config.baseURL);
        console.log("Full URL:", `${config.baseURL}${config.url}`);

        // Check if X-PAYMENT header is missing (indicating X402 interceptor failed)
        if (!config.headers?.["X-PAYMENT"]) {
          console.error("❌ CRITICAL: X-PAYMENT header is missing! X402 interceptor may have failed.");
          console.error("This usually means the embedded wallet couldn't sign the payment authorization.");
        }

        // Log JWT token if present in X-PAYMENT header
        if (config.headers?.["X-PAYMENT"]) {
          try {
            const xPaymentHeader = config.headers["X-PAYMENT"];
            console.log("🔐 X-PAYMENT Header (original):", xPaymentHeader);

            // For testnet, we might need to remove base64 padding
            if (networkId === "base-sepolia") {
              const xPaymentWithoutPadding = xPaymentHeader.replace(/=+$/, "");
              config.headers["X-PAYMENT"] = xPaymentWithoutPadding;
              console.log(
                "🔧 X-PAYMENT Header (padding removed for testnet):",
                xPaymentWithoutPadding
              );
            }

            // Decode the JWT payload (without verification, just for inspection)
            const base64Payload = xPaymentHeader.split(".")[1];
            if (base64Payload) {
              const payload = JSON.parse(atob(base64Payload));
              console.log("🔍 JWT Payload:", payload);
            }
          } catch (e) {
            console.log("Could not decode JWT:", e);
          }
        } else {
          console.error("❌ No X-PAYMENT header found - this will cause a 403 error");
        }

        return config;
      },
      (error) => {
        console.error("❌ Request interceptor error:", error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor to see what comes back
    api.interceptors.response.use(
      (response) => {
        console.log("📥 RESPONSE INTERCEPTOR - Response received:");
        console.log("Status:", response.status);
        console.log("Headers:", response.headers);
        console.log("Data:", response.data);
        return response;
      },
      (error) => {
        console.error("📥 RESPONSE INTERCEPTOR - Error response:");
        console.error("Status:", error.response?.status);
        console.error("Headers:", error.response?.headers);
        console.error("Data:", error.response?.data);
        console.error("Message:", error.message);
        return Promise.reject(error);
      }
    );

    try {
      // Make the X402 payment request
      console.log("Making X402 payment request to:", `${baseURL}${endpointPath}`);
      console.log("Network:", network?.name);

      const response: AxiosResponse = await api.get(endpointPath);
      console.log("---X402 Payment Response (will print on testnet but not mainnet)---");
      console.log("Response headers:", response.headers);
      console.log("Response data:", response.data);

      const xPaymentResponseHeader = response.headers["x-payment-response"];
      if (xPaymentResponseHeader) {
        const paymentResponse = decodeXPaymentResponse(xPaymentResponseHeader);
        console.log("X402 Payment Response Details:", paymentResponse);
      }

      return {
        success: true,
        hint: letterHint,
        data: response.data,
        network,
        paymentDetails: {
          walletAddress: viemAccount.address,
          timestamp: new Date().toISOString(),
          cdpAccountCreated: true,
          viemAdapterCreated: true,
          x402PaymentAttempted: true,
          x402ProtocolVersion: 1,
          paymentScheme: "x402",
          paymentNetwork: networkId,
          paymentResource: endpointPath,
          eip712SigningAttempted: true,
          eip712SigningSuccessful: true,
          paymentSuccessful: true,
          transactionHash: xPaymentResponseHeader ? "via-x402" : null,
          networkId,
          settlementDetails: response.data,
          paymentExecutionResponse: response.data,
          fallbackUsed: false,
          errorMessage: null,
          signingEvents: [
            "Embedded wallet Viem account created",
            "X402 payment interceptor initialized", 
            "EIP-712 signature created for payment",
            "X402 payment request sent",
            "Payment completed successfully"
          ],
          paymentRequirements: null,
          paymentPayload: null,
          maxAmountRequired: "1.00",
          assetAddress: network?.usdcAddress,
          payToAddress: null,
          paymentDescription: "Wordle hint payment via X402 protocol"
        }
      };
    } catch (error: any) {
      console.log("--------X402 PAYMENT ERROR CAUGHT--------------");
      console.log("Error type:", error.constructor.name);
      console.log("Error message:", error.message);
      console.log("Error code:", error.code);
      console.log("Response status:", error.response?.status);
      console.log("Response data:", error.response?.data);
      console.error("X402 error details:", error.response?.data?.error);

      // Return fallback hint with error details
      return {
        success: true,
        hint: letterHint,
        fallback: true,
        network,
        error: error.message,
        paymentDetails: {
          walletAddress: viemAccount.address,
          timestamp: new Date().toISOString(),
          cdpAccountCreated: true,
          viemAdapterCreated: true,
          x402PaymentAttempted: true,
          x402ProtocolVersion: null,
          paymentScheme: null,
          paymentNetwork: networkId,
          paymentResource: endpointPath,
          eip712SigningAttempted: false,
          eip712SigningSuccessful: false,
          paymentSuccessful: false,
          transactionHash: null,
          networkId,
          settlementDetails: null,
          paymentExecutionResponse: null,
          fallbackUsed: true,
          errorMessage: error.message,
          signingEvents: [
            "Embedded wallet Viem account created",
            "X402 payment interceptor initialized",
            "X402 payment request failed - using fallback hint"
          ],
          paymentRequirements: null,
          paymentPayload: null,
          maxAmountRequired: "1.00",
          assetAddress: network?.usdcAddress,
          payToAddress: null,
          paymentDescription: "Wordle hint payment (fallback mode)"
        }
      };
    }
  } catch (error) {
    console.error("💥 Client payment hint error:", error);
    throw error;
  }
}