import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, network, action, signature, paymentRequest } = body;

    console.log("🚀 Embedded payment hint request:", { walletAddress, network, action });

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
    });

    // Get current game state
    const userId = "user123";
    const gameState = getOrCreateGameState(userId);
    const letterHint = getRandomLetterHint(gameState.targetWord);
    console.log("🎮 Game state:", {
      targetWord: gameState.targetWord,
      guessCount: gameState.guesses.length,
    });

    const { baseURL, endpointPath } = getPaymentEndpoint(networkId);

    if (action === "get-requirements") {
      // First phase: Check if payment is required by making a request without payment
      try {
        console.log("📋 Checking payment requirements...");
        const response = await fetch(`${baseURL}${endpointPath}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          // No payment required
          const data = await response.json();
          return NextResponse.json({
            success: true,
            hint: letterHint,
            network: networkConfig,
            requiresPayment: false,
            fallback: false,
            data
          });
        } else if (response.status === 402) {
          // Payment required - extract payment requirements
          const paymentRequired = response.headers.get("www-authenticate");
          const paymentRequirements = parsePaymentRequirements(paymentRequired);
          
          console.log("💳 Payment required:", paymentRequirements);
          
          return NextResponse.json({
            success: true,
            hint: letterHint, // Provide fallback hint
            network: networkConfig,
            requiresPayment: true,
            paymentRequest: paymentRequirements,
            fallback: false
          });
        } else {
          // Other error - provide fallback
          console.log("❌ Request failed, providing fallback hint");
          return NextResponse.json({
            success: true,
            hint: letterHint,
            network: networkConfig,
            requiresPayment: false,
            fallback: true,
            error: `Request failed with status ${response.status}`
          });
        }
      } catch (error) {
        console.error("❌ Error checking payment requirements:", error);
        return NextResponse.json({
          success: true,
          hint: letterHint,
          network: networkConfig,
          requiresPayment: false,
          fallback: true,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    } else if (action === "complete-payment") {
      // Second phase: Complete the payment with the signature
      try {
        if (!signature || !paymentRequest) {
          throw new Error("Signature and payment request are required");
        }

        console.log("💳 Completing payment with signature...");
        
        // Create payment headers based on the signature
        const paymentHeaders = createPaymentHeaders(signature, paymentRequest);
        
        const response = await fetch(`${baseURL}${endpointPath}`, {
          method: "GET",
          headers: {
            ...paymentHeaders,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log("✅ Payment successful, received premium hint");
          
          return NextResponse.json({
            success: true,
            hint: `Premium hint: ${letterHint}`, // Enhanced hint for paid request
            network: networkConfig,
            data
          });
        } else {
          throw new Error(`Payment verification failed with status ${response.status}`);
        }
      } catch (error) {
        console.error("❌ Payment completion failed:", error);
        return NextResponse.json({
          success: true,
          hint: letterHint, // Fallback to free hint
          network: networkConfig,
          fallback: true,
          error: error instanceof Error ? error.message : "Payment failed"
        });
      }
    } else {
      return NextResponse.json(
        { error: "Invalid action. Must be 'get-requirements' or 'complete-payment'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("💥 Embedded payment hint error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * Parse payment requirements from WWW-Authenticate header
 */
function parsePaymentRequirements(authHeader: string | null): any {
  if (!authHeader) {
    return null;
  }

  // Parse the WWW-Authenticate header to extract payment parameters
  // This is a simplified parser - in production, you'd want more robust parsing
  const params: Record<string, string> = {};
  const parts = authHeader.split(',');
  
  for (const part of parts) {
    const [key, value] = part.split('=', 2);
    if (key && value) {
      params[key.trim()] = value.trim().replace(/"/g, '');
    }
  }

  // Create a basic payment request structure
  // This would be enhanced based on the actual X402 protocol requirements
  return {
    amount: params.amount || "0.01",
    currency: params.currency || "USDC",
    recipient: params.recipient,
    message: `Payment for Wordle hint - ${new Date().toISOString()}`,
    typedData: {
      domain: {
        name: "CDP Wordle",
        version: "1",
        chainId: params.chainId || "84532",
        verifyingContract: params.recipient || "0x0000000000000000000000000000000000000000"
      },
      types: {
        Payment: [
          { name: "amount", type: "uint256" },
          { name: "recipient", type: "address" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" }
        ]
      },
      primaryType: "Payment",
      message: {
        amount: params.amount || "10000", // in wei/smallest unit
        recipient: params.recipient || "0x0000000000000000000000000000000000000000",
        nonce: Date.now(),
        deadline: Math.floor(Date.now() / 1000) + 3600 // 1 hour
      }
    }
  };
}

/**
 * Create payment headers from signature and payment request
 */
function createPaymentHeaders(signature: string, paymentRequest: any): Record<string, string> {
  // This would create the appropriate X402 payment headers
  // The exact format depends on the X402 specification
  return {
    "Authorization": `Bearer ${signature}`,
    "X-Payment": signature,
    "X-Payment-Amount": paymentRequest.amount || "0.01",
    "X-Payment-Currency": paymentRequest.currency || "USDC"
  };
}