"use client";

import React, { useState, useEffect, useRef } from 'react';
import WordleRow from './components/WordleRow';
import WordleKeyboard from './components/WordleKeyboard';
import HowToPlayModal from './components/HowToPlayModal';
import EmbeddedAuth from './components/EmbeddedAuth';
import PrivateKeyExportModal from './components/PrivateKeyExportModal';
import { LetterStatus, MIN_BALANCE_TO_PLAY, WORD_LENGTH } from './types/wordle';
import { useAgent } from './hooks/useAgent';
import ReactMarkdown from 'react-markdown';
import UserInfoModal from './components/UserInfoModal';
import { useEmbeddedAuth } from './contexts/EmbeddedAuthContext';
import { useEmbeddedWallet } from './contexts/EmbeddedWalletContext';
import { useGame } from './contexts/GameContext';
import { useNetwork } from './contexts/NetworkContext';
import { requestTestnetFunds } from './services/request_funds';
import NetworkToggle from './components/NetworkToggle';

/**
 * Home page for the CDP Wordle Application
 * Simplified to prevent excessive re-renders and API calls
 *
 * @returns {React.ReactNode} The home page
 */
export default function Home() {
  // Context hooks
  const { user, isAuthenticated, isLoading: authLoading } = useEmbeddedAuth();
  const { walletInfo, isInitializing, initializeWallet, clearWallet, refreshBalances } = useEmbeddedWallet();
  const { currentNetwork } = useNetwork();
  const { 
    guesses, 
    keyStatus, 
    isGameOver, 
    addGuess, 
    updateKeyboardStatus, 
    startNewGame, 
    clearGameState,
    addProcessedMessage,
    hasProcessedMessage
  } = useGame();

  // Use the agent hook for chat functionality
  const { messages, sendMessage, isThinking, clearMessages } = useAgent(currentNetwork);
  
  // Local state for UI
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showUserInfoModal, setShowUserInfoModal] = useState(false);
  const [showPrivateKeyModal, setShowPrivateKeyModal] = useState(false);
  const [isGettingHint, setIsGettingHint] = useState(false);
  const [isGettingFunds, setIsGettingFunds] = useState(false);

  // Refs to track state
  const welcomeMessageSent = useRef(false);
  const walletInitialized = useRef(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle payment hint button click
  const handleGetPaymentHint = async () => {
    if (!walletInfo.isConnected || !walletInfo.address) {
      alert('Please ensure your wallet is connected first.');
      return;
    }

    setIsGettingHint(true);
    try {
      console.log('🚀 Using real X402 payments with embedded wallet');
      
      console.log('💳 Network:', currentNetwork?.name || 'Base Sepolia');
      console.log('💰 Payment: $1.00 USDC per hint');
      console.log('🔄 Generating X-PAYMENT header with embedded wallet...');
      
      // Use the working embedded wallet and X402 flow to generate header
      const { getViemAccount } = await import('./services/embedded-viem-account');
      const { withPaymentInterceptor } = await import('x402-axios');
      const axios = (await import('axios')).default;
      
      const networkId = currentNetwork?.id || 'base-sepolia';
      const baseURL = networkId === 'base' 
        ? 'https://73scps14lf.execute-api.us-east-1.amazonaws.com/prod'
        : 'https://ippt4twld3.execute-api.us-east-1.amazonaws.com/prod';
      
      console.log('🔑 Creating Viem account from embedded wallet...');
      const viemAccount = await getViemAccount();
      console.log('✅ Embedded wallet account ready:', viemAccount.address);
      
      let capturedXPaymentHeader = '';
      
      // Create interceptor to capture X-PAYMENT header
      const api = withPaymentInterceptor(
        axios.create({
          baseURL,
          timeout: 30000,
        }),
        viemAccount
      );
      
      // Add request interceptor to capture X-PAYMENT header
      api.interceptors.request.use((config) => {
        if (config.headers['X-PAYMENT']) {
          console.log('✅ X-PAYMENT header found!');
          capturedXPaymentHeader = config.headers['X-PAYMENT'];
          console.log('📏 Header length:', capturedXPaymentHeader.length);
          console.log('🔍 Header preview:', capturedXPaymentHeader.substring(0, 50) + '...');
          
          // Cancel the request since we only need the header
          const error = new Error('Header captured, canceling to avoid CORS');
          error.name = 'HeaderCaptured';
          throw error;
        }
        return config;
      });
      
      try {
        console.log('🔄 Triggering X402 flow to generate payment header...');
        await api.get('/hint');
      } catch (error: any) {
        if (error.name === 'HeaderCaptured') {
          console.log('✅ X-PAYMENT header captured successfully!');
        } else if (capturedXPaymentHeader) {
          console.log('✅ X-PAYMENT header generated successfully!');
        } else {
          console.error('❌ Failed to generate X-PAYMENT header:', error.message);
          throw new Error(`X402 header generation failed: ${error.message}`);
        }
      }
      
      if (!capturedXPaymentHeader) {
        throw new Error('X-PAYMENT header was not generated');
      }
      
      // Now send the X-PAYMENT header to server-side proxy to avoid CORS
      console.log('📡 Sending X-PAYMENT header to server-side proxy...');
      const response = await fetch('/api/payment-hint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: walletInfo.address,
          network: currentNetwork,
          xPaymentHeader: capturedXPaymentHeader
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment request failed');
      }

      const result = await response.json();
      console.log('✅ Real X402 Payment result:', result);
      
              // Send detailed payment information to the chat
        if (result && result.hint) {
          const isRealPayment = result.paymentDetails?.paymentScheme === 'x402' && !result.fallback;
          const paymentTitle = isRealPayment ? 'X402 Payment Successful!' : (result.fallback ? 'X402 Payment Failed - Fallback Used!' : 'Hint Generated Successfully!');
          
          let detailedMessage = `💰 **${paymentTitle}**\n\n`;
          detailedMessage += `🎯 **Your Hint:** ${result.hint}\n\n`;
          detailedMessage += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        // Add comprehensive X402 payment details if available
        if (result.paymentDetails) {
          const details = result.paymentDetails;
          
          // Basic Payment Information
          detailedMessage += `📋 **Payment Summary**\n\n`;
          detailedMessage += `⏰ **Timestamp:** ${new Date(details.timestamp).toLocaleString()}\n\n`;
          detailedMessage += `👛 **Wallet:** \`${details.walletAddress.substring(0, 10)}...${details.walletAddress.substring(details.walletAddress.length - 8)}\`\n\n`;
          detailedMessage += `🌐 **Resource:** ${details.paymentResource}\n\n`;
          const statusIcon = details.paymentSuccessful ? '🟢' : '🔴';
          const statusText = isRealPayment 
            ? (details.paymentSuccessful ? 'Payment Success' : 'Payment Failed')
            : (details.paymentSuccessful ? 'Hint Generated' : 'Generation Failed');
          detailedMessage += `✅ **Status:** ${statusIcon} ${statusText}\n\n`;
          detailedMessage += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
          
          // X402 Protocol Information
          if (details.x402ProtocolVersion || details.paymentScheme || details.paymentNetwork) {
            detailedMessage += `🔗 **X402 Protocol Details**\n\n`;
            if (details.x402ProtocolVersion) {
              detailedMessage += `📦 **Protocol Version:** v${details.x402ProtocolVersion}\n\n`;
            }
            if (details.paymentScheme) {
              detailedMessage += `⚡ **Payment Scheme:** ${details.paymentScheme}\n\n`;
            }
            if (details.paymentNetwork) {
              const networkName = currentNetwork?.name || "Unknown Network";
              detailedMessage += `🌐 **Network:** ${details.paymentNetwork} (${networkName})\n\n`;
            }
            detailedMessage += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
          }
          
          // Transaction & Settlement Details
          if (details.transactionHash || details.networkId || details.settlementDetails) {
            detailedMessage += `⛓️ **Blockchain Transaction**\n\n`;
            if (details.transactionHash) {
              detailedMessage += `🔗 **Transaction Hash:**\n\`${details.transactionHash}\`\n\n`;
              const explorerUrl = currentNetwork?.blockExplorer || "https://basescan.org";
              detailedMessage += `🔍 **View on Explorer:**\n[BaseScan →](${explorerUrl}/tx/${details.transactionHash})\n\n`;
            }
            if (details.networkId) {
              detailedMessage += `🌐 **Network ID:** ${details.networkId}\n\n`;
            }
            if (details.settlementDetails) {
              detailedMessage += `✅ **Settlement:** Confirmed on blockchain\n\n`;
            }
            detailedMessage += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
          }
          
          // CDP Integration Status  
          detailedMessage += `🏗️ **CDP Integration Status**\n\n`;
          detailedMessage += `${details.cdpAccountCreated ? '✅' : '❌'} **CDP Account:** ${details.cdpAccountCreated ? 'Created successfully' : 'Failed to create'}\n\n`;
          detailedMessage += `${details.viemAdapterCreated ? '✅' : '❌'} **Viem Adapter:** ${details.viemAdapterCreated ? 'Initialized successfully' : 'Failed to initialize'}\n\n`;
          detailedMessage += `${details.x402PaymentAttempted ? '✅' : '❌'} **X402 Payment:** ${details.x402PaymentAttempted ? 'Payment attempted' : 'No payment attempt'}\n\n`;
          detailedMessage += `${details.eip712SigningSuccessful ? '✅' : (details.eip712SigningAttempted ? '⚠️' : '❌')} **EIP-712 Signing:** ${details.eip712SigningSuccessful ? 'Signed successfully' : (details.eip712SigningAttempted ? 'Attempted but failed' : 'Not attempted')}\n\n`;
          detailedMessage += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
          
          // Payment Execution Response Details
          if (details.paymentExecutionResponse) {
            detailedMessage += `📊 **Payment Execution Response**\n\n`;
            const execResponse = details.paymentExecutionResponse;
            if (typeof execResponse === 'object') {
              Object.entries(execResponse).forEach(([key, value]) => {
                if (key === 'txHash' && value) {
                  detailedMessage += `**Transaction Hash:** \`${value}\`\n\n`;
                } else if (key === 'success' && value !== null) {
                  detailedMessage += `**Success:** ${value ? '✅ True' : '❌ False'}\n\n`;
                } else if (key === 'networkId' && value) {
                  detailedMessage += `**Network ID:** ${value}\n\n`;
                } else if (value !== null && value !== undefined && key !== 'txHash' && key !== 'success' && key !== 'networkId') {
                  const displayValue = typeof value === 'string' ? value : JSON.stringify(value);
                  detailedMessage += `**${key}:** ${displayValue}\n\n`;
                }
              });
            }
            detailedMessage += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
          }
          
          // Signing Events Timeline
          if (details.signingEvents && details.signingEvents.length > 0) {
            detailedMessage += `📝 **Payment Process Timeline**\n\n`;
            details.signingEvents.forEach((event: string, index: number) => {
              detailedMessage += `**${index + 1}.** ${event}\n\n`;
            });
            detailedMessage += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
          }
          
          // Error Information (if any)
          if (details.fallbackUsed && details.errorMessage) {
            detailedMessage += `⚠️ **Payment Notice**\n\n`;
            detailedMessage += `**Fallback Mode:** Used due to API unavailability\n\n`;
            detailedMessage += `**Reason:** ${details.errorMessage}\n\n`;
            detailedMessage += `**Hint Source:** Generated locally\n\n`;
            detailedMessage += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
          }
          
          // Additional X402 Details
          if (details.maxAmountRequired || details.assetAddress || details.payToAddress) {
            detailedMessage += `💎 **Payment Configuration**\n\n`;
            if (details.maxAmountRequired) {
              detailedMessage += `💰 **Max Amount:** ${details.maxAmountRequired}\n\n`;
            }
            if (details.assetAddress) {
              detailedMessage += `🪙 **Asset Contract:** \`${details.assetAddress}\`\n\n`;
            }
            if (details.payToAddress) {
              detailedMessage += `📤 **Pay To Address:** \`${details.payToAddress}\`\n\n`;
            }
            if (details.paymentDescription) {
              detailedMessage += `📝 **Description:** ${details.paymentDescription}\n\n`;
            }
            detailedMessage += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
          }
          
          detailedMessage += `🎮 **Next Steps**\n\n`;
          detailedMessage += `🎯 **Use this hint to solve today's Wordle puzzle!**\n\n`;
          const totalUsed = guesses.length + (result.gameState?.hintsUsed || 0);
          detailedMessage += `📊 **Guesses Remaining:** ${Math.max(0, 6 - totalUsed)} out of 6\n\n`;
          detailedMessage += `💡 **Hints Used:** ${result.gameState?.hintsUsed || 0}\n\n`;
          if (isRealPayment) {
            detailedMessage += `💡 **Tip:** The hint tells you one letter that's in the target word!`;
          } else if (result.fallback) {
            detailedMessage += `💡 **Tip:** This is a fallback hint - X402 payment failed but you still get help!`;
          } else {
            detailedMessage += `💡 **Tip:** The hint tells you one letter that's in the target word!`;
          }
        }
        
        sendMessage(detailedMessage);
      } else {
        sendMessage('Failed to get payment hint from the server.');
      }
    } catch (error) {
      console.error('Error getting payment hint:', error);
      sendMessage('Error occurred while getting payment hint.');
    } finally {
      setIsGettingHint(false);
    }
  };

  // Handle payment requirement from chat - removed automatic trigger to prevent infinite loop
  // Users must use the "Get Hint" button for payment, not automatic triggering from chat

  // Handle get funds button click
  const handleGetFunds = async () => {
    if (!walletInfo.isConnected || !walletInfo.address) {
      alert('Please ensure your wallet is connected first.');
      return;
    }

    setIsGettingFunds(true);
    try {
      // Call the request testnet funds function
      const result = await requestTestnetFunds(walletInfo, currentNetwork);
      console.log('Request funds result:', result);
      
      // Send the result to the chat
      if (result && result.success) {
        sendMessage(`Funds requested successfully! ${result.message}`);
        
        // Refresh wallet balances after successful fund request
        // Add a delay to allow transactions to be processed
        setTimeout(async () => {
          try {
            await refreshBalances();
            console.log('Wallet balances refreshed after fund request');
          } catch (refreshError) {
            console.error('Error refreshing balances:', refreshError);
          }
        }, 3000); // Wait 3 seconds for transactions to be processed
      } else {
        sendMessage('Failed to request funds from the server.');
      }
    } catch (error) {
      console.error('Error requesting funds:', error);
      sendMessage('Error occurred while requesting funds. You can also get funds from the Base Sepolia faucet at https://www.coinbase.com/faucets/base-sepolia-faucet');
    } finally {
      setIsGettingFunds(false);
    }
  };

  // Note: We don't auto-start a game anymore - users must explicitly start one
  
  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Listen for private key export modal events
  useEffect(() => {
    const handleOpenPrivateKeyModal = () => {
      setShowPrivateKeyModal(true);
    };

    window.addEventListener('openPrivateKeyModal', handleOpenPrivateKeyModal);
    return () => {
      window.removeEventListener('openPrivateKeyModal', handleOpenPrivateKeyModal);
    };
  }, []);

  // Handle wallet initialization when user becomes authenticated
  useEffect(() => {
    const initWallet = async () => {
      if (isAuthenticated && user && !walletInitialized.current && !isInitializing) {
        walletInitialized.current = true;
        try {
          await initializeWallet();
        } catch (error) {
          console.error('Error initializing wallet:', error);
          walletInitialized.current = false;
        }
      }
    };

    initWallet();
  }, [isAuthenticated, user, isInitializing, initializeWallet]);

  // Send welcome message once when wallet is ready
  useEffect(() => {
    const sendWelcomeMessage = () => {
      if (walletInfo.isConnected && user && !welcomeMessageSent.current) {
        welcomeMessageSent.current = true;
        
        const hasEnoughBalance = parseFloat(walletInfo.usdcBalance) >= MIN_BALANCE_TO_PLAY;
        const displayName = user.userId.substring(0, 8);
        
        if (hasEnoughBalance) {
          sendMessage(`Hello! I'm authenticated as ${displayName}. My embedded wallet (${walletInfo.address.substring(0, 6)}...${walletInfo.address.substring(walletInfo.address.length - 4)}) has ${walletInfo.usdcBalance} USDC. Ready for some word puzzles!`);
        } else {
          sendMessage(`I'm authenticated as ${displayName}, but my embedded wallet only has ${walletInfo.usdcBalance} USDC. How do I get more USDC tokens?`);
        }
      }
    };

    sendWelcomeMessage();
  }, [walletInfo.isConnected, user, walletInfo.address, walletInfo.usdcBalance, sendMessage]);

  // Clear everything when user logs out
  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      clearWallet();
      clearMessages();
      clearGameState();
      setInputValue('');
      welcomeMessageSent.current = false;
      walletInitialized.current = false;
    }
  }, [isAuthenticated, authLoading, clearWallet, clearMessages, clearGameState]);

  // Process agent responses that might contain Wordle evaluations or game state changes
  useEffect(() => {
    if (messages.length < 2) return;
    
    // Look for the last user-agent pair
    const lastUserMessage = messages.filter(msg => msg.sender === 'user').pop();
    const lastAgentMessage = messages.filter(msg => msg.sender === 'agent').pop();
    
    if (!lastUserMessage || !lastAgentMessage) return;
    
    // Generate a unique ID for this message pair
    const messageId = `${lastUserMessage.text}-${lastAgentMessage.text}`;
    
    // Skip if we've already processed this message
    if (hasProcessedMessage(messageId)) return;
    
    // Add to processed messages
    addProcessedMessage(messageId);
    
    const userText = lastUserMessage.text.trim().toLowerCase();
    const agentText = lastAgentMessage.text;
    
    // Check if user started a new game via chat
    if ((userText.includes('start') && (userText.includes('wordle') || userText.includes('game'))) && 
        (agentText.includes('New Wordle game started') || agentText.includes('Make your first 5-letter word guess'))) {
      console.log('🎮 Detected new game started via chat - syncing visual board');
      startNewGame(); // Sync the frontend game state with server-side game state
      return; // Don't process as a guess
    }
    
    // Check if user message is a potential wordle guess
    const guess = userText;
    const isValidGuess = guess.length === WORD_LENGTH && /^[a-z]+$/.test(guess);
    
    if (isValidGuess) {
      // Look for patterns in the agent response indicating a wordle evaluation
      const responseText = agentText;
      
      if (responseText.includes('CORRECT') || responseText.includes('PRESENT') || responseText.includes('ABSENT')) {
        // Extract letter statuses from the response
        const letterStatuses: LetterStatus[] = Array(WORD_LENGTH).fill('absent');
        
        // Check for "Letter X at position Y is CORRECT/PRESENT/ABSENT"
        for (let i = 0; i < WORD_LENGTH; i++) {
          const letterChar = guess[i].toUpperCase();
          const posPattern = `Letter ${letterChar} at position ${i+1} is CORRECT`;
          
          if (responseText.includes(posPattern)) {
            letterStatuses[i] = 'correct';
          } else if (responseText.includes(`Letter ${letterChar} at position ${i+1} is PRESENT`)) {
            letterStatuses[i] = 'present';
          }
        }
        
        // Add guess and update keyboard status using context
        addGuess(guess, letterStatuses);
        updateKeyboardStatus(guess, letterStatuses);
      }
    }
  }, [messages, hasProcessedMessage, addProcessedMessage, addGuess, updateKeyboardStatus, startNewGame]);

  const handleSendMessage = async (message: string) => {
    if (isThinking || message.trim() === '') return;
    
    // Check if user is authenticated and wallet is connected
    if (!walletInfo.isConnected) {
      alert('Please log in to play.');
      return;
    }
    
    // Check if this is a help-related message (allow these even with insufficient funds)
    const isHelpMessage = message.toLowerCase().includes('help') || 
                          message.toLowerCase().includes('faucet') || 
                          message.toLowerCase().includes('funds') ||
                          message.toLowerCase().includes('eth') ||
                          message.toLowerCase().includes('test') ||
                          message.toLowerCase().includes('balance');
    
    // Check balance requirement only for game-related messages
    const hasEnoughBalance = parseFloat(walletInfo.usdcBalance) >= MIN_BALANCE_TO_PLAY;
    if (!hasEnoughBalance && !isHelpMessage) {
      // For game commands, show a more helpful message about getting funds
      alert(`You need at least ${MIN_BALANCE_TO_PLAY} USDC to play. Try asking "How do I get USDC?" in the chat.`);
      return;
    }
    
    // Clear input before sending to prevent double-sending
    const messageToSend = message;
    setInputValue('');
    
    // Add a delay to avoid rapid message sending
    await new Promise(resolve => setTimeout(resolve, 100));
    await sendMessage(messageToSend);
  };
  
  const handleKeyboardClick = (key: string) => {
    if (isThinking || isGameOver) return;
    
    if (key === 'enter') {
      if (inputValue.trim().length > 0) {
        handleSendMessage(inputValue);
      }
    } else if (key === 'backspace') {
      setInputValue(prev => prev.slice(0, -1));
    } else {
      // Regular letter key
      setInputValue(prev => prev + key);
    }
    
    // Focus the input after clicking a key
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  // Add debounce to Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!isThinking && inputValue.trim() !== '') {
        handleSendMessage(inputValue);
      }
    }
  };

  // Render game board
  const renderGameBoard = () => {
    const rows = [];
    
    // Add existing guesses
    for (let i = 0; i < guesses.length; i++) {
      rows.push(
        <WordleRow 
          key={i} 
          guess={guesses[i].word} 
          result={guesses[i].result} 
        />
      );
    }
    
    // Add empty rows to fill up to MAX_GUESSES
    const MAX_GUESSES = 6;
    for (let i = guesses.length; i < MAX_GUESSES; i++) {
      rows.push(<WordleRow key={i} guess="" result={[]} />);
    }
    
    return rows;
  };

  // Show loading state while authentication is being checked
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container md:flex md:flex-row h-screen overflow-hidden">
      {/* Game board - always visible on top on mobile, left on desktop */}
      <div className="game-section md:w-1/2 flex flex-col bg-white dark:bg-gray-800 relative">
        {/* Game Status Indicator */}
        {walletInfo.isConnected && user ? (
          <div className="w-full px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="status-indicator status-ready">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
              <span className="font-medium">Ready to Play</span>
            </div>
          </div>
        ) : isInitializing ? (
          <div className="w-full px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="status-indicator status-offline">
              <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full animate-pulse"></div>
              <span>Initializing wallet...</span>
            </div>
          </div>
        ) : (
          <div className="w-full px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="status-indicator status-offline">
              <div className="w-2.5 h-2.5 bg-gray-400 rounded-full"></div>
              <span>Please log in to play</span>
            </div>
          </div>
        )}
        
        {/* Help button - positioned in top right corner */}
        <div className="absolute top-6 right-6 z-10">
          <button 
            onClick={() => setShowHowToPlay(true)}
            className="p-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors shadow-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            aria-label="Help"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 24 24" width="18" className="game-icon">
              <path fill="currentColor" d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"></path>
            </svg>
          </button>
        </div>
        
        <div className="game-board-container flex-1 overflow-y-auto px-6 py-6 flex items-center justify-center">
          <div className="max-w-xs w-full">
            {renderGameBoard()}
          </div>
        </div>
        
        <div className="keyboard-container flex-shrink-0 w-full px-4 pb-4">
          <div className="max-w-md mx-auto">
            <WordleKeyboard 
              keyStatus={keyStatus} 
              onKeyClick={handleKeyboardClick}
            />
            {isGameOver && (
              <button 
                onClick={() => {
                  startNewGame();
                  clearMessages();
                  handleSendMessage("start wordle");
                }}
                className="mt-4 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-semibold mx-auto block shadow-md hover:shadow-lg"
              >
                Play Again
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Chat interface */}
      <div className="chat-section md:w-1/2 bg-gray-50 dark:bg-gray-900 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Chat Header - Simplified */}
        <div className="chat-header bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Chat with AI</h2>
              <div className="flex items-center space-x-2">
                <NetworkToggle />
                {user && walletInfo.isConnected && (
                  <div 
                    className="flex items-center px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-sm font-medium"
                    title="Click to view profile details"
                    onClick={() => setShowUserInfoModal(true)}
                  >
                    <div className="w-2 h-2 rounded-full mr-2 bg-green-500"></div>
                    <span>{user.userId.substring(0, 8)}...</span>
                  </div>
                )}
                <div className="auth-button">
                  <EmbeddedAuth />
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleGetPaymentHint}
                disabled={isGettingHint || !walletInfo.isConnected}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isGettingHint || !walletInfo.isConnected
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                }`}
                title="Get payment hint from server"
              >
                {isGettingHint ? 'Getting...' : 'Get Hint'}
              </button>
              <button
                onClick={handleGetFunds}
                disabled={isGettingFunds || !walletInfo.isConnected}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isGettingFunds || !walletInfo.isConnected
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                }`}
                title="Request testnet funds using CDP AgentKit"
              >
                {isGettingFunds ? 'Requesting...' : 'Get Funds'}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Need funds?{' '}
                <a 
                  href="https://faucet.circle.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors"
                >
                  Circle Faucet
                </a>
              </p>
            </div>
          </div>
        </div>
        
        {/* Chat messages area - Improved readability */}
        <div className="flex-grow overflow-y-auto px-6 py-4 space-y-4 chat-messages-container" ref={chatContainerRef}>
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 max-w-md mx-auto">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Welcome to CDP Wordle!</h3>
                <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed">Sign in or register to start playing Wordle with crypto rewards.</p>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-5 py-4 rounded-2xl shadow-sm ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                      : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                  }`}
                >
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        a: props => (
                          <a
                            {...props}
                            className={`underline hover:no-underline transition-colors ${
                              msg.sender === "user" 
                                ? "text-blue-200 hover:text-white" 
                                : "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                            }`}
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        ),
                        p: props => (
                          <p 
                            {...props} 
                            className={`leading-relaxed text-base mb-3 last:mb-0 ${
                              msg.sender === "user" ? "text-white" : "text-gray-900 dark:text-gray-100"
                            }`}
                          />
                        ),
                        ul: props => (
                          <ul 
                            {...props} 
                            className={`list-disc list-inside space-y-1 mb-3 ${
                              msg.sender === "user" ? "text-white" : "text-gray-900 dark:text-gray-100"
                            }`}
                          />
                        ),
                        li: props => (
                          <li 
                            {...props} 
                            className={`text-base leading-relaxed ${
                              msg.sender === "user" ? "text-white" : "text-gray-900 dark:text-gray-100"
                            }`}
                          />
                        ),
                        strong: props => (
                          <strong 
                            {...props} 
                            className={`font-semibold ${
                              msg.sender === "user" ? "text-white" : "text-gray-900 dark:text-gray-100"
                            }`}
                          />
                        ),
                        code: props => (
                          <code 
                            {...props} 
                            className={`px-2 py-1 rounded text-sm font-mono ${
                              msg.sender === "user" 
                                ? "bg-blue-800/30 text-blue-100" 
                                : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                            }`}
                          />
                        ),
                      }}
                    >
                      {msg.text.split('---EVALUATION---')[0].trim()}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Thinking Indicator */}
          {isThinking && (
            <div className="flex justify-start">
              <div className="flex items-center space-x-3 px-5 py-4 bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-base text-gray-600 dark:text-gray-400 italic">AI is thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input area - Improved */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-end space-x-3">
            <div className="flex-grow">
              <input
                ref={inputRef}
                type="text"
                className="w-full px-4 py-3 text-base rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
                placeholder={isGameOver ? "Game over. Start a new game!" : "Type a message or 5-letter guess..."}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isThinking || !walletInfo.isConnected}
              />
            </div>
            <button
              onClick={() => handleSendMessage(inputValue)}
              className={`px-6 py-3 text-base rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md ${
                isThinking || !walletInfo.isConnected
                  ? "bg-gray-300 dark:bg-gray-600 cursor-not-allowed text-gray-500 dark:text-gray-400"
                  : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              }`}
              disabled={isThinking || !walletInfo.isConnected}
            >
              Send
            </button>
          </div>
          {/* Balance warning */}
          {walletInfo.isConnected && parseFloat(walletInfo.usdcBalance) < MIN_BALANCE_TO_PLAY && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-base font-medium text-yellow-800 dark:text-yellow-300">Insufficient Balance</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">You can ask for help getting USDC or use the "Get Funds" button above.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Modals */}
      <HowToPlayModal 
        isOpen={showHowToPlay} 
        onClose={() => setShowHowToPlay(false)} 
      />

      <UserInfoModal 
        isOpen={showUserInfoModal} 
        onClose={() => setShowUserInfoModal(false)}
      />

      <PrivateKeyExportModal 
        isOpen={showPrivateKeyModal} 
        onClose={() => setShowPrivateKeyModal(false)}
      />
    </div>
  );
}
