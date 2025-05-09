import React, { useState, useEffect, useRef } from 'react';
import { WalletInfo } from '../types/wordle';

interface WalletConnectProps {
  onWalletConnected: (info: WalletInfo) => void;
}

// Base Sepolia USDC contract address
const BASE_SEPOLIA_USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

const WalletConnect: React.FC<WalletConnectProps> = ({ onWalletConnected }) => {
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({
    address: '',
    balance: '0',
    usdcBalance: '0', // Added USDC balance
    isConnected: false,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  // Add a ref to track if we've already sent the initial message
  const initialMessageSent = useRef(false);
  // Add state for requesting funds
  const [isRequestingFunds, setIsRequestingFunds] = useState(false);

  // Check if wallet is already connected on component mount
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          // Get connected accounts
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          
          if (accounts.length > 0) {
            const address = accounts[0];
            const balance = await getWalletBalance(address);
            const usdcBalance = await getUSDCBalance(address);
            
            const updatedInfo = {
              address,
              balance,
              usdcBalance,
              isConnected: true,
            };
            
            setWalletInfo(updatedInfo);
            
            // Only notify parent once to prevent message loop
            if (!initialMessageSent.current) {
              onWalletConnected(updatedInfo);
              initialMessageSent.current = true;
            }
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error);
        }
      }
    };
    
    checkWalletConnection();
  }, [onWalletConnected]);

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected wallet
          const disconnectedInfo = {
            address: '',
            balance: '0',
            usdcBalance: '0',
            isConnected: false,
          };
          setWalletInfo(disconnectedInfo);
          onWalletConnected(disconnectedInfo);
          // Reset the flag when wallet is disconnected
          initialMessageSent.current = false;
        } else {
          // User switched accounts
          const address = accounts[0];
          const balance = await getWalletBalance(address);
          const usdcBalance = await getUSDCBalance(address);
          
          const updatedInfo = {
            address,
            balance,
            usdcBalance,
            isConnected: true,
          };
          
          setWalletInfo(updatedInfo);
          onWalletConnected(updatedInfo);
        }
      };
      
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      // Cleanup listener on unmount
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, [onWalletConnected]);

  // Listen for chain/network changes too
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleChainChanged = () => {
        // When the chain changes, refresh the page
        window.location.reload();
      };
      
      window.ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);
  
  // Add periodic balance checking (every 30 seconds)
  useEffect(() => {
    if (!walletInfo.isConnected) return;
    
    const checkInterval = setInterval(async () => {
      try {
        const newBalance = await getWalletBalance(walletInfo.address);
        const newUsdcBalance = await getUSDCBalance(walletInfo.address);
        if (newBalance !== walletInfo.balance || newUsdcBalance !== walletInfo.usdcBalance) {
          const updatedInfo = {
            ...walletInfo,
            balance: newBalance,
            usdcBalance: newUsdcBalance
          };
          setWalletInfo(updatedInfo);
          onWalletConnected(updatedInfo);
        }
      } catch (error) {
        console.error('Error checking wallet balance:', error);
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(checkInterval);
  }, [walletInfo.isConnected, walletInfo.address, walletInfo.balance, walletInfo.usdcBalance, onWalletConnected]);

  const getWalletBalance = async (address: string): Promise<string> => {
    try {
      const balanceHex = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      
      // Convert balance from wei (hex) to ETH (decimal with 4 decimal places)
      const balanceWei = parseInt(balanceHex, 16);
      const balanceEth = balanceWei / 1e18;
      return balanceEth.toFixed(4);
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return '0';
    }
  };

  // Function to get USDC balance
  const getUSDCBalance = async (address: string): Promise<string> => {
    try {
      // Call the ERC20 balanceOf function
      const data = `0x70a08231000000000000000000000000${address.substring(2)}`; // balanceOf(address)
      
      const balanceHex = await window.ethereum.request({
        method: 'eth_call',
        params: [
          {
            to: BASE_SEPOLIA_USDC_ADDRESS,
            data: data,
          },
          'latest',
        ],
      });
      
      // Convert the hex balance to a number
      const balanceInt = parseInt(balanceHex, 16);
      
      // USDC has 6 decimals
      const balance = balanceInt / 1e6;
      return balance.toFixed(2);
    } catch (error) {
      console.error('Error getting USDC balance:', error);
      return '0';
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask is not installed. Please install MetaMask to play this game.');
      return;
    }
    
    setIsConnecting(true);
    
    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      const balance = await getWalletBalance(address);
      const usdcBalance = await getUSDCBalance(address);
      
      const updatedInfo = {
        address,
        balance,
        usdcBalance,
        isConnected: true,
      };
      
      setWalletInfo(updatedInfo);
      // Mark that we've sent a message
      initialMessageSent.current = true;
      onWalletConnected(updatedInfo);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Add a function to manually refresh balance
  const refreshBalance = async () => {
    if (!walletInfo.isConnected) return;
    
    try {
      const newBalance = await getWalletBalance(walletInfo.address);
      const newUsdcBalance = await getUSDCBalance(walletInfo.address);
      const updatedInfo = {
        ...walletInfo,
        balance: newBalance,
        usdcBalance: newUsdcBalance
      };
      setWalletInfo(updatedInfo);
      onWalletConnected(updatedInfo);
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  };

  // Function to request funds via the agent
  const requestFunds = () => {
    if (!walletInfo.isConnected) return;
    
    setIsRequestingFunds(true);
    // Use the agent to request funds
    onWalletConnected({
      ...walletInfo,
      // Set a special flag to trigger a message asking for funds
      requestingFunds: true
    } as any);
    
    setTimeout(() => {
      setIsRequestingFunds(false);
    }, 3000); // Reset after 3 seconds
  };

  // Function to switch to Base Sepolia testnet
  const switchToBaseSepolia = async () => {
    if (typeof window.ethereum === 'undefined' || !walletInfo.isConnected) return;
    
    try {
      // Base Sepolia details
      const baseSepoliaChainId = '0x14a34';
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: baseSepoliaChainId }],
      }).catch(async (switchError: any) => {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: baseSepoliaChainId,
                chainName: 'Base Sepolia Testnet',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://sepolia.base.org'],
                blockExplorerUrls: ['https://sepolia.basescan.org'],
              },
            ],
          });
        } else {
          throw switchError;
        }
      });
      
      // Refresh balance after switching networks
      refreshBalance();
    } catch (error) {
      console.error('Error switching to Base Sepolia:', error);
      alert('Failed to switch networks. Please try again.');
    }
  };

  return (
    <div className="wallet-connect mb-4 px-4 py-3 border border-gray-200 rounded-lg shadow-sm bg-gray-50">
      {!walletInfo.isConnected ? (
        <div className="text-center">
          <p className="text-gray-700 mb-2">Connect your wallet to play Wordle</p>
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className={`px-4 py-2 rounded-md font-semibold ${
              isConnecting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      ) : (
        <div className="flex flex-row items-center justify-between">
          <div className="flex items-center">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full mr-2"></div>
            <span className="text-gray-800 font-medium">
              {walletInfo.address.substring(0, 6)}...{walletInfo.address.substring(walletInfo.address.length - 4)}
            </span>
          </div>
          
          <div className="flex items-center space-x-5">
            <div className="flex items-center space-x-3">
              <div>
                <span className="font-semibold text-lg">{walletInfo.usdcBalance}</span>
                <span className="text-xs text-gray-500 ml-1">USDC</span>
              </div>
              
              <div className="flex space-x-1">
                <button 
                  onClick={refreshBalance}
                  className="text-xs p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                  title="Refresh balance"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button 
                  onClick={requestFunds}
                  disabled={isRequestingFunds}
                  className={`text-xs p-1.5 rounded ${
                    isRequestingFunds
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-green-600 hover:bg-green-50'
                  }`}
                  title="Request test USDC funds"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
                <button 
                  onClick={switchToBaseSepolia}
                  className="text-xs p-1.5 text-purple-600 hover:bg-purple-50 rounded"
                  title="Switch to Base Sepolia Testnet"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Add type declaration for window.ethereum
declare global {
  interface Window {
    ethereum: any;
  }
}

export default WalletConnect; 