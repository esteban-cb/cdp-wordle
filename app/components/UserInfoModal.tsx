'use client';

import React, { useState } from 'react';
import { formatAddress } from '../services/wallet';
import { useEmbeddedAuth } from '../contexts/EmbeddedAuthContext';
import { useEmbeddedWallet } from '../contexts/EmbeddedWalletContext';

interface UserInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserInfoModal: React.FC<UserInfoModalProps> = ({ 
  isOpen, 
  onClose
}) => {
  const { user } = useEmbeddedAuth();
  const { walletInfo, refreshBalances } = useEmbeddedWallet();
  const [copySuccess, setCopySuccess] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isOpen || !user) return null;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch {
      setCopySuccess('Failed to copy');
    }
  };

  const handleRefreshBalances = async () => {
    try {
      setIsRefreshing(true);
      await refreshBalances();
      setIsRefreshing(false);
    } catch (error) {
      console.error('Error refreshing balances:', error);
      setIsRefreshing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">User Profile</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* User Info */}
          <div className="flex items-center">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-full mr-4 flex-shrink-0">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">{user.userId.substring(0, 8)}...</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 truncate">CDP User</p>
            </div>
          </div>
          
          {/* Wallet Section */}
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <h5 className="font-semibold mb-3 flex items-center text-gray-900 dark:text-gray-100">
              <svg className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              CDP Wallet
            </h5>
            
            <div className="mb-3">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Address: </span>
              <span className="font-mono text-sm text-gray-900 dark:text-gray-100">{formatAddress(walletInfo.address)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 py-2.5 px-3 rounded-lg flex-grow font-mono text-sm text-gray-900 dark:text-gray-100 truncate">
                {walletInfo.address}
              </div>
              <button 
                onClick={() => copyToClipboard(walletInfo.address)}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors flex-shrink-0"
                title="Copy to clipboard"
              >
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            
            {copySuccess && (
              <p className="text-green-600 dark:text-green-400 text-sm mt-2 font-medium">{copySuccess}</p>
            )}
          </div>
          
          {/* Balances */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ETH Balance</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{walletInfo.balance}</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">USDC Balance</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{walletInfo.usdcBalance}</p>
            </div>
          </div>
          
          {/* Refresh Button */}
          <div className="flex justify-end">
            <button
              onClick={handleRefreshBalances}
              disabled={isRefreshing}
              className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isRefreshing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Balances
                </>
              )}
            </button>
          </div>
          
          {/* Private Key Export Section */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h5 className="font-semibold mb-3 flex items-center text-gray-900 dark:text-gray-100">
              <svg className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-6 6c-1.105 0-2.12-.2-3-.566M15 7a2 2 0 00-2 2m2-2v2a2 2 0 01-2 2m0 0V9a2 2 0 012-2m-2 2a2 2 0 00-2 2v2a2 2 0 002 2m0 0h2a2 2 0 002-2v-2a2 2 0 00-2-2m0 0V7a2 2 0 012-2" />
              </svg>
              Wallet Security
            </h5>
            
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3">
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Security Warning</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Private keys provide full control over your wallet. Keep them secure!</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => {
                onClose();
                // Trigger private key export modal from parent
                window.dispatchEvent(new CustomEvent('openPrivateKeyModal'));
              }}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg mb-3"
            >
              Export Private Key
            </button>
          </div>
          
          {/* Footer Info */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p><span className="font-medium">User ID:</span> {user.userId.substring(0, 12)}...</p>
              <p><span className="font-medium">Authentication:</span> CDP Embedded Wallet</p>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserInfoModal; 