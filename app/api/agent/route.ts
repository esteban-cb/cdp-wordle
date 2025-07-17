import { NextRequest, NextResponse } from "next/server";
import { AgentRequest, AgentResponse } from "../../types/api";
import { WORD_LENGTH } from "../../types/wordle";
import {
  getOrCreateGameState,
  setGameState,
  deleteGameState,
  addToConversationHistory,
  getRandomWord,
} from "../../services/gameState";

// Check if a word is in our word list
// function isValidWord(word: string): boolean {
//   return WORD_LIST.includes(word.toLowerCase());
// }

// Evaluate a guess against the target word
function evaluateGuess(
  guess: string,
  targetWord: string
): { letterStatuses: string[]; evaluation: string } {
  const letterStatuses: ("correct" | "present" | "absent")[] =
    Array(WORD_LENGTH).fill("absent");
  const evaluation: string[] = [];

  // First, mark all correct letters
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === targetWord[i]) {
      letterStatuses[i] = "correct";
    }
  }

  // Then, for each non-correct letter, check if it's present elsewhere
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (letterStatuses[i] !== "correct") {
      // Check if this letter appears elsewhere in the target word
      // and hasn't been marked as 'present' or 'correct' already
      const targetLetters = targetWord.split("");
      const letterToCheck = guess[i];

      // Count how many times this letter appears in the target word
      const letterCount = targetLetters.filter(
        (letter) => letter === letterToCheck
      ).length;

      // Count how many times this letter has already been marked as 'correct' or 'present'
      const markedCount = guess
        .split("")
        .filter(
          (letter, idx) =>
            letter === letterToCheck &&
            (letterStatuses[idx] === "correct" ||
              letterStatuses[idx] === "present")
        ).length;

      if (targetWord.includes(letterToCheck) && markedCount < letterCount) {
        letterStatuses[i] = "present";
      }
    }

    // Add evaluation text for each letter
    const letterChar = guess[i].toUpperCase();
    evaluation.push(
      `Letter ${letterChar} at position ${i + 1} is ${letterStatuses[
        i
      ].toUpperCase()}`
    );
  }

  return { letterStatuses, evaluation: evaluation.join("\n") };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userMessage, network }: AgentRequest = await request.json();

    // Get a unique identifier for the user session (in a real app, use a proper user ID)
    const userId = "user123";

    // Add user message to history
    addToConversationHistory(userId, { text: userMessage, sender: "user" });

    // Get or create game state
    const gameState = getOrCreateGameState(userId);
    console.log("Agent: Current target word is:", gameState.targetWord);
    console.log("Agent: Current guesses:", gameState.guesses);
    const message = userMessage.trim().toLowerCase();

    // Handle wallet-related questions generically (the frontend manages the actual wallet)
    if (message.includes("wallet address") || message.includes("my address")) {
      const response =
        "You can view your wallet address and details by clicking on your profile in the top right corner of the chat.";
      addToConversationHistory(userId, { text: response, sender: "agent" });
      return NextResponse.json({ response } as AgentResponse);
    }

    if (message.includes("balance") || message.includes("my balance")) {
      const response =
        "Your current balance is shown in your profile. Click on your username in the top right to see your ETH and USDC balances.";
      addToConversationHistory(userId, { text: response, sender: "agent" });
      return NextResponse.json({ response } as AgentResponse);
    }

    // Expanded game commands to include variations like "start wordle"
    if (
      message === "new game" ||
      message === "let's play wordle!" ||
      message === "play again" ||
      message === "start wordle" ||
      message === "start game" ||
      message.includes("start a new game") ||
      message.includes("play wordle") ||
      message.includes("begin wordle")
    ) {
      // Start a new game
      const newTargetWord = getRandomWord();
      setGameState(userId, {
        targetWord: newTargetWord,
        guesses: [],
      });

      console.log("New target word:", newTargetWord); // For debugging

      const response =
        "I've selected a fresh 5-letter word for you - time for a new challenge!\n\nMake your first guess!";
      addToConversationHistory(userId, { text: response, sender: "agent" });
      return NextResponse.json({ response } as AgentResponse);
    }

    // Check if the message is a potential word guess
    if (message.length === WORD_LENGTH && /^[a-z]+$/.test(message)) {
      // Add guess to game state even if it's not in the word list
      // This allows users to try any 5-letter word
      gameState.guesses.push(message);

      // Evaluate the guess
      const { evaluation } = evaluateGuess(message, gameState.targetWord);

      // Check if the game is over
      const isWin = message === gameState.targetWord;
      const isLoss = gameState.guesses.length >= 6 && !isWin;

      // Create user-friendly message without verbose evaluation
      let response = "";

      if (isWin) {
        response = `Congratulations! You guessed the word "${gameState.targetWord.toUpperCase()}" correctly in ${
          gameState.guesses.length
        } ${gameState.guesses.length === 1 ? "try" : "tries"}.`;
        // Reset game
        deleteGameState(userId);
      } else if (isLoss) {
        response = `Game over! You've used all your guesses. The word was "${gameState.targetWord.toUpperCase()}".`;
        // Reset game
        deleteGameState(userId);
      } else {
        // Game continues - just show remaining guesses
        response = `You have ${6 - gameState.guesses.length} ${
          6 - gameState.guesses.length === 1 ? "guess" : "guesses"
        } remaining.`;
      }

      // Add evaluation data at the end for frontend parsing, separated by a marker
      response += `\n\n---EVALUATION---\n${evaluation}`;

      addToConversationHistory(userId, { text: response, sender: "agent" });
      return NextResponse.json({ response } as AgentResponse);
    }

    // Fall back to regular non-guess message handling
    const response = handleNonGuessMessage(message, gameState);
    addToConversationHistory(userId, { text: response, sender: "agent" });
    return NextResponse.json({ response } as AgentResponse);
  } catch (error) {
    console.error("Error in agent route:", error);
    return NextResponse.json({
      error: "Sorry, there was an error processing your request.",
    } as AgentResponse);
  }
}

