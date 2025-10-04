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
  // Player 1 = red, Player 2 = black
  const colors = player === 1 
    ? { outer: 'rgb(183, 28, 28)', inner: 'rgb(229, 57, 53)' }
    : { outer: 'rgb(33, 33, 33)', inner: 'rgb(66, 66, 66)' };

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
