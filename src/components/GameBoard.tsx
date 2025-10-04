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
      className="w-full aspect-square grid grid-cols-8 grid-rows-8 border-2 border-chess-brown rounded-lg overflow-hidden shadow-2xl"
    >
      {tiles.map((tile) => (
        <GameTile
          key={tile.index}
          {...tile}
          gameType={gameType}
          size={size / 8}
          onMove={onMove}
        />
      ))}
    </div>
  );
};
