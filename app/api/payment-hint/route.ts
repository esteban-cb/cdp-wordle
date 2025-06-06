import { NextRequest, NextResponse } from 'next/server';
import { withPaymentInterceptor, decodeXPaymentResponse } from "x402-axios";
import axios, { AxiosInstance, AxiosResponse } from "axios";
import { createViemAccountFromCDP, createCDPAccount } from "../../services/cdp-viem-adapter";
import { CdpClient } from "@coinbase/cdp-sdk";
import { LocalAccount } from "viem";
import { getOrCreateGameState } from "../../services/gameState";

// Define static values
const baseURL = "https://ippt4twld3.execute-api.us-east-1.amazonaws.com/prod";
const endpointPath = "/hint";

// Initialize CDP client on the server-side
let cdpClient: CdpClient | undefined = undefined;

function getRandomLetterHint(targetWord: string): string {
  // Get unique letters from the target word
  const uniqueLetters: string[] = [];
  for (const letter of targetWord.split('')) {
    if (!uniqueLetters.includes(letter)) {
      uniqueLetters.push(letter);
    }
  }
  
  console.log("Hint generation: Target word is:", targetWord);
  console.log("Hint generation: Unique letters are:", uniqueLetters);
  
  // Pick a random letter
  const randomIndex = Math.floor(Math.random() * uniqueLetters.length);
  const randomLetter = uniqueLetters[randomIndex].toUpperCase();
  
  console.log("Hint generation: Selected letter:", randomLetter);
  
  // Use proper grammar (a vs an)
  const article = ['A', 'E', 'I', 'O', 'U'].includes(randomLetter) ? 'an' : 'a';
  
  return `The word has ${article} ${randomLetter}`;
}

