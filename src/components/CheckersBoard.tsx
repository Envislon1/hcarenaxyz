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
      className="w-full aspect-square border-4 border-chess-brown rounded-lg overflow-hidden shadow-2xl"
    >
      <div className="w-full h-full grid grid-cols-8 grid-rows-8">
        {tiles.map((tile) => {
          const row = tile.row;
          const col = tile.col;
          const isLight = (row + col) % 2 === 0;
          
          return (
            <div 
              key={tile.index}
              className={`flex items-center justify-center ${isLight ? 'bg-chess-light' : 'bg-chess-brown'}`}
            >
              {tile.piece && (
                <div 
                  className="w-[70%] h-[70%] rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: tile.piece.player === 1 ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)',
                    boxShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                  }}
                >
                  <div 
                    className="w-[85%] h-[85%] rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: tile.piece.player === 1 ? 'rgb(66, 66, 66)' : 'rgb(30, 30, 30)'
                    }}
                  >
                    {tile.piece.king && <span className="text-base">👑</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
