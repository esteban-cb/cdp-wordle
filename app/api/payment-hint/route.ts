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
  cdpClient = new CdpClient();
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
        cdpClient = new CdpClient();
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
    
    // Create viem account from CDP
    const viemAccount: LocalAccount = createViemAccountFromCDP(cdpAccount, cdpClient);

    // Create an Axios instance with payment handling
    const api: AxiosInstance = withPaymentInterceptor(
      axios.create({ baseURL }),
      viemAccount
    );

    const response: AxiosResponse = await api.get(endpointPath);
    
    const xPaymentHeader = response.headers["x-payment-response"];
    if (typeof xPaymentHeader === "string") {
      const paymentResponse = decodeXPaymentResponse(xPaymentHeader);
      return NextResponse.json({ 
        success: true, 
        data: paymentResponse,
        hint: letterHint
      });
    } else {
      return NextResponse.json({ 
        success: true, 
        data: response.data,
        hint: letterHint
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