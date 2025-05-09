import React from 'react';
import { KeyboardStatus } from '../types/wordle';

interface WordleKeyboardProps {
  keyStatus: KeyboardStatus;
  onKeyClick: (key: string) => void;
}

const WordleKeyboard: React.FC<WordleKeyboardProps> = ({ keyStatus, onKeyClick }) => {
  // Define keyboard layout rows
  const keyboardRows = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace']
  ];

  // Get appropriate styling for each key based on its status
  const getKeyStyle = (key: string) => {
    const status = keyStatus[key];
    const baseStyle = "rounded font-bold uppercase flex items-center justify-center transition-colors";
    
    // Apply specific styles based on key status
    if (status === 'correct') {
      return `${baseStyle} bg-green-600 text-white`;
    } else if (status === 'present') {
      return `${baseStyle} bg-yellow-500 text-white`;
    } else if (status === 'absent') {
      return `${baseStyle} bg-gray-600 text-white`;
    } else {
      return `${baseStyle} bg-gray-300 hover:bg-gray-400 text-black`;
    }
  };

  // Size keys appropriately
  const getKeySize = (key: string) => {
    if (key === 'enter' || key === 'backspace') {
      return 'px-2 py-4';
    }
    return 'px-3 py-4';
  };

  // Display text for special keys
  const getKeyDisplay = (key: string) => {
    if (key === 'enter') {
      return 'Enter';
    } else if (key === 'backspace') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" className="backspace-icon">
          <path fill="currentColor" d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H7.07L2.4 12l4.66-7H22v14zm-11.59-2L14 13.41 17.59 17 19 15.59 15.41 12 19 8.41 17.59 7 14 10.59 10.41 7 9 8.41 12.59 12 9 15.59z"></path>
        </svg>
      );
    }
    return key;
  };

  return (
    <div className="keyboard-container mx-auto max-w-lg">
      {keyboardRows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center mb-2">
          {row.map((key) => (
            <button
              key={key}
              onClick={() => onKeyClick(key)}
              className={`${getKeyStyle(key)} ${getKeySize(key)} mx-0.5`}
              aria-label={key}
            >
              {getKeyDisplay(key)}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};

export default WordleKeyboard; 