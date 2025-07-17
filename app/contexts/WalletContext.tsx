'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { WalletInfo } from '../types/wordle';
import { createCDPWallet, getWalletBalance } from '../services/wallet';
import { useNetwork } from './NetworkContext';

// Context value type
interface WalletContextValue {
  walletInfo: WalletInfo;
  isInitializing: boolean;
  isRefreshing: boolean;
  initializeWallet: (username: string) => Promise<void>;
  refreshBalances: () => Promise<void>;
  clearWallet: () => void;
}

// Create meaningful default values as per React docs
const defaultWalletInfo: WalletInfo = {
  address: '',
  balance: '0',
  usdcBalance: '0',
  isConnected: false
};

const defaultWalletContext: WalletContextValue = {
  walletInfo: defaultWalletInfo,
  isInitializing: false,
  isRefreshing: false,
  initializeWallet: async () => {
    throw new Error('initializeWallet must be used within a WalletProvider');
  },
  refreshBalances: async () => {
    throw new Error('refreshBalances must be used within a WalletProvider');
  },
  clearWallet: () => {
    throw new Error('clearWallet must be used within a WalletProvider');
  }
};

// Create the context with meaningful default values
const WalletContext = createContext<WalletContextValue>(defaultWalletContext);

// Provider component
interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletInfo, setWalletInfo] = useState<WalletInfo>(defaultWalletInfo);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initializedFor, setInitializedFor] = useState<string | null>(null);
  
  // Get current network from NetworkContext
  const { currentNetwork } = useNetwork();

  const initializeWallet = useCallback(async (username: string) => {
    // Prevent duplicate initialization for the same user
    if (isInitializing || initializedFor === username) return;
    
    try {
      setIsInitializing(true);
      const walletData = await createCDPWallet(username);
      setWalletInfo(walletData);
      setInitializedFor(username);
      console.log(`Wallet initialized for ${username}`);
    } catch (error) {
      console.error('Error initializing wallet:', error);
      throw error;
    } finally {
      setIsInitializing(false);
    }
  }, [isInitializing, initializedFor]);

  const refreshBalances = useCallback(async () => {
    if (!walletInfo.isConnected || !walletInfo.address || isRefreshing) return;

    try {
      setIsRefreshing(true);
      const balances = await getWalletBalance(walletInfo.address, currentNetwork);
      setWalletInfo(prev => ({
        ...prev,
        balance: balances.balance,
        usdcBalance: balances.usdcBalance
      }));
      console.log('Wallet balances refreshed');
    } catch (error) {
      console.error('Error refreshing wallet balances:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [walletInfo.address, walletInfo.isConnected, isRefreshing, currentNetwork]);

  const clearWallet = useCallback(() => {
    setWalletInfo(defaultWalletInfo);
    setInitializedFor(null);
    setIsInitializing(false);
    setIsRefreshing(false);
    console.log('Wallet cleared');
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  // This follows React's official recommendation for context performance
  const contextValue = useMemo<WalletContextValue>(() => ({
    walletInfo,
    isInitializing,
    isRefreshing,
    initializeWallet,
    refreshBalances,
    clearWallet
  }), [walletInfo, isInitializing, isRefreshing, initializeWallet, refreshBalances, clearWallet]);

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

// Custom hook to use the wallet context
export const useWallet = (): WalletContextValue => {
  const context = useContext(WalletContext);
  
  // The context will never be null due to our default values,
  // but we keep this check for development clarity
  if (context === defaultWalletContext) {
    console.warn('useWallet is being used outside of WalletProvider. Using default values.');
  }
  
  return context;
};

// Export the context for advanced use cases (testing, etc.)
export { WalletContext }; 