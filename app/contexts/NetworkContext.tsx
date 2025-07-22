'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
import { NetworkConfig, NetworkType } from '../types/wordle';
import { NETWORKS, DEFAULT_NETWORK } from '../config/networks';

// Context value type
interface NetworkContextValue {
  currentNetwork: NetworkConfig;
  switchNetwork: (networkId: NetworkType) => Promise<void>;
  isSwitching: boolean;
  availableNetworks: NetworkConfig[];
}

// Create meaningful default values
const defaultNetworkContext: NetworkContextValue = {
  currentNetwork: DEFAULT_NETWORK,
  switchNetwork: async () => {
    throw new Error('switchNetwork must be used within a NetworkProvider');
  },
  isSwitching: false,
  availableNetworks: Object.values(NETWORKS)
};

// Create the context
const NetworkContext = createContext<NetworkContextValue>(defaultNetworkContext);

// Provider component
interface NetworkProviderProps {
  children: ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
  const [currentNetwork, setCurrentNetwork] = useState<NetworkConfig>(DEFAULT_NETWORK);
  const [isSwitching, setIsSwitching] = useState(false);

  // Load network preference from localStorage on mount
  useEffect(() => {
    const savedNetwork = localStorage.getItem('preferred-network');
    if (savedNetwork && NETWORKS[savedNetwork]) {
      setCurrentNetwork(NETWORKS[savedNetwork]);
    }
  }, []);

  const switchNetwork = useCallback(async (networkId: NetworkType) => {
    if (isSwitching || currentNetwork.id === networkId) return;

    try {
      setIsSwitching(true);
      
      // Update the current network
      const newNetwork = NETWORKS[networkId];
      if (!newNetwork) {
        throw new Error(`Network ${networkId} not found`);
      }

      setCurrentNetwork(newNetwork);
      
      // Save preference to localStorage
      localStorage.setItem('preferred-network', networkId);
      
      // If MetaMask is available, try to switch the network
      if (typeof window.ethereum !== 'undefined') {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: newNetwork.chainId }],
          });
        } catch (switchError: any) {
          // If the network is not added to MetaMask, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: newNetwork.chainId,
                  chainName: newNetwork.name,
                  nativeCurrency: {
                    name: 'ETH',
                    symbol: 'ETH',
                    decimals: 18,
                  },
                  rpcUrls: [newNetwork.rpcUrl],
                  blockExplorerUrls: [newNetwork.blockExplorer],
                },
              ],
            });
          } else {
            console.warn('Failed to switch network in MetaMask:', switchError);
          }
        }
      }

      console.log(`Switched to network: ${newNetwork.name}`);
    } catch (error) {
      console.error('Error switching network:', error);
      throw error;
    } finally {
      setIsSwitching(false);
    }
  }, [currentNetwork.id, isSwitching]);

  // Memoize context value
  const contextValue = useMemo<NetworkContextValue>(() => ({
    currentNetwork,
    switchNetwork,
    isSwitching,
    availableNetworks: Object.values(NETWORKS)
  }), [currentNetwork, switchNetwork, isSwitching]);

  return (
    <NetworkContext.Provider value={contextValue}>
      {children}
    </NetworkContext.Provider>
  );
};

// Custom hook to use the network context
export const useNetwork = (): NetworkContextValue => {
  const context = useContext(NetworkContext);
  
  if (context === defaultNetworkContext) {
    console.warn('useNetwork is being used outside of NetworkProvider. Using default values.');
  }
  
  return context;
};

// Export the context for advanced use cases
export { NetworkContext }; 