import React, { useState, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import UIOverlay from './components/UIOverlay';
import { GameStatus, Difficulty } from './types';
import { soundManager } from './utils/sound';

const App: React.FC = () => {
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.MENU);
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.NORMAL);
  const [gameKey, setGameKey] = useState(0);

  const handleStart = () => {
    soundManager.init(); // Initialize audio context on user gesture
    setGameStatus(GameStatus.PLAYING);
    setScore(0);
  };

  const handleRestart = () => {
    soundManager.init();
    setGameKey(prev => prev + 1); // Force re-mount of GameCanvas
    setGameStatus(GameStatus.PLAYING);
    setScore(0);
  };

  const handleResume = () => {
    setGameStatus(GameStatus.PLAYING);
  };

  const handleStatusChange = useCallback((status: GameStatus) => {
    setGameStatus(status);
  }, []);

  return (
    <div className="relative w-screen h-screen bg-gray-900 overflow-hidden select-none">
      <GameCanvas 
        key={gameKey}
        gameStatus={gameStatus} 
        onScoreUpdate={setScore} 
        onStatusChange={handleStatusChange} 
        difficulty={difficulty}
      />
      <UIOverlay 
        status={gameStatus} 
        score={score} 
        onStart={handleStart} 
        onRestart={handleRestart}
        onResume={handleResume} 
        difficulty={difficulty}
        onSelectDifficulty={setDifficulty}
      />
      
      {/* Mobile Controls Hint */}
      <div className="absolute bottom-4 left-4 text-gray-500 text-xs hidden md:block">
        v1.7.0 (Modes Update) | Controls: Arrows(Move) Z(Jump) X(Shoot) C(Swap) V(Heal) P(Pause)
      </div>
    </div>
  );
};

export default App;