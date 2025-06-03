'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { LetterStatus, KeyboardStatus, WordleGuess, MAX_GUESSES, WORD_LENGTH } from '../types/wordle';

// Context value type
interface GameContextValue {
  guesses: WordleGuess[];
  keyStatus: KeyboardStatus;
  isGameOver: boolean;
  processedMessages: Set<string>;
  addGuess: (word: string, result: LetterStatus[]) => void;
  updateKeyboardStatus: (guess: string, result: LetterStatus[]) => void;
  startNewGame: () => void;
  clearGameState: () => void;
  addProcessedMessage: (messageId: string) => void;
  hasProcessedMessage: (messageId: string) => boolean;
}

// Create meaningful default values as per React docs
const defaultGameContext: GameContextValue = {
  guesses: [],
  keyStatus: {},
  isGameOver: false,
  processedMessages: new Set<string>(),
  addGuess: () => {
    throw new Error('addGuess must be used within a GameProvider');
  },
  updateKeyboardStatus: () => {
    throw new Error('updateKeyboardStatus must be used within a GameProvider');
  },
  startNewGame: () => {
    throw new Error('startNewGame must be used within a GameProvider');
  },
  clearGameState: () => {
    throw new Error('clearGameState must be used within a GameProvider');
  },
  addProcessedMessage: () => {
    throw new Error('addProcessedMessage must be used within a GameProvider');
  },
  hasProcessedMessage: () => {
    throw new Error('hasProcessedMessage must be used within a GameProvider');
  }
};

// Create the context with meaningful default values
const GameContext = createContext<GameContextValue>(defaultGameContext);

// Provider component
interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const [guesses, setGuesses] = useState<WordleGuess[]>([]);
  const [keyStatus, setKeyStatus] = useState<KeyboardStatus>({});
  const [isGameOver, setIsGameOver] = useState(false);
  const [processedMessages, setProcessedMessages] = useState<Set<string>>(new Set());

  const addGuess = useCallback((word: string, result: LetterStatus[]) => {
    // Check if this exact guess is already in the guesses array to prevent duplicates
    setGuesses(prev => {
      const isDuplicate = prev.some(existingGuess => existingGuess.word === word);
      if (isDuplicate) return prev;
      
      const newGuess = { word, result };
      const updatedGuesses = [...prev, newGuess];
      
      // Check if game is over (all correct or max guesses)
      const isWin = result.every(status => status === 'correct');
      const isLoss = updatedGuesses.length >= MAX_GUESSES && !isWin;
      
      if (isWin || isLoss) {
        setIsGameOver(true);
      }
      
      return updatedGuesses;
    });
  }, []);

  const updateKeyboardStatus = useCallback((guess: string, result: LetterStatus[]) => {
    setKeyStatus(prev => {
      const newKeyStatus = { ...prev };
      
      for (let i = 0; i < guess.length; i++) {
        const letter = guess[i];
        const status = result[i];
        
        // Only update if the new status is better
        // Priority: correct > present > absent > undefined
        if (!newKeyStatus[letter] || 
            (status === 'correct') || 
            (status === 'present' && newKeyStatus[letter] !== 'correct')) {
          newKeyStatus[letter] = status;
        }
      }
      
      return newKeyStatus;
    });
  }, []);

  const startNewGame = useCallback(() => {
    setGuesses([]);
    setKeyStatus({});
    setIsGameOver(false);
    setProcessedMessages(new Set());
  }, []);

  const clearGameState = useCallback(() => {
    setGuesses([]);
    setKeyStatus({});
    setIsGameOver(false);
    setProcessedMessages(new Set());
  }, []);

  const addProcessedMessage = useCallback((messageId: string) => {
    setProcessedMessages(prev => {
      const newSet = new Set(prev);
      newSet.add(messageId);
      return newSet;
    });
  }, []);

  const hasProcessedMessage = useCallback((messageId: string) => {
    return processedMessages.has(messageId);
  }, [processedMessages]);

  // Memoize context value to prevent unnecessary re-renders
  // This follows React's official recommendation for context performance
  const contextValue = useMemo<GameContextValue>(() => ({
    guesses,
    keyStatus,
    isGameOver,
    processedMessages,
    addGuess,
    updateKeyboardStatus,
    startNewGame,
    clearGameState,
    addProcessedMessage,
    hasProcessedMessage
  }), [
    guesses,
    keyStatus,
    isGameOver,
    processedMessages,
    addGuess,
    updateKeyboardStatus,
    startNewGame,
    clearGameState,
    addProcessedMessage,
    hasProcessedMessage
  ]);

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
};

// Custom hook to use the game context
export const useGame = (): GameContextValue => {
  const context = useContext(GameContext);
  
  // The context will never be null due to our default values,
  // but we keep this check for development clarity
  if (context === defaultGameContext) {
    console.warn('useGame is being used outside of GameProvider. Using default values.');
  }
  
  return context;
};

// Export the context for advanced use cases (testing, etc.)
export { GameContext }; 