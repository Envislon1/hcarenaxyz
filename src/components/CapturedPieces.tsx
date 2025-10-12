import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CapturedPiecesProps {
  player1Captures: number;
  player2Captures: number;
  player1Username: string;
  player2Username: string;
  isPlayer1: boolean;
  gameType: string;
  boardState: any[];
  gameId?: string;
}

// Chess piece notations
const chessPieceNotations: Record<string, string> = {
  'q': 'Qn', 'r': 'Rk', 'b': 'Bp', 'n': 'Kt', 'p': 'Pn', 'k': 'Kg',
  'Q': 'Qn', 'R': 'Rk', 'B': 'Bp', 'N': 'Kt', 'P': 'Pn', 'K': 'Kg'
};

export const CapturedPieces = ({ 
  player1Captures, 
  player2Captures, 
  player1Username, 
  player2Username,
  isPlayer1,
  gameType,
  boardState,
  gameId
}: CapturedPiecesProps) => {
  const [player1CapturedPieces, setPlayer1CapturedPieces] = useState<string[]>([]);
  const [player2CapturedPieces, setPlayer2CapturedPieces] = useState<string[]>([]);
  
  const myUsername = isPlayer1 ? player1Username : player2Username;
  const opponentUsername = isPlayer1 ? player2Username : player1Username;

  useEffect(() => {
    if (!gameId || gameType !== 'chess') return;

    const fetchCapturedPieces = async () => {
      const { data: moves, error } = await supabase
        .from('game_moves')
        .select('notation, player_id, captured_piece')
        .eq('game_id', gameId)
        .eq('captured_piece', true)
        .order('move_number', { ascending: true });

      if (error || !moves) return;

      const player1Pieces: string[] = [];
      const player2Pieces: string[] = [];

      // Parse notation to extract captured piece type
      moves.forEach((move: any) => {
        // Extract piece from notation (e.g., "Nxe4" -> N for Knight)
        let piece = 'Pn'; // Default to pawn
        if (move.notation) {
          const firstChar = move.notation.charAt(0);
          if (chessPieceNotations[firstChar]) {
            piece = chessPieceNotations[firstChar];
          } else if (chessPieceNotations[firstChar.toUpperCase()]) {
            piece = chessPieceNotations[firstChar.toUpperCase()];
          }
        }
        
        // Determine which player captured
        const isPlayer1Move = move.player_id === (isPlayer1 ? player1Username : player2Username);
        if (isPlayer1Move) {
          player1Pieces.push(piece);
        } else {
          player2Pieces.push(piece);
        }
      });

      setPlayer1CapturedPieces(player1Pieces);
      setPlayer2CapturedPieces(player2Pieces);
    };

    fetchCapturedPieces();
  }, [gameId, gameType, isPlayer1, player1Username, player2Username]);

  const myCapturedPieces = isPlayer1 ? player1CapturedPieces : player2CapturedPieces;
  const opponentCapturedPieces = isPlayer1 ? player2CapturedPieces : player1CapturedPieces;

  // Function to render captured pieces
  const renderCapturedPieces = (pieces: string[], isMyCapture: boolean) => {
    if (gameType === 'chess') {
      if (pieces.length === 0) {
        return <span className="text-xs text-gray-500">None</span>;
      }
      return (
        <div className="flex flex-wrap gap-1">
          {pieces.map((piece, i) => (
            <span key={i} className={`text-sm font-semibold ${isMyCapture ? 'text-chess-accent' : 'text-red-400'}`}>
              {piece}
            </span>
          ))}
        </div>
      );
    } else {
      // For checkers, show count
      const count = isMyCapture ? player1Captures : player2Captures;
      if (count === 0) {
        return <span className="text-xs text-gray-500">None</span>;
      }
      return (
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: isMyCapture ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)',
                boxShadow: '1px 1px 3px rgba(0,0,0,0.3)'
              }}
            >
              <div
                className="w-[75%] h-[75%] rounded-full"
                style={{
                  backgroundColor: isMyCapture ? 'rgb(30, 30, 30)' : 'rgb(66, 66, 66)'
                }}
              />
            </div>
          ))}
        </div>
      );
    }
  };

  return (
    <Card className="p-4 bg-chess-dark/50 border-chess-brown/50">
      <h3 className="text-sm font-semibold text-chess-accent mb-3">Captured Pieces</h3>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">{myUsername} (You)</span>
            <span className="text-xs text-gray-400">{gameType === 'chess' ? myCapturedPieces.length : player1Captures} pieces</span>
          </div>
          <div className="min-h-[28px]">
            {renderCapturedPieces(myCapturedPieces, true)}
          </div>
        </div>
        <div className="h-px bg-chess-brown/30" />
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">{opponentUsername}</span>
            <span className="text-xs text-gray-400">{gameType === 'chess' ? opponentCapturedPieces.length : player2Captures} pieces</span>
          </div>
          <div className="min-h-[28px]">
            {renderCapturedPieces(opponentCapturedPieces, false)}
          </div>
        </div>
      </div>
    </Card>
  );
};
