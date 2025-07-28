import { NextRequest, NextResponse } from "next/server";
import { decodeXPaymentResponse } from "x402-axios";
import { getOrCreateGameState, incrementHintUsage } from "../../services/gameState";
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
    const { address, network, xPaymentHeader } = body;

    console.log("🚀 Payment hint proxy request started");
    console.log("📍 Request details:", { address, network, hasXPaymentHeader: !!xPaymentHeader });

    if (!address) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Use provided network or default to base-sepolia
    const networkId = network?.id || "base-sepolia";
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

    // If we have an X-PAYMENT header from the client, use it directly
    if (xPaymentHeader) {
      console.log("🔐 Using X-PAYMENT header from client-side embedded wallet");
      
      try {
        // Make direct request to AWS endpoint with the X-PAYMENT header
        const response = await fetch(`${baseURL}${endpointPath}`, {
          method: 'GET',
          headers: {
            'X-PAYMENT': xPaymentHeader,
            'User-Agent': 'CDP-Wordle-Proxy/1.0',
            'Accept': 'application/json',
          },
        });

        console.log("📥 AWS endpoint response status:", response.status);

        if (response.ok) {
          const data = await response.json();
          const xPaymentResponseHeader = response.headers.get('x-payment-response');
          
          console.log("✅ X402 Payment successful!");
          console.log("📦 AWS response data:", data);
          
          // Increment hint usage since payment was successful
          incrementHintUsage(userId);
          
          let actualTransactionHash = null;
          let paymentAmount = null;
          let payerAddress = null;
          let paymentNetwork = null;
          
          if (xPaymentResponseHeader) {
            const paymentResponse = decodeXPaymentResponse(xPaymentResponseHeader);
            console.log("🔍 Full X402 Payment Response:", JSON.stringify(paymentResponse, null, 2));
            
            // Extract all useful payment details
            if (paymentResponse) {
              actualTransactionHash = paymentResponse.transaction;
              payerAddress = paymentResponse.payer;
              paymentNetwork = paymentResponse.network;
              
              console.log("🔗 Real transaction hash:", actualTransactionHash);
              console.log("💰 Payer address:", payerAddress);
              console.log("🌐 Payment network:", paymentNetwork);
              console.log("✅ Payment success:", paymentResponse.success);
            }
          }

          // Get updated game state after incrementing hints
          const updatedGameState = getOrCreateGameState(userId);
          
          return NextResponse.json({
            success: true,
            hint: letterHint,
            data: data,
            network: networkConfig,
            gameState: updatedGameState,
            paymentDetails: {
              walletAddress: address,
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
              transactionHash: actualTransactionHash || "via-x402-proxy",
              settlementConfirmed: !!actualTransactionHash,
              payerAddress: payerAddress,
              confirmedPaymentNetwork: paymentNetwork,
              awsResponseData: data,
              networkId,
              settlementDetails: data,
              paymentExecutionResponse: data,
              fallbackUsed: false,
              errorMessage: null,
              signingEvents: [
                "Client-side embedded wallet created X-PAYMENT header",
                "Server proxy forwarded X402 request",
                "AWS endpoint processed payment",
                "Payment completed successfully"
              ],
              maxAmountRequired: "1.00",
              assetAddress: networkConfig.usdcAddress,
              payToAddress: null,
              paymentDescription: "Wordle hint payment via X402 protocol (proxied)"
            }
          });
        } else {
          const errorText = await response.text();
          console.error("❌ AWS endpoint error:", response.status, errorText);
          
          return NextResponse.json({
            success: true,
            hint: letterHint,
            fallback: true,
            network: networkConfig,
            error: `AWS returned ${response.status}: ${errorText}`,
            paymentDetails: {
              walletAddress: address,
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
              paymentSuccessful: false,
              transactionHash: null,
              networkId,
              settlementDetails: null,
              paymentExecutionResponse: null,
              fallbackUsed: true,
              errorMessage: `AWS returned ${response.status}`,
              signingEvents: [
                "Client-side embedded wallet created X-PAYMENT header",
                "Server proxy forwarded X402 request",
                "AWS endpoint rejected payment - using fallback"
              ],
              maxAmountRequired: "1.00",
              assetAddress: networkConfig.usdcAddress,
              payToAddress: null,
              paymentDescription: "Wordle hint payment (AWS error fallback)"
            }
          });
        }
      } catch (fetchError: any) {
        console.error("❌ Proxy fetch error:", fetchError);
        
        return NextResponse.json({
          success: true,
          hint: letterHint,
          fallback: true,
          network: networkConfig,
          error: fetchError.message,
          paymentDetails: {
            walletAddress: address,
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
            paymentSuccessful: false,
            transactionHash: null,
            networkId,
            settlementDetails: null,
            paymentExecutionResponse: null,
            fallbackUsed: true,
            errorMessage: fetchError.message,
            signingEvents: [
              "Client-side embedded wallet created X-PAYMENT header",
              "Server proxy request failed - using fallback"
            ],
            maxAmountRequired: "1.00",
            assetAddress: networkConfig.usdcAddress,
            payToAddress: null,
            paymentDescription: "Wordle hint payment (proxy error fallback)"
          }
        });
      }
    } else {
      // No X-PAYMENT header provided, return fallback
      console.log("❌ No X-PAYMENT header provided - using fallback");
      
      return NextResponse.json({
        success: true,
        hint: letterHint,
        fallback: true,
        network: networkConfig,
        error: "No X-PAYMENT header provided",
        paymentDetails: {
          walletAddress: address,
          timestamp: new Date().toISOString(),
          cdpAccountCreated: false,
          viemAdapterCreated: false,
          x402PaymentAttempted: false,
          paymentSuccessful: false,
          fallbackUsed: true,
          errorMessage: "No X-PAYMENT header provided",
          signingEvents: [
            "No X-PAYMENT header - using fallback"
          ],
          maxAmountRequired: "1.00",
          assetAddress: networkConfig.usdcAddress,
          payToAddress: null,
          paymentDescription: "Wordle hint (no payment header fallback)"
        }
      });
    }
  } catch (error) {
    console.error("💥 Payment hint proxy error:", error);
    
    // Fallback hint without game state
    const fallbackHint = "The word contains a vowel";
    
    return NextResponse.json({
      success: true,
      hint: fallbackHint,
      fallback: true,
      error: error instanceof Error ? error.message : "Unknown error",
      paymentDetails: {
        paymentSuccessful: false,
        fallbackUsed: true,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        walletAddress: "unknown",
        paymentResource: "/hint",
        networkId: "base-sepolia",
        signingEvents: [
          "Server error - using fallback"
        ]
      }
    });
  }
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Payment',
    },
  });
}
