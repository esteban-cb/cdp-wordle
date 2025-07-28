// Shared game state for Wordle - ensures both agent and payment hint APIs use the same target word

// Word list for the Wordle game
const WORD_LIST = [
  "apple", "beach", "chart", "dance", "earth", "fault", "glass", "heart", "ivory", "joker",
  "knife", "logic", "money", "night", "ocean", "piano", "query", "river", "solar", "table",
  "unity", "virus", "water", "xenon", "youth", "zebra", "brain", "climb", "dream", "eagle",
  "flame", "ghost", "house", "image", "jumbo", "knots", "lemon", "modal", "nurse", "olive",
  "power", "queen", "radio", "storm", "tiger", "umbra", "vigor", "whale", "xylyl", "yacht"
];

// Store active games in memory (in a real app, this would be in a database)
// Using a global variable to persist across module reloads in development
declare global {
  // eslint-disable-next-line no-var
  var activeWordle: Map<string, { targetWord: string, guesses: string[], hintsUsed: number }> | undefined;
}

const activeGames: Map<string, { targetWord: string, guesses: string[], hintsUsed: number }> = 
  globalThis.activeWordle ?? new Map();

if (!globalThis.activeWordle) {
  globalThis.activeWordle = activeGames;
}

// Store conversation history for AgentKit interactions
declare global {
  // eslint-disable-next-line no-var
  var wordleConversation: Map<string, { text: string, sender: "user" | "agent" }[]> | undefined;
}

const conversationHistory: Map<string, { text: string, sender: "user" | "agent" }[]> = 
  globalThis.wordleConversation ?? new Map();

if (!globalThis.wordleConversation) {
  globalThis.wordleConversation = conversationHistory;
}

// Generate a new random word for a game
export function getRandomWord(): string {
  const randomIndex = Math.floor(Math.random() * WORD_LIST.length);
  return WORD_LIST[randomIndex];
}

// Get or create game state for a user
export function getOrCreateGameState(userId: string): { targetWord: string, guesses: string[], hintsUsed: number } {
  console.log("getOrCreateGameState called for user:", userId);
  console.log("Current activeGames size:", activeGames.size);
  console.log("Current activeGames keys:", Array.from(activeGames.keys()));
  
  if (!activeGames.has(userId)) {
    const newWord = getRandomWord();
    console.log("Creating NEW game state for user:", userId, "with word:", newWord);
    activeGames.set(userId, {
      targetWord: newWord,
      guesses: [],
      hintsUsed: 0
    });
    // Update global reference
    globalThis.activeWordle = activeGames;
  } else {
    console.log("Using EXISTING game state for user:", userId);
    const existing = activeGames.get(userId)!;
    console.log("Existing game state:", existing);
    // Ensure hintsUsed exists (for backwards compatibility)
    if (existing.hintsUsed === undefined) {
      existing.hintsUsed = 0;
    }
  }
  return activeGames.get(userId)!;
}

// Set game state for a user (used when starting a new game)
export function setGameState(userId: string, gameState: { targetWord: string, guesses: string[], hintsUsed?: number }): void {
  console.log("setGameState called for user:", userId, "with state:", gameState);
  activeGames.set(userId, {
    ...gameState,
    hintsUsed: gameState.hintsUsed || 0
  });
  // Update global reference
  globalThis.activeWordle = activeGames;
}

// Delete game state for a user (used when game ends)
export function deleteGameState(userId: string): void {
  activeGames.delete(userId);
}

// Check if game state exists for a user
export function hasGameState(userId: string): boolean {
  return activeGames.has(userId);
}

// Increment hint usage count for a user
export function incrementHintUsage(userId: string): void {
  const gameState = getOrCreateGameState(userId);
  gameState.hintsUsed++;
  console.log(`Incremented hints used for user ${userId}: ${gameState.hintsUsed}`);
}

// Get conversation history for a user
export function getConversationHistory(userId: string): { text: string, sender: "user" | "agent" }[] {
  if (!conversationHistory.has(userId)) {
    conversationHistory.set(userId, []);
  }
  return conversationHistory.get(userId)!;
}

// Add message to conversation history
export function addToConversationHistory(userId: string, message: { text: string, sender: "user" | "agent" }): void {
  const history = getConversationHistory(userId);
  history.push(message);
}

// Check if word is in the word list
export function isValidWord(word: string): boolean {
  return WORD_LIST.includes(word.toLowerCase());
}

export { WORD_LIST }; 