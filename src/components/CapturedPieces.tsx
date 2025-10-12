import { Card } from "@/components/ui/card";

interface CapturedPiecesProps {
  player1Captures: number;
  player2Captures: number;
  player1Username: string;
  player2Username: string;
  isPlayer1: boolean;
}

export const CapturedPieces = ({ 
  player1Captures, 
  player2Captures, 
  player1Username, 
  player2Username,
  isPlayer1
}: CapturedPiecesProps) => {
  const myCaptures = isPlayer1 ? player1Captures : player2Captures;
  const opponentCaptures = isPlayer1 ? player2Captures : player1Captures;
  const myUsername = isPlayer1 ? player1Username : player2Username;
  const opponentUsername = isPlayer1 ? player2Username : player1Username;

  return (
    <Card className="p-4 bg-chess-dark/50 border-chess-brown/50">
      <h3 className="text-sm font-semibold text-chess-accent mb-3">Captured Pieces</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-300">{myUsername} (You)</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-chess-accent">{myCaptures}</span>
            <span className="text-xs text-gray-400">pieces</span>
          </div>
        </div>
        <div className="h-px bg-chess-brown/30" />
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-300">{opponentUsername}</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-red-400">{opponentCaptures}</span>
            <span className="text-xs text-gray-400">pieces</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
