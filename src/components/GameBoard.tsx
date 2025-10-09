import { useEffect, useRef, useState } from 'react';
import { GameTile } from './GameTile';

interface GameBoardProps {
  gameType: 'chess' | 'checkers';
  boardState?: any;
  onMove?: (from: number, to: number) => void;
  simplified?: boolean;
}

export const GameBoard = ({ gameType, boardState, onMove, simplified = false }: GameBoardProps) => {
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

  const tiles = Array.from({ length: 64 }, (_, i) => {
    const row = Math.floor(i / 8);
    const col = i % 8;
    const isBlack = (row + col) % 2 === 1;
    
    return {
      index: i,
      isBlack,
      row,
      col,
      piece: boardState?.tiles?.[i]?.piece || null
    };
  });

  return (
    <div 
      ref={boardRef}
      className="w-full aspect-square border-4 border-chess-brown rounded-lg overflow-hidden shadow-2xl"
    >
      <div className="w-full h-full grid grid-cols-8 grid-rows-8">
        {tiles.map((tile) => {
          const isLight = (tile.row + tile.col) % 2 === 0;
          
          return (
            <div 
              key={tile.index}
              className={`flex items-center justify-center ${isLight ? 'bg-chess-light' : 'bg-chess-brown'}`}
            >
              {tile.piece && gameType === 'checkers' && (
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
