import React from 'react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">How To Play</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          <div>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">Guess the Wordle in 6 tries.</p>
            
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Each guess must be a valid 5-letter word.
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  The color of the tiles will change to show how close your guess was to the word.
                </li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Examples</h3>
            
            {/* Example 1 - Correct letter */}
            <div className="mb-6">
              <div className="flex gap-1 mb-3">
                <div className="w-12 h-12 flex items-center justify-center text-2xl font-bold bg-green-600 text-white rounded-md">W</div>
                <div className="w-12 h-12 flex items-center justify-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100">O</div>
                <div className="w-12 h-12 flex items-center justify-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100">R</div>
                <div className="w-12 h-12 flex items-center justify-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100">D</div>
                <div className="w-12 h-12 flex items-center justify-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100">Y</div>
              </div>
              <p className="text-gray-700 dark:text-gray-300"><span className="font-bold text-green-600">W</span> is in the word and in the correct spot.</p>
            </div>
            
            {/* Example 2 - Present letter */}
            <div className="mb-6">
              <div className="flex gap-1 mb-3">
                <div className="w-12 h-12 flex items-center justify-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100">L</div>
                <div className="w-12 h-12 flex items-center justify-center text-2xl font-bold bg-yellow-500 text-white rounded-md">I</div>
                <div className="w-12 h-12 flex items-center justify-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100">G</div>
                <div className="w-12 h-12 flex items-center justify-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100">H</div>
                <div className="w-12 h-12 flex items-center justify-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100">T</div>
              </div>
              <p className="text-gray-700 dark:text-gray-300"><span className="font-bold text-yellow-600">I</span> is in the word but in the wrong spot.</p>
            </div>
            
            {/* Example 3 - Absent letter */}
            <div className="mb-6">
              <div className="flex gap-1 mb-3">
                <div className="w-12 h-12 flex items-center justify-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100">R</div>
                <div className="w-12 h-12 flex items-center justify-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100">O</div>
                <div className="w-12 h-12 flex items-center justify-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100">G</div>
                <div className="w-12 h-12 flex items-center justify-center text-2xl font-bold bg-gray-600 text-white rounded-md">U</div>
                <div className="w-12 h-12 flex items-center justify-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100">E</div>
              </div>
              <p className="text-gray-700 dark:text-gray-300"><span className="font-bold text-gray-600">U</span> is not in the word in any spot.</p>
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-center text-blue-800 dark:text-blue-300 font-medium">
                Chat with the assistant to make your guesses and get hints!
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default HowToPlayModal; 