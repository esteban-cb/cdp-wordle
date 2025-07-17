import { NextRequest, NextResponse } from "next/server";
import { withPaymentInterceptor, decodeXPaymentResponse } from "x402-axios";
import axios, { AxiosInstance, AxiosResponse } from "axios";
import {
  createViemAccountFromCDP,
  createCDPAccount,
} from "../../services/cdp-viem-adapter";
import { CdpClient } from "@coinbase/cdp-sdk";
import { LocalAccount } from "viem";
import { getOrCreateGameState } from "../../services/gameState";
import { NETWORKS, DEFAULT_NETWORK } from "../../config/networks";

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

// Initialize CDP client
let cdpClient: CdpClient | undefined = undefined;

try {
  cdpClient = new CdpClient({
    apiKeyId: process.env.CDP_API_KEY_ID,
    apiKeySecret: process.env.CDP_API_KEY_SECRET,
    walletSecret: process.env.CDP_WALLET_SECRET?.trim(),
  });
  console.log("✅ CDP client initialized successfully");
} catch (error) {
  console.error("❌ Error initializing CDP client:", error);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, network } = body;

    console.log("🚀 Payment hint request started");
    console.log("📍 Request details:", { walletAddress, network });

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Use provided network or default to base-sepolia
    const networkId = network || "base-sepolia";
    const networkConfig = NETWORKS[networkId] || DEFAULT_NETWORK;

    console.log("🌐 Network configuration:", {
      networkId,
      name: networkConfig.name,
      chainId: networkConfig.chainId,
      usdcAddress: networkConfig.usdcAddress,
    });

    // Get network-specific payment endpoint
    const { baseURL, endpointPath } = getPaymentEndpoint(networkId);
    console.log("🎯 Payment endpoint:", `${baseURL}${endpointPath}`);

    // Get current game state
    const userId = "user123";
    const gameState = getOrCreateGameState(userId);
    const letterHint = getRandomLetterHint(gameState.targetWord);
    console.log("🎮 Game state:", {
      targetWord: gameState.targetWord,
      guessCount: gameState.guesses.length,
    });

    // Initialize CDP client if needed
    if (!cdpClient) {
      try {
        cdpClient = new CdpClient({
          apiKeyId: process.env.CDP_API_KEY_ID,
          apiKeySecret: process.env.CDP_API_KEY_SECRET,
          walletSecret: process.env.CDP_WALLET_SECRET?.trim(),
        });
        console.log("🔧 CDP client re-initialized");
      } catch (error) {
        console.error("❌ Failed to initialize CDP client:", error);
        return NextResponse.json(
          { error: "CDP client initialization failed" },
          { status: 500 }
        );
      }
    }

    // Create CDP account and viem adapter
    console.log("🔑 Creating CDP account and viem adapter...");
    const cdpAccount = createCDPAccount(walletAddress, "payment-account");
    // Enhanced signing callback for detailed logging
    const signingCallback = {
      onSigningAttempted: (
        type: "message" | "typedData" | "transaction" | "hash"
      ) => {
        console.log(`🔐 CDP signing attempted: ${type}`);
      },
      onSigningSuccess: (
        type: "message" | "typedData" | "transaction" | "hash"
      ) => {
        console.log(`✅ CDP signing successful: ${type}`);
      },
      onSigningError: (
        type: "message" | "typedData" | "transaction" | "hash",
        error: Error
      ) => {
        console.log(`❌ CDP signing failed: ${type} - ${error.message}`);
      },
    };

    const viemAccount: LocalAccount = createViemAccountFromCDP(
      cdpAccount,
      cdpClient,
      signingCallback
    );
    console.log("✅ Viem account created successfully");

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

        // Log JWT token if present in X-PAYMENT header
        if (config.headers?.["X-PAYMENT"]) {
          try {
            const xPaymentHeader = config.headers["X-PAYMENT"];
            console.log("🔐 X-PAYMENT Header (original):", xPaymentHeader);

            // Remove base64 padding to match testnet behavior
            const xPaymentWithoutPadding = xPaymentHeader.replace(/=+$/, "");
            config.headers["X-PAYMENT"] = xPaymentWithoutPadding;
            console.log(
              "🔧 X-PAYMENT Header (padding removed):",
              xPaymentWithoutPadding
            );

            // Decode the JWT payload (without verification, just for inspection)
            const base64Payload = xPaymentHeader.split(".")[1];
            if (base64Payload) {
              const payload = JSON.parse(atob(base64Payload));
              console.log("🔍 JWT Payload:", payload);
            }
          } catch (e) {
            console.log("Could not decode JWT:", e);
          }
        }

        return config;
      },
      (error) => {
        console.error("❌ Request interceptor error:", error);
        return Promise.reject(error);
      }
    );

    try {
      // Add request interceptor to log what's being sent
      console.log("About to make request to:", `${baseURL}${endpointPath}`);
      console.log("Network:", networkConfig.name);

      const response: AxiosResponse = await api.get(endpointPath);
      console.log("---Will Print on testnet but not mainnet---");
      console.log(response.headers);
      console.log(response.data);

      const xPaymentResponseHeader = response.headers["x-payment-response"];
      if (xPaymentResponseHeader) {
        const paymentResponse = decodeXPaymentResponse(xPaymentResponseHeader);
        console.log("X402 Payment Response:", paymentResponse);
      }

      return NextResponse.json({
        success: true,
        hint: letterHint,
        data: response.data,
        network: networkConfig,
      });
    } catch (error: any) {
      console.log("--------ERROR CAUGHT--------------");
      console.log("Error type:", error.constructor.name);
      console.log("Error message:", error.message);
      console.log("Error code:", error.code);
      console.log("Response status:", error.response?.status);
      console.log("Response data:", error.response?.data);
      console.error(error.response?.data?.error);

      return NextResponse.json({
        success: true,
        hint: letterHint,
        fallback: true,
        network: networkConfig,
        error: error.message,
      });
    }
  } catch (error) {
    console.error("💥 Payment hint error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
