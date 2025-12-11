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
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-10">
      <div className="bg-gray-800 border-2 border-gray-600 p-8 rounded-xl max-w-md w-full text-center shadow-2xl">
        
        {status === GameStatus.MENU && (
          <>
            <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 mb-6 font-mono tracking-tighter">
              ZOMBIE RUN
            </h1>
            <p className="text-gray-300 mb-2 text-lg">
              Escape the dead city. <br/>
            </p>
            <div className="text-sm text-gray-400 mb-8 bg-gray-900/50 p-4 rounded-lg text-left">
              <p><strong>Controls:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li><span className="text-white font-bold">ARROWS:</span> Move</li>
                <li><span className="text-white font-bold">Z:</span> Jump (Press twice for Double Jump)</li>
                <li><span className="text-white font-bold">X:</span> Shoot</li>
                <li><span className="text-white font-bold">C:</span> Switch Weapon</li>
                <li><span className="text-white font-bold">R:</span> Reload Weapon</li>
                <li><span className="text-white font-bold">V:</span> Use Medkit</li>
                <li><span className="text-white font-bold">P:</span> Pause Game</li>
              </ul>
              <p className="mt-2 text-yellow-500 text-xs">
                Tip: You can carry up to 2 weapons. Medkits are stored if your health is full.
              </p>
            </div>
            <button 
              onClick={onStart}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xl transition-transform hover:scale-105 shadow-lg shadow-blue-500/30"
            >
              START GAME
            </button>
          </>
        )}

        {status === GameStatus.PAUSED && (
          <>
            <h1 className="text-5xl font-black text-white mb-6 tracking-widest uppercase">PAUSED</h1>
            <button 
              onClick={onResume}
              className="w-full px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-lg mb-4 transition-transform hover:scale-105 shadow-lg shadow-blue-500/30"
            >
              RESUME
            </button>
            <button 
              onClick={onRestart}
              className="w-full px-8 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold rounded-lg text-lg transition-transform hover:scale-105"
            >
              RESTART
            </button>
          </>
        )}

        {status === GameStatus.GAME_OVER && (
          <>
            <h1 className="text-5xl font-black text-red-600 mb-4 tracking-widest uppercase">YOU DIED</h1>
            <p className="text-gray-400 mb-6 text-xl">Final Score: <span className="text-white font-bold">{score}</span></p>
            <button 
              onClick={onRestart}
              className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-lg transition-transform hover:scale-105 shadow-lg shadow-red-500/30"
            >
              TRY AGAIN
            </button>
          </>
        )}

        {status === GameStatus.VICTORY && (
          <>
            <h1 className="text-5xl font-black text-yellow-400 mb-4 tracking-widest uppercase">SURVIVED!</h1>
            <p className="text-gray-300 mb-6">You reached the safe zone.</p>
            <p className="text-gray-400 mb-8 text-xl">Score: <span className="text-white font-bold">{score}</span></p>
            <button 
              onClick={onRestart}
              className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg text-lg transition-transform hover:scale-105"
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