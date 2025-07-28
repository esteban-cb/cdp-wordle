'use client';

import React, { useState } from 'react';
import { exportEvmAccount } from '@coinbase/cdp-core';
import { useEmbeddedAuth } from '../contexts/EmbeddedAuthContext';
import { useEmbeddedWallet } from '../contexts/EmbeddedWalletContext';

interface PrivateKeyExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivateKeyExportModal: React.FC<PrivateKeyExportModalProps> = ({ isOpen, onClose }) => {
  const { user } = useEmbeddedAuth();
  const { walletInfo } = useEmbeddedWallet();
  
  const [isExporting, setIsExporting] = useState(false);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copied, setCopied] = useState(false);

  // Handle private key export using the simple CDP Core pattern
  const handleExportPrivateKey = async () => {
    setIsExporting(true);
    setError(null);
    setPrivateKey(null);

    try {
      if (!user || !user.evmAccounts || user.evmAccounts.length === 0) {
        setError('No authenticated user or EVM accounts found');
        return;
      }

      const evmAccount = user.evmAccounts[0];
      console.log('Attempting to export private key for:', evmAccount);

      const result = await exportEvmAccount({ evmAccount });
      
      console.log('Private key exported successfully');
      setPrivateKey(result.privateKey);
      setShowPrivateKey(true);
      
    } catch (err) {
      console.error('Private key export error:', err);
      setError(err instanceof Error ? err.message : 'Private key export failed');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle copy to clipboard
  const handleCopyPrivateKey = async () => {
    if (!privateKey) return;

    try {
      await navigator.clipboard.writeText(privateKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setError('Failed to copy to clipboard');
    }
  };

  // Handle close modal
  const handleClose = () => {
    setPrivateKey(null);
    setShowPrivateKey(false);
    setError(null);
    setIsExporting(false);
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Export Private Key</h3>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="px-6 py-6">{/* Modal content will go here */}

          {!showPrivateKey ? (
            // Initial export screen
            <div className="space-y-6">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">🔐</div>
                  <div>
                    <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">Security Warning</h4>
                    <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
                      <li><strong>⚠️ Handle with Care:</strong> Private keys provide full control over your wallet</li>
                      <li><strong>🔒 Export Purpose:</strong> Allows importing wallet into other applications</li>
                      <li><strong>💾 Storage:</strong> Save in a secure, encrypted location</li>
                      <li><strong>🚨 Never Share:</strong> Don't share or store unencrypted</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Wallet Address:</p>
                <p className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">{walletInfo.address}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Type: CDP Embedded Wallet</p>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-800 dark:text-red-300 text-sm whitespace-pre-wrap">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  disabled={isExporting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExportPrivateKey}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={isExporting || !walletInfo.address}
                >
                  {isExporting ? 'Exporting...' : 'Export Private Key'}
                </button>
              </div>
            </div>
          ) : (
            // Private key display screen
            <div className="space-y-6">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="text-green-600 dark:text-green-400">✅</div>
                  <p className="text-green-800 dark:text-green-300 font-medium">Private key exported successfully</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Private Key:</label>
                <div className="relative">
                  <textarea
                    readOnly
                    value={privateKey || ''}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    rows={4}
                  />
                  <button
                    onClick={handleCopyPrivateKey}
                    className="absolute top-2 right-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? '✓ Copied' : '📋 Copy'}
                  </button>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-300 text-sm">
                  <strong>Remember:</strong> Save this private key in a secure location. You won't be able to see it again through this interface.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrivateKeyExportModal; 