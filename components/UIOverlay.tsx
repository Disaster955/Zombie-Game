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
      {/* Container simplified for mobile landscape - centered and minimal */}
      <div className="bg-gray-800 border-2 border-gray-600 p-6 rounded-xl max-w-[280px] md:max-w-md w-full text-center shadow-2xl flex flex-col items-center justify-center gap-4">
        
        {status === GameStatus.MENU && (
          <>
            <div className="mb-2">
              <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 font-mono tracking-tighter filter drop-shadow-lg">
                ZOMBIE RUN
              </h1>
              <p className="text-gray-400 text-xs md:text-lg mt-1 tracking-wider uppercase">
                Dead City
              </p>
            </div>
            
            <button 
              onClick={onStart}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full text-sm md:text-lg transition-all hover:scale-105 shadow-[0_0_15px_rgba(37,99,235,0.5)] border border-blue-400 w-full"
            >
              START GAME
            </button>
          </>
        )}

        {status === GameStatus.PAUSED && (
          <>
            <h1 className="text-3xl md:text-5xl font-black text-white mb-2 tracking-widest uppercase">PAUSED</h1>
            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={onResume}
                className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm md:text-lg shadow-lg"
              >
                RESUME
              </button>
              <button 
                onClick={onRestart}
                className="w-full px-6 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold rounded-lg text-sm md:text-lg"
              >
                RESTART
              </button>
            </div>
          </>
        )}

        {status === GameStatus.GAME_OVER && (
          <>
            <h1 className="text-3xl md:text-5xl font-black text-red-600 mb-2 tracking-widest uppercase">YOU DIED</h1>
            <p className="text-gray-400 mb-4 text-lg">Score: <span className="text-white font-bold">{score}</span></p>
            <button 
              onClick={onRestart}
              className="w-full px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full text-sm md:text-lg transition-transform hover:scale-105 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
            >
              TRY AGAIN
            </button>
          </>
        )}

        {status === GameStatus.VICTORY && (
          <>
            <h1 className="text-3xl md:text-5xl font-black text-yellow-400 mb-2 tracking-widest uppercase">SURVIVED!</h1>
            <p className="text-gray-300 mb-4 text-xs">Safe zone reached.</p>
            <p className="text-gray-400 mb-4 text-lg">Score: <span className="text-white font-bold">{score}</span></p>
            <button 
              onClick={onRestart}
              className="w-full px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-full text-sm md:text-lg transition-transform hover:scale-105 shadow-[0_0_15px_rgba(234,179,8,0.5)]"
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