try {
  cdpClient = new CdpClient({
    apiKeyId: process.env.CDP_API_KEY_ID,
    apiKeySecret: process.env.CDP_API_KEY_SECRET,
    walletSecret: process.env.CDP_WALLET_SECRET?.trim(),
  });
  console.log("Payment hint: CDP client initialized successfully");
} catch (error) {
  console.error('Payment hint: Error initializing CDP client:', error);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Get current game state or create one if it doesn't exist
    const userId = "user123"; // In a real app, derive this from the wallet address or session
    
    const gameState = getOrCreateGameState(userId);
    console.log("Payment hint: Current target word is:", gameState.targetWord);
    console.log("Payment hint: Current guesses:", gameState.guesses);
    const letterHint = getRandomLetterHint(gameState.targetWord);

    // Initialize CDP client if not already initialized
    if (!cdpClient) {
      try {
        cdpClient = new CdpClient({
          apiKeyId: process.env.CDP_API_KEY_ID,
          apiKeySecret: process.env.CDP_API_KEY_SECRET,
          walletSecret: process.env.CDP_WALLET_SECRET?.trim(),
        });
      } catch (error) {
        console.error('Payment hint: Failed to initialize CDP client:', error);
        return NextResponse.json(
          { error: 'CDP client initialization failed' },
          { status: 500 }
        );
      }
    }

    // Create CDP account object from wallet address
    const cdpAccount = createCDPAccount(walletAddress, "payment-account");
    
    // Track comprehensive payment process details based on X402 protocol
    const paymentDetails = {
      walletAddress: walletAddress,
      timestamp: new Date().toISOString(),
      
      // CDP Integration Status
      cdpAccountCreated: true,
      viemAdapterCreated: true,
      
      // X402 Payment Protocol Details
      x402PaymentAttempted: false,
      x402ProtocolVersion: null as number | null,
      paymentScheme: null as string | null,
      paymentNetwork: null as string | null,
      paymentResource: `${baseURL}${endpointPath}`,
      
      // EIP-712 Signing Details
      eip712SigningAttempted: false,
      eip712SigningSuccessful: false,
      
      // Payment Settlement Details  
      paymentSuccessful: false,
      transactionHash: null as string | null,
      networkId: null as string | null,
      settlementDetails: null as Record<string, unknown> | null,
      
      // Payment Execution Response (from X402 facilitator)
      paymentExecutionResponse: null as Record<string, unknown> | null,
      
      // Error Handling
      fallbackUsed: false,
      errorMessage: null as string | null,
      signingEvents: [] as string[],
      
      // Payment Requirements & Payload (X402 spec)
      paymentRequirements: null as Record<string, unknown> | null,
      paymentPayload: null as Record<string, unknown> | null,
      
      // Additional X402 Details
      maxAmountRequired: null as string | null,
      assetAddress: null as string | null,
      payToAddress: null as string | null,
      paymentDescription: null as string | null
    };

    // Create enhanced signing callback to track detailed events
    const signingCallback = {
      onSigningAttempted: (type: 'message' | 'typedData' | 'transaction' | 'hash') => {
        const timestamp = new Date().toISOString();
        paymentDetails.signingEvents.push(`🔐 [${timestamp}] CDP Adapter: Attempting to sign ${type}...`);
        if (type === 'typedData') {
          paymentDetails.eip712SigningAttempted = true;
        }
      },
      onSigningSuccess: (type: 'message' | 'typedData' | 'transaction' | 'hash') => {
        const timestamp = new Date().toISOString();
        paymentDetails.signingEvents.push(`✅ [${timestamp}] CDP Adapter: ${type} signing successful`);
        if (type === 'typedData') {
          paymentDetails.eip712SigningSuccessful = true;
        }
      },
      onSigningError: (type: 'message' | 'typedData' | 'transaction' | 'hash', error: Error) => {
        const timestamp = new Date().toISOString();
        paymentDetails.signingEvents.push(`❌ [${timestamp}] CDP Adapter: ${type} signing failed - ${error.message || error}`);
      }
    };
    
    // Create viem account from CDP with enhanced signing callback
    const viemAccount: LocalAccount = createViemAccountFromCDP(cdpAccount, cdpClient, signingCallback);

    // Create an Axios instance with payment handling
    const api: AxiosInstance = withPaymentInterceptor(
      axios.create({ baseURL }),
      viemAccount
    );

    try {
      paymentDetails.x402PaymentAttempted = true;
      paymentDetails.signingEvents.push(`🚀 [${new Date().toISOString()}] Initiating X402 payment to ${baseURL}${endpointPath}`);
      
      const response: AxiosResponse = await api.get(endpointPath);
      
      // Extract and decode X-PAYMENT-RESPONSE header (X402 protocol)
      const xPaymentResponseHeader = response.headers["x-payment-response"];
      if (typeof xPaymentResponseHeader === "string") {
        try {
          const paymentResponse = decodeXPaymentResponse(xPaymentResponseHeader);
          console.log("X402 Payment Response:", paymentResponse);
          
          // Enhanced X402 payment details extraction
          paymentDetails.paymentSuccessful = true;
          paymentDetails.eip712SigningSuccessful = true;
          paymentDetails.paymentExecutionResponse = paymentResponse;
          
          // Extract X402 protocol details from response
          if (paymentResponse && typeof paymentResponse === 'object') {
            // Transaction details from X402 settlement response
            if ('txHash' in paymentResponse && paymentResponse.txHash) {
              paymentDetails.transactionHash = paymentResponse.txHash as string;
            }
            if ('networkId' in paymentResponse && paymentResponse.networkId) {
              paymentDetails.networkId = paymentResponse.networkId as string;
            }
            if ('success' in paymentResponse) {
              paymentDetails.paymentSuccessful = Boolean(paymentResponse.success);
            }
            
            // Additional settlement details
            paymentDetails.settlementDetails = paymentResponse as Record<string, unknown>;
          }
          
          // Try to extract payment requirements from the initial 402 response (if available)
          // This would typically be captured from the initial 402 Payment Required response
          paymentDetails.paymentScheme = "exact"; // Default scheme for X402
          paymentDetails.paymentNetwork = "84532"; // Base Sepolia network ID
          paymentDetails.x402ProtocolVersion = 1;
          
          paymentDetails.signingEvents.push(`✅ [${new Date().toISOString()}] X402 payment settlement completed successfully`);
          if (paymentDetails.transactionHash) {
            paymentDetails.signingEvents.push(`🔗 [${new Date().toISOString()}] Transaction hash: ${paymentDetails.transactionHash}`);
          }
          
          return NextResponse.json({ 
            success: true, 
            data: paymentResponse,
            hint: letterHint,
            paymentDetails: paymentDetails
          });
        } catch (decodeError) {
          console.error("Failed to decode X-PAYMENT-RESPONSE:", decodeError);
          paymentDetails.errorMessage = `Failed to decode payment response: ${decodeError}`;
          paymentDetails.signingEvents.push(`⚠️ [${new Date().toISOString()}] Failed to decode X-PAYMENT-RESPONSE header`);
        }
      }
      
      // Handle case where payment was successful but no X-PAYMENT-RESPONSE header
      paymentDetails.paymentSuccessful = true;
      paymentDetails.paymentScheme = "exact";
      paymentDetails.paymentNetwork = "84532";
      paymentDetails.x402ProtocolVersion = 1;
      paymentDetails.signingEvents.push(`✅ [${new Date().toISOString()}] X402 payment completed (no settlement response header)`);
      
      return NextResponse.json({ 
        success: true, 
        data: response.data,
        hint: letterHint,
        paymentDetails: paymentDetails
      });
      
    } catch (apiError) {
      // Enhanced error handling with X402 context
      console.log('Payment hint: X402 API request failed:', apiError);
      paymentDetails.fallbackUsed = true;
      paymentDetails.errorMessage = apiError instanceof Error ? apiError.message : 'X402 API unavailable';
      paymentDetails.signingEvents.push(`❌ [${new Date().toISOString()}] X402 payment failed: ${paymentDetails.errorMessage}`);
      
      return NextResponse.json({ 
        success: true, 
        data: { message: 'Hint provided (X402 payment API unavailable)' },
        hint: letterHint,
        fallback: true,
        paymentDetails: paymentDetails
      });
    }

  } catch (error) {
    console.error('Payment hint: Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 