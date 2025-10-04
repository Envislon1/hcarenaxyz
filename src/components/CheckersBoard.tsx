import React, { useEffect, useRef, useState } from 'react';
import { CheckersTile } from './CheckersTile';

interface CheckersBoardProps {
  boardState?: any;
  onMove?: (from: number, to: number) => void;
  currentPlayer?: 1 | 2;
  isPlayerTurn?: boolean;
}

export const CheckersBoard: React.FC<CheckersBoardProps> = ({ 
  boardState, 
  onMove,
  currentPlayer = 1,
  isPlayerTurn = true
}) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);

  useEffect(() => {
    const resizeBoard = () => {
      if (boardRef.current) {
        const container = boardRef.current.parentElement;
        if (container) {
          const width = container.clientWidth;
          setSize(width);
        }
      }
    };

    resizeBoard();
    window.addEventListener('resize', resizeBoard);
    return () => window.removeEventListener('resize', resizeBoard);
  }, []);

  // Initialize board with checkers pieces
  const tiles = Array.from({ length: 64 }, (_, i) => {
    const row = Math.floor(i / 8);
    const col = i % 8;
    const isBlack = (row + col) % 2 === 1;
    
    let piece = null;
    
    // Set up initial checkers positions if no boardState provided
    if (!boardState) {
      // Top 3 rows - player 2 (black pieces)
      if (row < 3 && isBlack) {
        piece = { player: 2, king: false };
      }
      // Bottom 3 rows - player 1 (red pieces)
      else if (row > 4 && isBlack) {
        piece = { player: 1, king: false };
      }
    } else if (boardState[i]) {
      // Use provided board state
      piece = boardState[i];
    }
    
    return {
      index: i,
      isBlack,
      row,
      col,
      piece
    };
  });

  return (
    <div 
      ref={boardRef}
      className="w-full aspect-square grid grid-cols-8 grid-rows-8 border-4 border-chess-brown rounded-lg overflow-hidden shadow-2xl"
    >
      {tiles.map((tile) => (
        <CheckersTile
          key={tile.index}
          {...tile}
          size={size / 8}
          onMove={onMove}
          currentPlayer={currentPlayer}
          isPlayerTurn={isPlayerTurn}
        />
      ))}
    </div>
  );
};
