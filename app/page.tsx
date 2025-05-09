"use client";

import React, { useState, useEffect, useRef } from 'react';
import WordleRow from './components/WordleRow';
import WordleKeyboard from './components/WordleKeyboard';
import HowToPlayModal from './components/HowToPlayModal';
import WalletConnect from './components/WalletConnect';
import { LetterStatus, KeyboardStatus, WordleGuess, WalletInfo, MAX_GUESSES, WORD_LENGTH, MIN_BALANCE_TO_PLAY } from './types/wordle';
// Import the agent hook instead of using direct API calls
import { useAgent } from './hooks/useAgent';
import ReactMarkdown from 'react-markdown';

/**
 * Home page for the AgentKit Quickstart
 *
 * @returns {React.ReactNode} The home page
 */
export default function Home() {
  // Use the agent hook for chat functionality
  const { messages, sendMessage, isThinking } = useAgent();
  
  const [guesses, setGuesses] = useState<WordleGuess[]>([]);
  const [keyStatus, setKeyStatus] = useState<KeyboardStatus>({});
  const [isGameOver, setIsGameOver] = useState(false);
  const [targetWord, setTargetWord] = useState('');
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({
    address: '',
    balance: '0',
    usdcBalance: '0',
    isConnected: false
  });
  // Add a state to track processed messages
  const [processedMessages, setProcessedMessages] = useState<Set<string>>(new Set());
  // Add a flag to prevent multiple welcome messages
  const welcomeMessageSent = useRef(false);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize the game
  useEffect(() => {
    startNewGame();
  }, []);
  
  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Process agent responses that might contain Wordle evaluations
  useEffect(() => {
    if (messages.length < 2) return;
    
    // Look for the last user-agent pair
    const lastUserMessage = messages.filter(msg => msg.sender === 'user').pop();
    const lastAgentMessage = messages.filter(msg => msg.sender === 'agent').pop();
    
    if (!lastUserMessage || !lastAgentMessage) return;
    
    // Generate a unique ID for this message pair
    const messageId = `${lastUserMessage.text}-${lastAgentMessage.text}`;
    
    // Skip if we've already processed this message
    if (processedMessages.has(messageId)) return;
    
    // Add to processed messages
    setProcessedMessages(prev => {
      const newSet = new Set(prev);
      newSet.add(messageId);
      return newSet;
    });
    
    // Check if user message is a potential wordle guess
    const guess = lastUserMessage.text.trim().toLowerCase();
    const isValidGuess = guess.length === WORD_LENGTH && /^[a-z]+$/.test(guess);
    
    if (isValidGuess) {
      // Look for patterns in the agent response indicating a wordle evaluation
      const responseText = lastAgentMessage.text;
      
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
        
        // Check if this exact guess is already in the guesses array to prevent duplicates
        const isDuplicate = guesses.some(existingGuess => existingGuess.word === guess);
        
        if (!isDuplicate) {
          // Update guesses and keyboard only if not a duplicate
          const newGuess = { word: guess, result: letterStatuses };
          setGuesses(prev => [...prev, newGuess]);
          updateKeyboardStatus(guess, letterStatuses);
          
          // Check if game is over (all correct or max guesses)
          const isWin = letterStatuses.every(status => status === 'correct');
          const isLoss = guesses.length + 1 >= MAX_GUESSES && !isWin;
          
          if (isWin || isLoss) {
            setIsGameOver(true);
          }
        }
      }
    }
  }, [messages]);

  const handleWalletConnected = (info: WalletInfo) => {
    setWalletInfo(info);
    
    // Send a welcome message if wallet is connected with sufficient balance
    // but only if we haven't sent one already
    if (info.isConnected && !welcomeMessageSent.current) {
      welcomeMessageSent.current = true;
      
      // If requesting funds, automatically send that message
      if ((info as any).requestingFunds) {
        sendMessage("add testnet funds to my wallet");
        return;
      }
      
      const hasEnoughBalance = parseFloat(info.usdcBalance) >= MIN_BALANCE_TO_PLAY;
      
      if (hasEnoughBalance) {
        sendMessage(`Hello! I've connected my wallet (${info.address.substring(0, 6)}...${info.address.substring(info.address.length - 4)}) with ${info.usdcBalance} USDC. Let's play Wordle!`);
      } else {
        sendMessage(`I've connected my wallet, but I only have ${info.usdcBalance} USDC. How do I get more USDC tokens?`);
      }
    }
  };

  // Add a function to check if the wallet has enough balance
  const hasEnoughBalance = () => {
    return walletInfo.isConnected && parseFloat(walletInfo.usdcBalance) >= MIN_BALANCE_TO_PLAY;
  };

  // Effect to monitor wallet changes and start a new game if conditions are met
  useEffect(() => {
    // If wallet changes to having enough balance and we don't have any games yet
    if (hasEnoughBalance() && guesses.length === 0 && !isThinking && messages.length <= 1) {
      startNewGame();
    }
  }, [walletInfo, messages.length, guesses.length, isThinking]);

  const startNewGame = () => {
    // Reset the game state
    setGuesses([]);
    setKeyStatus({});
    setIsGameOver(false);
    // Clear processed messages when starting a new game
    setProcessedMessages(new Set());
    
    // Send a message to start a new game if wallet is connected with enough balance
    if (hasEnoughBalance()) {
      sendMessage("Let's play Wordle! I'm ready for a new game.");
    }
  };

  const handleSendMessage = async (message: string) => {
    if (isThinking || message.trim() === '') return;
    
    // Check if wallet is connected
    if (!walletInfo.isConnected) {
      alert("Please connect your wallet to play.");
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
  
  const updateKeyboardStatus = (guess: string, result: LetterStatus[]) => {
    const newKeyStatus = { ...keyStatus };
    
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
    
    setKeyStatus(newKeyStatus);
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
    for (let i = guesses.length; i < MAX_GUESSES; i++) {
      rows.push(<WordleRow key={i} guess="" result={[]} />);
    }
    
    return rows;
  };

  return (
    <div className="mobile-container md:flex md:flex-row h-screen overflow-hidden">
      {/* Game board - always visible on top on mobile, left on desktop */}
      <div className="game-section md:w-1/2 flex flex-col items-center bg-white">
        <div className="w-full flex justify-between items-center px-4 mb-2 border-b border-gray-200 pb-2">
          <button 
            onClick={() => setShowHowToPlay(true)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
            aria-label="Help"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" className="game-icon" data-testid="icon-help">
              <path fill="currentColor" d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"></path>
            </svg>
          </button>
          <h1 className="text-3xl font-bold tracking-wide uppercase">AI Wordle</h1>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>
        
        {/* Wallet Connect Component */}
        <WalletConnect onWalletConnected={handleWalletConnected} />
        
        <div className="game-board-container flex-1 overflow-y-auto mb-4 mt-2">
          {renderGameBoard()}
        </div>
        
        <div className="keyboard-container flex-shrink-0 w-full pb-4">
          <WordleKeyboard 
            keyStatus={keyStatus} 
            onKeyClick={handleKeyboardClick}
          />
          {isGameOver && (
            <button 
              onClick={startNewGame}
              className="mt-4 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-bold mx-auto block"
            >
              Play Again
            </button>
          )}
        </div>
      </div>
      
      {/* Chat interface - fixed height with scroll on desktop, below game on mobile */}
      <div className="chat-section md:w-1/2 bg-gray-50 border-t md:border-t-0 md:border-l border-gray-200 flex flex-col">
        <div className="chat-header flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0 bg-gray-50">
          <h2 className="text-xl font-semibold">Chat with AI</h2>
          <span className={`text-xs px-2 py-1 rounded-full ${walletInfo.isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
            {walletInfo.isConnected ? 'Wallet Connected' : 'Wallet Disconnected'}
          </span>
        </div>
        
        {/* Chat UI */}
        <div className="flex-grow overflow-y-auto p-4" ref={chatContainerRef}>
          {messages.length === 0 ? (
            <p className="text-center text-gray-500">Connect your wallet to start playing AI Wordle...</p>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg shadow mb-3 ${
                  msg.sender === "user"
                    ? "bg-[#0052FF] text-white ml-auto max-w-[80%]"
                    : "bg-gray-100 dark:bg-gray-700 mr-auto max-w-[80%]"
                }`}
              >
                <ReactMarkdown
                  components={{
                    a: props => (
                      <a
                        {...props}
                        className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300"
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    ),
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
              </div>
            ))
          )}

          {/* Thinking Indicator */}
          {isThinking && <div className="text-right mr-2 text-gray-500 italic">🤖 Thinking...</div>}
        </div>

        {/* Input Box */}
        <div className="p-3 border-t border-gray-200 bg-white">
          <div className="flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              className="flex-grow p-2 rounded border dark:bg-gray-700 dark:border-gray-600"
              placeholder={isGameOver ? "Game over. Start a new game!" : "Type a message or 5-letter guess..."}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isThinking || !walletInfo.isConnected}
            />
            <button
              onClick={() => handleSendMessage(inputValue)}
              className={`px-6 py-2 rounded-full font-semibold transition-all ${
                isThinking || !walletInfo.isConnected
                  ? "bg-gray-300 cursor-not-allowed text-gray-500"
                  : "bg-[#0052FF] hover:bg-[#003ECF] text-white shadow-md"
              }`}
              disabled={isThinking || !walletInfo.isConnected}
            >
              Send
            </button>
          </div>
          {!walletInfo.isConnected && (
            <div className="text-xs text-red-500 mt-1 ml-2">Wallet not connected</div>
          )}
          {walletInfo.isConnected && parseFloat(walletInfo.usdcBalance) < MIN_BALANCE_TO_PLAY && (
            <div className="text-xs text-amber-500 mt-1 ml-2">
              Insufficient balance. You can ask for help getting USDC.
            </div>
          )}
        </div>
      </div>
      
      {/* How to play modal */}
      <HowToPlayModal 
        isOpen={showHowToPlay} 
        onClose={() => setShowHowToPlay(false)} 
      />
    </div>
  );
}
