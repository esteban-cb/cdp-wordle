'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { createCDPEmbeddedWallet, CDPEmbeddedWallet, EIP1193Provider } from '@coinbase/cdp-core';
import { useEmbeddedAuth } from './EmbeddedAuthContext';
import { useNetwork } from './NetworkContext';
import { http } from 'viem';
import { baseSepolia, base } from 'viem/chains';

// Wallet info type for embedded wallet
interface EmbeddedWalletInfo {
  address: string;
  balance: string;
  usdcBalance: string;
  isConnected: boolean;
}

// Context value type
interface EmbeddedWalletContextValue {
  walletInfo: EmbeddedWalletInfo;
  wallet: CDPEmbeddedWallet | null;
  provider: EIP1193Provider | null;
  isInitializing: boolean;
  isRefreshing: boolean;
  initializeWallet: () => Promise<void>;
  refreshBalances: () => Promise<void>;
  clearWallet: () => void;
}

// Default wallet info
const defaultWalletInfo: EmbeddedWalletInfo = {
  address: '',
  balance: '0',
  usdcBalance: '0',
  isConnected: false
};

// Default context value
const defaultEmbeddedWalletContext: EmbeddedWalletContextValue = {
  walletInfo: defaultWalletInfo,
  wallet: null,
  provider: null,
  isInitializing: false,
  isRefreshing: false,
  initializeWallet: async () => {
    throw new Error('initializeWallet must be used within an EmbeddedWalletProvider');
  },
  refreshBalances: async () => {
    throw new Error('refreshBalances must be used within an EmbeddedWalletProvider');
  },
  clearWallet: () => {
    throw new Error('clearWallet must be used within an EmbeddedWalletProvider');
  }
};

// Create the context
const EmbeddedWalletContext = createContext<EmbeddedWalletContextValue>(defaultEmbeddedWalletContext);

// Provider component
interface EmbeddedWalletProviderProps {
  children: ReactNode;
}

