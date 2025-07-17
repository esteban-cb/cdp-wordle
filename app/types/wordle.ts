export type LetterStatus = "correct" | "present" | "absent" | "empty";

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

// Network configuration types
export type NetworkType = "base-sepolia" | "base";

export interface NetworkConfig {
  id: NetworkType;
  name: string;
  chainId: string;
  rpcUrl: string;
  blockExplorer: string;
  usdcAddress: string;
  isTestnet: boolean;
  faucetUrl?: string;
}

// Game constants
export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;
export const MIN_BALANCE_TO_PLAY = 1; // Minimum USDC balance required to play
