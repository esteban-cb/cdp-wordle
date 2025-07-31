import { NextRequest, NextResponse } from "next/server";
import { AgentRequest, AgentResponse } from "../../types/api";
import {
  addToConversationHistory,
} from "../../services/gameState";
import { wordleTools } from "./wordle-tools";
import { initializeAgentKit } from "./agentkit-wrapper";

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log("🤖 Agent route called");
  
  try {
    const { userMessage, network }: AgentRequest = await request.json();
    console.log("📝 User message:", userMessage);
    
    const userId = "user123";
    const message = userMessage.trim().toLowerCase();
    
    // Add user message to history
    addToConversationHistory(userId, { text: userMessage, sender: "user" });
    
    let response = "";
    
    // Initialize AgentKit tools for wallet operations
    let agentKitTools: any = {};
    try {
      const { tools } = await initializeAgentKit(network || "base-sepolia");
      agentKitTools = tools;
      console.log("✅ AgentKit initialized with", Object.keys(agentKitTools).length, "tools");
    } catch (error) {
      console.log("⚠️ AgentKit initialization failed:", error instanceof Error ? error.message : String(error));
    }
    
    // Handle Wordle game logic using tools directly (this works reliably)
    if (message.includes("start") && (message.includes("wordle") || message.includes("game"))) {
      const result = await wordleTools.startNewGame.execute({ userId });
      response = result.message || "New Wordle game started! Make your first 5-letter word guess.";
    } 
    else if (message.length === 5 && /^[a-z]+$/i.test(message)) {
      const result = await wordleTools.makeGuess.execute({ userId, guess: message });
      if (result.success) {
        response = result.message || "";
        if (result.evaluation) {
          response += `\n\n---EVALUATION---\n${result.evaluation}`;
        }
      } else {
        response = result.message || "Invalid guess. Please try a different word.";
      }
    } 
    else if (message.includes("hint") || message.includes("clue")) {
      response = "To get a clue, you need to pay 1 USDC. Please use the 'Get Hint' button above the chat to proceed with payment. I can help you with other game actions like making guesses, checking status, or starting new games for free!";
    } 
    else if (message.includes("status") || message.includes("current")) {
      const result = await wordleTools.getGameStatus.execute({ userId });
      if (result.success && result.gameState) {
        const { guesses, remainingGuesses, hintsUsed } = result.gameState;
        response = `Current game status:\n- Guesses made: ${guesses.length}\n- Remaining guesses: ${remainingGuesses}\n- Hints used: ${hintsUsed}`;
      } else {
        response = "No active game. Say 'start wordle' to begin!";
      }
    }
    // Handle wallet/balance queries - provide helpful guidance  
    else if (message.includes("balance") || message.includes("usdc") || message.includes("how much")) {
      response = `Your current USDC balance is displayed in the wallet info at the top right of the screen.

**To check your balance:**
1. Look at the wallet info in the top right corner
2. Click on your username to see detailed balance information  
3. Your balance shows the exact USDC amount with precision

Your embedded wallet manages your actual funds. For testnet funds, you can use the "Get Funds" button or ask me to "get funds" to request test USDC and ETH.`;
    }
    else if (message.includes("wallet") || message.includes("address")) {
      response = `Your wallet address and details are shown in the top right corner.

**To view your wallet info:**
1. Click on your username in the top right corner
2. This shows your full wallet address and current balances
3. You can copy your address from the wallet details

Your embedded wallet is automatically connected and ready to use. For blockchain operations like requesting funds, I can help with AgentKit commands.`;
    }
    // Handle fund requests using AgentKit
    else if (message.includes("get funds") || message.includes("request funds") || message.includes("need funds")) {
      if (agentKitTools && agentKitTools["CdpApiActionProvider_request_faucet_funds"]) {
        try {
          console.log("🔍 Requesting faucet funds using AgentKit...");
          const fundsResult = await agentKitTools["CdpApiActionProvider_request_faucet_funds"].execute({});
          response = `Funds request initiated! ${fundsResult.message || 'Check your wallet for the funds.'}\n\nYou can also use the "Get Funds" button in the interface for additional funding options.`;
        } catch (error) {
          console.log("Funds request failed:", error);
          response = "I can help you get testnet funds! Use the 'Get Funds' button in the interface, or visit the Base Sepolia faucet directly. You'll need both ETH (for gas) and USDC (for hints) on the testnet.";
        }
      } else {
        response = "To get testnet funds, use the 'Get Funds' button in the interface or visit the Base Sepolia faucet. You'll need both ETH for gas fees and USDC for hints.";
      }
    }
    else if (message.includes("help")) {
      response = "Welcome to CDP Wordle! Here's how to play:\n- Say 'start wordle' to begin a new game\n- Guess any 5-letter word\n- Get clues with 'give me a clue' (costs 1 USDC)\n- Ask for 'status' to see your current game\n- Ask about your 'balance' or 'wallet' for account info\n\nYou have 6 guesses to find the word!";
    } 
    else {
      response = "I can help you with:\n• Wordle game: 'start wordle', make 5-letter guesses, 'status'\n• Wallet info: 'balance', 'wallet address', 'network'\n• Payments: 'get clue' (1 USDC), 'get funds' (testnet)\n• General: 'help' for game instructions\n\nWhat would you like to do?";
    }
    
    // Add agent response to history
    addToConversationHistory(userId, { text: response, sender: "agent" });
    
    return NextResponse.json({ response } as AgentResponse);
    
  } catch (error) {
    console.error("❌ Error in agent route:", error);
    
    const fallbackResponse = "I'm having trouble processing that request right now. For Wordle, try 'start wordle' to begin a game. For other help, please try again in a moment.";
    
    return NextResponse.json({
      response: fallbackResponse
    } as AgentResponse);
  }
}

