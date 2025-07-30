import { z } from "zod";
import { getOrCreateGameState, setGameState, deleteGameState, getRandomWord } from "../../services/gameState";
import { WORD_LENGTH } from "../../types/wordle";

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
            (letterStatuses[idx] === "correct" || letterStatuses[idx] === "present")
        ).length;

      if (letterCount > markedCount) {
        letterStatuses[i] = "present";
      }
    }
  }

  // Create evaluation string
  for (let i = 0; i < WORD_LENGTH; i++) {
    evaluation.push(`${guess[i].toUpperCase()}:${letterStatuses[i].toUpperCase()}`);
  }

  return { letterStatuses, evaluation: evaluation.join(",") };
}

// Wordle-specific tools for the AI agent
export const wordleTools = {
  startNewGame: {
    description: "Start a new Wordle game with a fresh word",
    parameters: z.object({
      userId: z.string().describe("The user ID to start a game for"),
    }),
    execute: async ({ userId }: { userId: string }) => {
      const newWord = getRandomWord();
      setGameState(userId, {
        targetWord: newWord,
        guesses: [],
        hintsUsed: 0
      });
      
      return {
        success: true,
        message: "New Wordle game started! Make your first 5-letter word guess.",
        gameState: {
          targetWord: "HIDDEN", // Don't reveal the word
          guesses: [],
          hintsUsed: 0,
          remainingGuesses: 6
        }
      };
    },
  },

  makeGuess: {
    description: "Make a guess in the current Wordle game",
    parameters: z.object({
      userId: z.string().describe("The user ID making the guess"),
      guess: z.string().describe("The 5-letter word guess"),
    }),
    execute: async ({ userId, guess }: { userId: string; guess: string }) => {
      const gameState = getOrCreateGameState(userId);
      
      // Validate guess
      if (guess.length !== WORD_LENGTH) {
        return {
          success: false,
          message: `Please enter a ${WORD_LENGTH}-letter word.`,
        };
      }

      if (!/^[a-zA-Z]+$/.test(guess)) {
        return {
          success: false,
          message: "Please enter only letters.",
        };
      }

      const normalizedGuess = guess.toLowerCase();
      
      // Add guess to game state
      gameState.guesses.push(normalizedGuess);

      // Evaluate the guess
      const { evaluation } = evaluateGuess(normalizedGuess, gameState.targetWord);

      // Check if the game is over
      const isWin = normalizedGuess === gameState.targetWord;
      const isLoss = gameState.guesses.length >= 6 && !isWin;

      let message = "";
      let gameOver = false;

      if (isWin) {
        message = `🎉 Congratulations! You guessed "${gameState.targetWord.toUpperCase()}" correctly in ${gameState.guesses.length} ${gameState.guesses.length === 1 ? "try" : "tries"}!`;
        gameOver = true;
        deleteGameState(userId);
      } else if (isLoss) {
        message = `😞 Game over! You used all 6 guesses. The word was "${gameState.targetWord.toUpperCase()}".`;
        gameOver = true;
        deleteGameState(userId);
      } else {
        const remaining = 6 - gameState.guesses.length;
        message = `You have ${remaining} ${remaining === 1 ? "guess" : "guesses"} remaining.`;
      }

      return {
        success: true,
        message,
        gameOver,
        isWin,
        evaluation,
        gameState: {
          targetWord: gameOver ? gameState.targetWord.toUpperCase() : "HIDDEN",
          guesses: gameState.guesses,
          hintsUsed: gameState.hintsUsed,
          remainingGuesses: 6 - gameState.guesses.length
        }
      };
    },
  },

  getGameStatus: {
    description: "Get the current status of the Wordle game",
    parameters: z.object({
      userId: z.string().describe("The user ID to check game status for"),
    }),
    execute: async ({ userId }: { userId: string }) => {
      const gameState = getOrCreateGameState(userId);
      
      return {
        success: true,
        gameState: {
          targetWord: "HIDDEN", // Never reveal the word
          guesses: gameState.guesses,
          hintsUsed: gameState.hintsUsed,
          remainingGuesses: 6 - gameState.guesses.length,
          totalGuesses: gameState.guesses.length
        }
      };
    },
  },

  getHint: {
    description: "Get a hint about the current word (requires payment)",
    parameters: z.object({
      userId: z.string().describe("The user ID to get a hint for"),
    }),
    execute: async ({ userId }: { userId: string }) => {
      const gameState = getOrCreateGameState(userId);
      
      if (gameState.guesses.length === 0) {
        return {
          success: false,
          message: "Start a game first by making a guess!",
        };
      }

      // Get a random letter from the target word
      const uniqueLetters: string[] = [];
      for (const letter of gameState.targetWord.split("")) {
        if (!uniqueLetters.includes(letter)) {
          uniqueLetters.push(letter);
        }
      }

      const randomIndex = Math.floor(Math.random() * uniqueLetters.length);
      const randomLetter = uniqueLetters[randomIndex].toUpperCase();
      const article = ["A", "E", "I", "O", "U"].includes(randomLetter) ? "an" : "a";

      return {
        success: true,
        message: `💡 Hint: The word contains ${article} ${randomLetter}`,
        requiresPayment: true,
        cost: "1.00 USDC"
      };
    },
  },
};