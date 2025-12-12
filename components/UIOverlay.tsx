import React from 'react';
import { GameStatus } from '../types';

interface UIOverlayProps {
  status: GameStatus;
  score: number;
  onStart: () => void;
  onRestart: () => void;
  onResume: () => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ status, score, onStart, onRestart, onResume }) => {
  if (status === GameStatus.PLAYING) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50 p-4">
      {/* Container max-width reduced for mobile, padding reduced */}
      <div className="bg-gray-800 border-2 border-gray-600 p-4 md:p-8 rounded-xl max-w-[300px] md:max-w-md w-full text-center shadow-2xl overflow-y-auto max-h-[95vh]">
        
        {status === GameStatus.MENU && (
          <>
            <h1 className="text-2xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 mb-2 md:mb-4 font-mono tracking-tighter">
              ZOMBIE RUN
            </h1>
            <p className="text-gray-300 mb-2 text-xs md:text-lg">
              Escape the dead city. <br/>
            </p>
            <div className="text-[10px] md:text-sm text-gray-400 mb-4 md:mb-6 bg-gray-900/50 p-2 md:p-3 rounded-lg text-left leading-tight">
              <p className="mb-1"><strong>Controls:</strong></p>
              <ul className="list-disc pl-4 space-y-0.5 md:space-y-1">
                <li><span className="text-white font-bold">ARROWS:</span> Move</li>
                <li><span className="text-white font-bold">Z:</span> Jump (Double Jump)</li>
                <li><span className="text-white font-bold">X:</span> Shoot</li>
                <li><span className="text-white font-bold">C:</span> Switch Weapon</li>
                <li><span className="text-white font-bold">R:</span> Reload</li>
                <li><span className="text-white font-bold">V:</span> Medkit</li>
              </ul>
              <p className="mt-2 text-yellow-500 text-[9px] md:text-[10px]">
                Tip: You can carry up to 2 weapons.
              </p>
            </div>
            <button 
              onClick={onStart}
              className="px-5 py-2 md:px-6 md:py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm md:text-lg transition-transform hover:scale-105 shadow-lg shadow-blue-500/30"
            >
              START GAME
            </button>
          </>
        )}

        {status === GameStatus.PAUSED && (
          <>
            <h1 className="text-3xl md:text-5xl font-black text-white mb-4 md:mb-6 tracking-widest uppercase">PAUSED</h1>
            <button 
              onClick={onResume}
              className="w-full px-4 py-2 md:px-6 md:py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm md:text-lg mb-3 md:mb-4 transition-transform hover:scale-105 shadow-lg shadow-blue-500/30"
            >
              RESUME
            </button>
            <button 
              onClick={onRestart}
              className="w-full px-4 py-2 md:px-6 md:py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold rounded-lg text-sm md:text-lg transition-transform hover:scale-105"
            >
              RESTART
            </button>
          </>
        )}

        {status === GameStatus.GAME_OVER && (
          <>
            <h1 className="text-3xl md:text-5xl font-black text-red-600 mb-2 md:mb-4 tracking-widest uppercase">YOU DIED</h1>
            <p className="text-gray-400 mb-4 md:mb-6 text-base md:text-lg">Final Score: <span className="text-white font-bold">{score}</span></p>
            <button 
              onClick={onRestart}
              className="px-6 py-2 md:px-8 md:py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-sm md:text-lg transition-transform hover:scale-105 shadow-lg shadow-red-500/30"
            >
              TRY AGAIN
            </button>
          </>
        )}

        {status === GameStatus.VICTORY && (
          <>
            <h1 className="text-3xl md:text-5xl font-black text-yellow-400 mb-2 md:mb-4 tracking-widest uppercase">SURVIVED!</h1>
            <p className="text-gray-300 mb-4 md:mb-6 text-xs md:text-sm">You reached the safe zone.</p>
            <p className="text-gray-400 mb-6 md:mb-8 text-base md:text-lg">Score: <span className="text-white font-bold">{score}</span></p>
            <button 
              onClick={onRestart}
              className="px-6 py-2 md:px-8 md:py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg text-sm md:text-lg transition-transform hover:scale-105"
            >
              PLAY AGAIN
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default UIOverlay;