interface GameTileProps {
  index: number;
  isBlack: boolean;
  row: number;
  col: number;
  piece: any;
  gameType: 'chess' | 'checkers';
  size: number;
  onMove?: (from: number, to: number) => void;
}

export const GameTile = ({ index, isBlack, row, col, piece, gameType, size }: GameTileProps) => {
  const tileColor = isBlack ? 'bg-chess-brown' : 'bg-chess-light';
  
  const getPieceDisplay = () => {
    if (!piece) return null;
    
    if (gameType === 'checkers') {
      // Checkers pieces: player 1 is white, player 2 is black
      const isPlayer1 = piece.player === 1;
      const color = isPlayer1 
        ? 'bg-gradient-to-br from-white to-gray-200' 
        : 'bg-gradient-to-br from-gray-800 to-black';
      const borderColor = isPlayer1 ? 'border-gray-300' : 'border-gray-900';
      
      return (
        <div className={`w-[80%] h-[80%] rounded-full ${color} border-4 ${borderColor} shadow-lg flex items-center justify-center`}>
          {piece.king && (
            <span className="text-yellow-500 text-2xl">♔</span>
          )}
        </div>
      );
    } else {
      // Chess pieces
      const chessPieces = {
        // White pieces (player 1)
        '1-pawn': '♙',
        '1-rook': '♖',
        '1-knight': '♘',
        '1-bishop': '♗',
        '1-queen': '♕',
        '1-king': '♔',
        // Black pieces (player 2)
        '2-pawn': '♟',
        '2-rook': '♜',
        '2-knight': '♞',
        '2-bishop': '♝',
        '2-queen': '♛',
        '2-king': '♚'
      };
      
      const pieceKey = `${piece.player}-${piece.type}` as keyof typeof chessPieces;
      return <span className="text-4xl">{chessPieces[pieceKey] || '?'}</span>;
    }
  };

  return (
    <div 
      className={`${tileColor} flex items-center justify-center relative cursor-pointer hover:opacity-80 transition-opacity`}
    >
      {getPieceDisplay()}
      
      {/* Row and column labels */}
      {col === 0 && (
        <div className="absolute top-1 left-1 text-xs opacity-60">
          {8 - row}
        </div>
      )}
      {row === 7 && (
        <div className="absolute bottom-1 right-1 text-xs opacity-60">
          {String.fromCharCode(97 + col)}
        </div>
      )}
    </div>
  );
};
