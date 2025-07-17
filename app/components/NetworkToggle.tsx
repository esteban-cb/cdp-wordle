'use client';

import React from 'react';
import { useNetwork } from '../contexts/NetworkContext';

const NetworkToggle: React.FC = () => {
  const { currentNetwork, switchNetwork, isSwitching, availableNetworks } = useNetwork();

  const handleNetworkSwitch = async (networkId: string) => {
    try {
      await switchNetwork(networkId as any);
    } catch (error) {
      console.error('Failed to switch network:', error);
      // You could add a toast notification here
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Network:
      </span>
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {availableNetworks.map((network) => (
          <button
            key={network.id}
            onClick={() => handleNetworkSwitch(network.id)}
            disabled={isSwitching}
            className={`
              px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200
              ${
                currentNetwork.id === network.id
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
              }
              ${isSwitching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-center space-x-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  network.isTestnet ? 'bg-yellow-400' : 'bg-green-400'
                }`}
              />
              <span>{network.isTestnet ? 'Testnet' : 'Mainnet'}</span>
            </div>
          </button>
        ))}
      </div>
      {isSwitching && (
        <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500"></div>
          <span>Switching...</span>
        </div>
      )}
    </div>
  );
};

export default NetworkToggle; 