export const EmbeddedWalletProvider: React.FC<EmbeddedWalletProviderProps> = ({ children }) => {
  const [walletInfo, setWalletInfo] = useState<EmbeddedWalletInfo>(defaultWalletInfo);
  const [wallet, setWallet] = useState<CDPEmbeddedWallet | null>(null);
  const [provider, setProvider] = useState<EIP1193Provider | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get auth and network context
  const { isAuthenticated, user } = useEmbeddedAuth();
  const { currentNetwork } = useNetwork();

  // Get ETH balance using public RPC (embedded wallet provider doesn't support eth_getBalance)
  const getETHBalance = useCallback(async (address: string): Promise<string> => {
    if (!currentNetwork) return '0';

    try {
      const response = await fetch(currentNetwork.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [address, 'latest'],
          id: 1,
        }),
      });

      const data = await response.json();
      if (data.error) {
        console.error('RPC error getting ETH balance:', data.error);
        return '0';
      }
      
      // Convert hex to decimal and then to ETH
      const balanceInWei = parseInt(data.result, 16);
      const balanceInEth = balanceInWei / 1e18;
      return balanceInEth.toFixed(4);
    } catch (error) {
      console.error('Error getting ETH balance:', error);
      return '0';
    }
  }, [currentNetwork]);

  // Get USDC balance using public RPC (embedded wallet provider doesn't support eth_call)
  const getUSDCBalance = useCallback(async (address: string): Promise<string> => {
    if (!currentNetwork) {
      console.log('getUSDCBalance: Missing network');
      return '0';
    }

    try {
      console.log('getUSDCBalance: Fetching USDC balance for address:', address);
      console.log('getUSDCBalance: Using USDC contract:', currentNetwork.usdcAddress);
      
      // ERC20 balanceOf function call
      const data = `0x70a08231000000000000000000000000${address.substring(2)}`;
      console.log('getUSDCBalance: Calling balanceOf with data:', data);
      
      const response = await fetch(currentNetwork.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [
            {
              to: currentNetwork.usdcAddress,
              data: data
            },
            'latest'
          ],
          id: 1,
        }),
      });

      const rpcData = await response.json();
      if (rpcData.error) {
        console.error('RPC error getting USDC balance:', rpcData.error);
        return '0';
      }

      console.log('getUSDCBalance: Raw balance response:', rpcData.result);
      
      // Convert hex to decimal (USDC has 6 decimals)
      const balanceInUnits = parseInt(rpcData.result, 16);
      const balanceInUSDC = balanceInUnits / 1e6;
      console.log('getUSDCBalance: Converted balance:', balanceInUSDC);
      
      return balanceInUSDC.toFixed(6);
    } catch (error) {
      console.error('Error getting USDC balance:', error);
      return '0';
    }
  }, [currentNetwork]);

  // Initialize embedded wallet
  const initializeWallet = useCallback(async () => {
    if (!isAuthenticated || !user || isInitializing) return;

    try {
      setIsInitializing(true);
      console.log('Initializing embedded wallet...');

      // Create the embedded wallet with proper Viem configuration
      const embeddedWallet = createCDPEmbeddedWallet({
        chains: [baseSepolia, base],
        transports: {
          [baseSepolia.id]: http(),
          [base.id]: http()
        }
      });

      // Get the provider
      const walletProvider = embeddedWallet.provider;

      // Request accounts (this will automatically use the authenticated user)
      const accounts = await walletProvider.request({
        method: 'eth_requestAccounts'
      });

      if (accounts && accounts.length > 0) {
        const address = accounts[0] as string;
        
        // Get balances
        const ethBalance = await getETHBalance(address);
        const usdcBalance = await getUSDCBalance(address);

        // Update state
        setWallet(embeddedWallet);
        setProvider(walletProvider);
        setWalletInfo({
          address,
          balance: ethBalance,
          usdcBalance,
          isConnected: true
        });

        console.log(`Embedded wallet initialized with address: ${address}`);
      }
    } catch (error) {
      console.error('Error initializing embedded wallet:', error);
      throw error;
    } finally {
      setIsInitializing(false);
    }
  }, [isAuthenticated, user, isInitializing, currentNetwork, getETHBalance, getUSDCBalance]);

  // Refresh wallet balances
  const refreshBalances = useCallback(async () => {
    if (!walletInfo.isConnected || !walletInfo.address || isRefreshing) return;

    try {
      setIsRefreshing(true);
      
      const ethBalance = await getETHBalance(walletInfo.address);
      const usdcBalance = await getUSDCBalance(walletInfo.address);

      setWalletInfo(prev => ({
        ...prev,
        balance: ethBalance,
        usdcBalance
      }));

      console.log('Wallet balances refreshed');
    } catch (error) {
      console.error('Error refreshing wallet balances:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [walletInfo.address, walletInfo.isConnected, isRefreshing, getETHBalance, getUSDCBalance]);

  // Clear wallet state
  const clearWallet = useCallback(() => {
    setWallet(null);
    setProvider(null);
    setWalletInfo(defaultWalletInfo);
    setIsInitializing(false);
    setIsRefreshing(false);
    console.log('Embedded wallet cleared');
  }, []);

  // Auto-initialize wallet when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user && !wallet) {
      initializeWallet();
    } else if (!isAuthenticated && wallet) {
      clearWallet();
    }
  }, [isAuthenticated, user, wallet, initializeWallet, clearWallet]);

  // Set up provider event listeners
  useEffect(() => {
    if (!provider) return;

    const handleAccountsChanged = async (accounts: unknown) => {
      const accountsArray = accounts as string[];
      if (accountsArray.length === 0) {
        clearWallet();
      } else if (accountsArray[0] !== walletInfo.address) {
        // Account changed, refresh wallet info
        const address = accountsArray[0];
        const ethBalance = await getETHBalance(address);
        const usdcBalance = await getUSDCBalance(address);
        
        setWalletInfo({
          address,
          balance: ethBalance,
          usdcBalance,
          isConnected: true
        });
      }
    };

    const handleChainChanged = () => {
      // Refresh balances when chain changes
      refreshBalances();
    };

    const handleConnect = (connectInfo: any) => {
      console.log('Wallet connected:', connectInfo);
    };

    const handleDisconnect = () => {
      console.log('Wallet disconnected');
      clearWallet();
    };

    // Add event listeners
    provider.on('accountsChanged', handleAccountsChanged);
    provider.on('chainChanged', handleChainChanged);
    provider.on('connect', handleConnect);
    provider.on('disconnect', handleDisconnect);

    // Cleanup
    return () => {
      provider.removeListener('accountsChanged', handleAccountsChanged);
      provider.removeListener('chainChanged', handleChainChanged);
      provider.removeListener('connect', handleConnect);
      provider.removeListener('disconnect', handleDisconnect);
    };
  }, [provider, walletInfo.address, getETHBalance, getUSDCBalance, refreshBalances, clearWallet]);

  // Memoize context value
  const contextValue = useMemo<EmbeddedWalletContextValue>(() => ({
    walletInfo,
    wallet,
    provider,
    isInitializing,
    isRefreshing,
    initializeWallet,
    refreshBalances,
    clearWallet
  }), [
    walletInfo,
    wallet,
    provider,
    isInitializing,
    isRefreshing,
    initializeWallet,
    refreshBalances,
    clearWallet
  ]);

  return (
    <EmbeddedWalletContext.Provider value={contextValue}>
      {children}
    </EmbeddedWalletContext.Provider>
  );
};

// Custom hook
export const useEmbeddedWallet = (): EmbeddedWalletContextValue => {
  const context = useContext(EmbeddedWalletContext);
  
  if (context === defaultEmbeddedWalletContext) {
    console.warn('useEmbeddedWallet is being used outside of EmbeddedWalletProvider. Using default values.');
  }
  
  return context;
};

// Export context for advanced use cases
export { EmbeddedWalletContext }; 