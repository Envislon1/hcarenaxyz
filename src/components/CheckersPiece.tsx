import React from 'react';
import { Crown } from 'lucide-react';

interface CheckersPieceProps {
  player: 1 | 2;
  king: boolean;
  index: number;
  size: number;
  onMove?: (from: number, to: number) => void;
  currentPlayer?: 1 | 2;
  isPlayerTurn?: boolean;
}

export const CheckersPiece: React.FC<CheckersPieceProps> = ({
  player,
  king,
  size
}) => {
  // Player 1 = white outer with gray inner, Player 2 = black outer with darker inner
  const colors = player === 1 
    ? { outer: 'rgb(255, 255, 255)', inner: 'rgb(66, 66, 66)' }
    : { outer: 'rgb(0, 0, 0)', inner: 'rgb(30, 30, 30)' };

  return (
    <div 
      className="flex items-center justify-center rounded-full"
      style={{
        width: '80%',
        height: '80%',
        backgroundColor: colors.outer,
        boxShadow: '3px 3px 3px 1px #424242'
      }}
    >
      <div 
        className="flex justify-center items-center rounded-full"
        style={{
          width: '79%',
          height: '79%',
          backgroundColor: colors.inner
        }}
      >
        {king && (
          <Crown 
            size={size / 3} 
            style={{ color: colors.outer }}
          />
        )}
      </div>
    </div>
  );
};
