import React from 'react';
import WordleTile from './WordleTile';
import { LetterStatus, WORD_LENGTH } from '../types/wordle';

interface WordleRowProps {
  guess: string;
  result?: LetterStatus[];
}

const WordleRow: React.FC<WordleRowProps> = ({ guess = '', result = [] }) => {
  const tiles = Array(WORD_LENGTH).fill(null).map((_, i) => {
    const letter = guess[i] || '';
    const status = result[i] || 'empty';
    
    return (
      <WordleTile 
        key={i} 
        letter={letter} 
        status={status} 
      />
    );
  });

  return (
    <div className="flex justify-center mb-1 mt-1">
      {tiles}
    </div>
  );
};

export default WordleRow; 