import React from 'react';
import { GameStatus, Difficulty } from '../types';

interface UIOverlayProps {
  status: GameStatus;
  score: number;
  onStart: () => void;
  onRestart: () => void;
  onResume: () => void;
  difficulty: Difficulty;
  onSelectDifficulty: (d: Difficulty) => void;
}

// Reusable component for difficulty buttons to keep code clean and consistent
const DifficultySelector = ({ difficulty, onSelectDifficulty }: { difficulty: Difficulty, onSelectDifficulty: (d: Difficulty) => void }) => (
  <div className="flex gap-2 w-full justify-center mb-2 md:mb-4">
    <button 
      onClick={() => onSelectDifficulty(Difficulty.EASY)}
      className={`flex-1 py-1 md:py-2 rounded text-[10px] md:text-xs font-bold border transition-all ${difficulty === Difficulty.EASY ? 'bg-green-600 border-green-400 text-white scale-105 shadow-md' : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'}`}
    >
      EASY
    </button>
    <button 
      onClick={() => onSelectDifficulty(Difficulty.NORMAL)}
      className={`flex-1 py-1 md:py-2 rounded text-[10px] md:text-xs font-bold border transition-all ${difficulty === Difficulty.NORMAL ? 'bg-blue-600 border-blue-400 text-white scale-105 shadow-md' : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'}`}
    >
      NORMAL
    </button>
    <button 
      onClick={() => onSelectDifficulty(Difficulty.HARD)}
      className={`flex-1 py-1 md:py-2 rounded text-[10px] md:text-xs font-bold border transition-all ${difficulty === Difficulty.HARD ? 'bg-red-600 border-red-400 text-white scale-105 shadow-md' : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'}`}
    >
      HARD
    </button>
  </div>
);

const UIOverlay: React.FC<UIOverlayProps> = ({ 
  status, 
  score, 
  onStart, 
  onRestart, 
  onResume,
  difficulty,
  onSelectDifficulty
}) => {
  if (status === GameStatus.PLAYING) return null;

  const handleFullscreen = async () => {
    try {
      const elem = document.documentElement;
      if (!document.fullscreenElement) {
        await elem.requestFullscreen();
        // @ts-ignore - ScreenOrientation type definitions might be missing
        if (screen.orientation && screen.orientation.lock) {
            // @ts-ignore
            await screen.orientation.lock('landscape').catch((e) => console.log('Lock failed:', e));
        }
      }
    } catch (err) {
      console.error("Error attempting to enable fullscreen:", err);
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50 p-4">
      {/* Container simplified for mobile landscape - centered and minimal */}
      {/* Added scale-90 for mobile to make it smaller, resets on md screens */}
      <div className="bg-gray-800 border-2 border-gray-600 p-4 md:p-6 rounded-xl w-[90%] max-w-[300px] md:max-w-md text-center shadow-2xl flex flex-col items-center justify-center gap-2 md:gap-3 transform scale-90 md:scale-100 origin-center">
        
        {status === GameStatus.MENU && (
          <>
            <div className="mb-1 md:mb-2">
              <h1 className="text-2xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 font-mono tracking-tighter filter drop-shadow-lg">
                ZOMBIE RUN
              </h1>
              <p className="text-gray-400 text-[10px] md:text-lg mt-1 tracking-wider uppercase">
                Dead City
              </p>
            </div>
            
            <p className="text-gray-400 text-[10px] md:text-xs uppercase tracking-widest mb-1">Select Difficulty</p>
            <DifficultySelector difficulty={difficulty} onSelectDifficulty={onSelectDifficulty} />

            <button 
              onClick={onStart}
              className="px-6 py-2 md:px-8 md:py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full text-xs md:text-lg transition-all hover:scale-105 shadow-[0_0_15px_rgba(37,99,235,0.5)] border border-blue-400 w-full"
            >
              START GAME
            </button>
            
            <button 
              onClick={handleFullscreen}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold rounded-lg text-[10px] md:text-sm transition-transform hover:scale-105 border border-gray-500 w-full"
            >
              PANTALLA COMPLETA
            </button>
          </>
        )}

        {status === GameStatus.PAUSED && (
          <>
            <h1 className="text-3xl md:text-5xl font-black text-white mb-2 tracking-widest uppercase">PAUSED</h1>
            <div className="flex flex-col gap-2 md:gap-3 w-full">
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
            <h1 className="text-2xl md:text-5xl font-black text-red-600 mb-1 tracking-widest uppercase">YOU DIED</h1>
            <p className="text-gray-400 mb-2 md:mb-4 text-sm md:text-lg">Score: <span className="text-white font-bold">{score}</span></p>
            
            <p className="text-gray-500 text-[10px] md:text-xs uppercase tracking-widest mb-1">Retry Difficulty</p>
            <DifficultySelector difficulty={difficulty} onSelectDifficulty={onSelectDifficulty} />

            <button 
              onClick={onRestart}
              className="w-full px-8 py-2 md:py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full text-xs md:text-lg transition-transform hover:scale-105 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
            >
              TRY AGAIN
            </button>
          </>
        )}

        {status === GameStatus.VICTORY && (
          <>
            <h1 className="text-2xl md:text-5xl font-black text-yellow-400 mb-1 tracking-widest uppercase">SURVIVED!</h1>
            <p className="text-gray-300 mb-2 text-[10px] md:text-xs">Safe zone reached.</p>
            <p className="text-gray-400 mb-2 md:mb-4 text-sm md:text-lg">Score: <span className="text-white font-bold">{score}</span></p>
            
            <p className="text-gray-500 text-[10px] md:text-xs uppercase tracking-widest mb-1">Next Run Difficulty</p>
            <DifficultySelector difficulty={difficulty} onSelectDifficulty={onSelectDifficulty} />

            <button 
              onClick={onRestart}
              className="w-full px-8 py-2 md:py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-full text-xs md:text-lg transition-transform hover:scale-105 shadow-[0_0_15px_rgba(234,179,8,0.5)]"
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
