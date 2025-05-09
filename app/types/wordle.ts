export type LetterStatus = 'correct' | 'present' | 'absent' | 'empty';

export interface WordleGuess {
  word: string;
  result: LetterStatus[];
}

export interface KeyboardStatus {
  [key: string]: LetterStatus;
}

export interface WalletInfo {
  address: string;
  balance: string;
  usdcBalance: string;
  isConnected: boolean;
}

// Game constants
export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;
export const MIN_BALANCE_TO_PLAY = 10; // Minimum USDC balance required to play (changed from ETH) 