// Handle messages that aren't word guesses or commands
function handleNonGuessMessage(
  message: string,
  gameState: { targetWord: string; guesses: string[] }
): string {
  // Check if asking for help
  if (message.includes("help") || message.includes("how to play")) {
    return "To play Wordle, first say 'start wordle' to begin a new game. Then guess any 5-letter word. I'll tell you which letters are in the correct position (CORRECT), which letters are in the word but in the wrong position (PRESENT), and which letters are not in the word (ABSENT). You have 6 guesses to find the word!";
  }

  // Check if this is a payment hint message (not a user request for hint)
  if (message.includes("payment successful! here's your hint:")) {
    // This is a payment hint message, encourage them to use it
    return "Here's a hint! Can you guess the word now?";
  }

  // Check if asking for a hint
  if (message.includes("hint") || message.includes("clue")) {
    // If they haven't made any guesses yet, give a general hint
    if (gameState.guesses.length === 0) {
      return "To start playing, say 'start wordle' and then make your first guess with any 5-letter word!";
    }

    // If they're actively playing, encourage them to continue
    return "Can you guess the word now?";
  }

  // Check if asking about getting test USDC (be more specific to avoid triggering on status messages)
  if (
    message.toLowerCase().includes("how do i get") ||
    message.toLowerCase().includes("need more") ||
    message.toLowerCase().includes("get more") ||
    message.toLowerCase().includes("faucet") ||
    message.toLowerCase().includes("get funds") ||
    message.toLowerCase().includes("more funds") ||
    (message.toLowerCase().includes("usdc") &&
      (message.toLowerCase().includes("need") ||
        message.toLowerCase().includes("how")))
  ) {
    return (
      "To get test USDC for Base Sepolia, you can use the 'Get Funds' button in the interface. You'll also need a small amount of ETH for gas fees, which you can get from a faucet like:\n\n" +
      "Base Sepolia Faucet (official): https://www.coinbase.com/faucets/base-sepolia-faucet\n\n" +
      "Connect your wallet on those sites and request test tokens."
    );
  }

  // If the message contains "wordle" but isn't a specific command, suggest starting a game
  if (message.toLowerCase().includes("wordle")) {
    return "To start a new Wordle game, just say 'start wordle'. Then you can guess 5-letter words to play!";
  }

  // Default response
  return "Welcome to CDP Wordle! Say 'start wordle' to begin a new game, or ask for 'help' if you need assistance.";
}
