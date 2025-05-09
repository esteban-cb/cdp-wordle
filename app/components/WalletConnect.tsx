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
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center mb-2 md:mb-0">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <p className="text-gray-800 font-medium">
              {walletInfo.address.substring(0, 6)}...{walletInfo.address.substring(walletInfo.address.length - 4)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div>
              <div className="flex flex-col">
                <p className="text-gray-700">
                  <span className="font-semibold">{walletInfo.usdcBalance}</span> USDC 
                  <span className="text-xs ml-1 text-gray-600">(for gameplay)</span>
                </p>
                <p className="text-gray-700 text-xs">
                  <span className="font-semibold">{walletInfo.balance}</span> ETH 
                  <span className="text-xs ml-1 text-gray-600">(for gas)</span>
                </p>
              </div>
              <div className="flex mt-1 space-x-1">
                <button 
                  onClick={refreshBalance}
                  className="text-xs px-2 py-1 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50"
                  title="Refresh balance"
                >
                  Refresh
                </button>
                <button 
                  onClick={requestFunds}
                  disabled={isRequestingFunds}
                  className={`text-xs px-2 py-1 rounded ${
                    isRequestingFunds
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                  }`}
                  title="Request test USDC funds"
                >
                  Get Funds
                </button>
                <button 
                  onClick={switchToBaseSepolia}
                  className="text-xs px-2 py-1 text-purple-600 hover:text-purple-800 rounded hover:bg-purple-50"
                  title="Switch to Base Sepolia Testnet"
                >
                  Base Sepolia
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