import React from 'react';
import { LetterStatus } from '../types/wordle';

interface WordleTileProps {
  letter: string;
  status: LetterStatus;
}

const WordleTile: React.FC<WordleTileProps> = ({ letter, status }) => {
  // Build the right CSS classes based on the tile's status
  const getStyles = () => {
    const baseStyle = "inline-flex items-center justify-center w-14 h-14 text-3xl font-bold m-0.5 select-none transition-colors";
    
    if (status === 'correct') {
      return `${baseStyle} bg-green-600 text-white border-0`;
    } else if (status === 'present') {
      return `${baseStyle} bg-yellow-500 text-white border-0`;
    } else if (status === 'absent') {
      return `${baseStyle} bg-gray-600 text-white border-0`;
    } else {
      // Empty tile
      if (letter) {
        return `${baseStyle} border-2 border-gray-400`; // Filled but not evaluated
      } else {
        return `${baseStyle} border-2 border-gray-300`; // Empty tile
      }
    }
  };

  return (
    <div className={getStyles()}>
      {letter.toUpperCase()}
    </div>
  );
};

export default WordleTile; 