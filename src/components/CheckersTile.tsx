import React from 'react';
import { CheckersPiece } from './CheckersPiece';

interface PieceType {
  player: 1 | 2;
  king: boolean;
}

interface CheckersTileProps {
  index: number;
  isBlack: boolean;
  row: number;
  col: number;
  piece: PieceType | null;
  size: number;
  onMove?: (from: number, to: number) => void;
  currentPlayer?: 1 | 2;
  isPlayerTurn?: boolean;
}

export const CheckersTile: React.FC<CheckersTileProps> = ({
  index,
  isBlack,
  piece,
  size,
  onMove,
  currentPlayer,
  isPlayerTurn
}) => {
  const tileColor = isBlack ? 'bg-[#757575]' : 'bg-[#eeeeee]';

  return (
    <div 
      className={`flex justify-center items-center ${tileColor}`}
      style={{ width: '12.5%', height: '12.5%' }}
    >
      {piece && (
        <CheckersPiece
          player={piece.player}
          king={piece.king}
          index={index}
          size={size}
          onMove={onMove}
          currentPlayer={currentPlayer}
          isPlayerTurn={isPlayerTurn}
        />
      )}
    </div>
  );
};
