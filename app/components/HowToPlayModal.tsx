import React from 'react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-md max-w-md w-full max-h-[90vh] overflow-y-auto p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <h2 className="text-3xl font-bold mb-4">How To Play</h2>
        <p className="text-lg mb-4">Guess the Wordle in 6 tries.</p>
        
        <ul className="mb-4 list-disc pl-6 space-y-2">
          <li>Each guess must be a valid 5-letter word.</li>
          <li>The color of the tiles will change to show how close your guess was to the word.</li>
        </ul>

        <h3 className="text-xl font-bold mb-2">Examples</h3>
        
        {/* Example 1 - Correct letter */}
        <div className="mb-4">
          <div className="flex mb-1">
            <div className="inline-block border-2 border-gray-300 w-11 h-11 flex items-center justify-center text-2xl font-bold mr-1 bg-green-600 text-white border-0">W</div>
            <div className="inline-block border-2 border-gray-300 w-11 h-11 flex items-center justify-center text-2xl font-bold mr-1">O</div>
            <div className="inline-block border-2 border-gray-300 w-11 h-11 flex items-center justify-center text-2xl font-bold mr-1">R</div>
            <div className="inline-block border-2 border-gray-300 w-11 h-11 flex items-center justify-center text-2xl font-bold mr-1">D</div>
            <div className="inline-block border-2 border-gray-300 w-11 h-11 flex items-center justify-center text-2xl font-bold">Y</div>
          </div>
          <p className="mb-4"><span className="font-bold">W</span> is in the word and in the correct spot.</p>
        </div>
        
        {/* Example 2 - Present letter */}
        <div className="mb-4">
          <div className="flex mb-1">
            <div className="inline-block border-2 border-gray-300 w-11 h-11 flex items-center justify-center text-2xl font-bold mr-1">L</div>
            <div className="inline-block border-0 w-11 h-11 flex items-center justify-center text-2xl font-bold mr-1 bg-yellow-500 text-white">I</div>
            <div className="inline-block border-2 border-gray-300 w-11 h-11 flex items-center justify-center text-2xl font-bold mr-1">G</div>
            <div className="inline-block border-2 border-gray-300 w-11 h-11 flex items-center justify-center text-2xl font-bold mr-1">H</div>
            <div className="inline-block border-2 border-gray-300 w-11 h-11 flex items-center justify-center text-2xl font-bold">T</div>
          </div>
          <p className="mb-4"><span className="font-bold">I</span> is in the word but in the wrong spot.</p>
        </div>
        
        {/* Example 3 - Absent letter */}
        <div className="mb-4">
          <div className="flex mb-1">
            <div className="inline-block border-2 border-gray-300 w-11 h-11 flex items-center justify-center text-2xl font-bold mr-1">R</div>
            <div className="inline-block border-2 border-gray-300 w-11 h-11 flex items-center justify-center text-2xl font-bold mr-1">O</div>
            <div className="inline-block border-2 border-gray-300 w-11 h-11 flex items-center justify-center text-2xl font-bold mr-1">G</div>
            <div className="inline-block border-0 w-11 h-11 flex items-center justify-center text-2xl font-bold mr-1 bg-gray-600 text-white">U</div>
            <div className="inline-block border-2 border-gray-300 w-11 h-11 flex items-center justify-center text-2xl font-bold">E</div>
          </div>
          <p><span className="font-bold">U</span> is not in the word in any spot.</p>
        </div>
        
        <div className="border-t border-gray-300 pt-4 mt-6">
          <p className="text-center">Chat with the AI to make your guesses and get hints!</p>
        </div>
      </div>
    </div>
  );
};

export default HowToPlayModal; 