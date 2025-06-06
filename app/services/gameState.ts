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
const activeGames: Map<string, { targetWord: string, guesses: string[] }> = new Map();

// Store conversation history for AgentKit interactions
const conversationHistory: Map<string, { text: string, sender: "user" | "agent" }[]> = new Map();

// Generate a new random word for a game
export function getRandomWord(): string {
  const randomIndex = Math.floor(Math.random() * WORD_LIST.length);
  return WORD_LIST[randomIndex];
}

// Get or create game state for a user
export function getOrCreateGameState(userId: string): { targetWord: string, guesses: string[] } {
  if (!activeGames.has(userId)) {
    activeGames.set(userId, {
      targetWord: getRandomWord(),
      guesses: []
    });
  }
  return activeGames.get(userId)!;
}

// Set game state for a user (used when starting a new game)
export function setGameState(userId: string, gameState: { targetWord: string, guesses: string[] }): void {
  activeGames.set(userId, gameState);
}

// Delete game state for a user (used when game ends)
export function deleteGameState(userId: string): void {
  activeGames.delete(userId);
}

// Check if game state exists for a user
export function hasGameState(userId: string): boolean {
  return activeGames.has(userId);
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