import { useState, useEffect } from 'react';
import { 
  movePiece, 
  getLegalMovesForPlayer, 
  checkGameOver,
  GameState as CheckersGameState,
  PieceType
} from "@/utils/checkersLogic";
import { indexToNotation } from "@/services/gameService";
import { Button } from "@/components/ui/button";
import { RotateCcw, Undo2 } from "lucide-react";

export const PracticeBoard = () => {
  const [boardState, setBoardState] = useState<(PieceType | null)[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [highlightedMoves, setHighlightedMoves] = useState<number[]>([]);
  const [legalMoves, setLegalMoves] = useState<Map<number, number[]>>(new Map());
  const [currentTurn, setCurrentTurn] = useState<1 | 2>(1);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [moveHistory, setMoveHistory] = useState<{
    boardState: (PieceType | null)[];
    turn: 1 | 2;
  }[]>([]);

  useEffect(() => {
    // Initialize board
    const initialBoard = getInitialCheckersBoard();
    setBoardState(initialBoard);
    updateLegalMoves(initialBoard, 1);
    setMoveHistory([{ boardState: initialBoard, turn: 1 }]);
  }, []);

  // AI move effect
  useEffect(() => {
    if (currentTurn === 2 && !gameOver) {
      // Add delay for AI to think
      const timer = setTimeout(() => {
        makeAIMove();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentTurn, gameOver, boardState]);

  const getInitialCheckersBoard = (): (PieceType | null)[] => {
    const board = Array(64).fill(null);
    
    for (let i = 0; i < 64; i++) {
      const row = Math.floor(i / 8);
      const col = i % 8;
      const isBlack = (row + col) % 2 === 1;
      
      if (row < 3 && isBlack) {
        board[i] = { player: 2, king: false };
      } else if (row > 4 && isBlack) {
        board[i] = { player: 1, king: false };
      }
    }
    
    return board;
  };

  const updateLegalMoves = (board: (PieceType | null)[], turn: 1 | 2) => {
    const pieceCount = board.reduce((acc, piece) => {
      if (piece?.player === 1) acc.p1++;
      if (piece?.player === 2) acc.p2++;
      return acc;
    }, { p1: 0, p2: 0 });

    const checkersState: CheckersGameState = {
      tiles: board,
      playerTurn: turn,
      numPieceOne: pieceCount.p1,
      numPieceTwo: pieceCount.p2,
      jumping: null,
    };

    const moves = getLegalMovesForPlayer(checkersState);
    setLegalMoves(moves);

    // Check game over
    const gameStatus = checkGameOver(checkersState);
    if (gameStatus.isOver) {
      setGameOver(true);
      setWinner(gameStatus.winner);
    }
  };

  const makeAIMove = () => {
    const pieceCount = boardState.reduce((acc, piece) => {
      if (piece?.player === 1) acc.p1++;
      if (piece?.player === 2) acc.p2++;
      return acc;
    }, { p1: 0, p2: 0 });

    const checkersState: CheckersGameState = {
      tiles: boardState,
      playerTurn: 2,
      numPieceOne: pieceCount.p1,
      numPieceTwo: pieceCount.p2,
      jumping: null,
    };

    const aiMoves = getLegalMovesForPlayer(checkersState);
    
    if (aiMoves.size === 0) return;

    // Simple AI: pick random piece and random move
    const pieces = Array.from(aiMoves.keys());
    const randomPieceIndex = pieces[Math.floor(Math.random() * pieces.length)];
    const moves = aiMoves.get(randomPieceIndex) || [];
    const randomMove = moves[Math.floor(Math.random() * moves.length)];

    const result = movePiece(randomPieceIndex, randomMove, checkersState);
    
    if (result) {
      const newBoard = result.newState.tiles;
      const newTurn = 1;
      
      // Save to history
      setMoveHistory(prev => [...prev, { boardState: newBoard, turn: newTurn }]);
      
      setBoardState(newBoard);
      setCurrentTurn(newTurn);
      updateLegalMoves(newBoard, newTurn);
    }
  };

  const handleSquareClick = (index: number) => {
    if (gameOver || currentTurn !== 1) return;

    if (selectedSquare === null) {
      const piece = boardState[index];
      if (piece && piece.player === 1) {
        const pieceLegalMoves = legalMoves.get(index) || [];
        if (pieceLegalMoves.length === 0) return;
        
        setSelectedSquare(index);
        setHighlightedMoves(pieceLegalMoves);
      }
    } else {
      if (index === selectedSquare) {
        setSelectedSquare(null);
        setHighlightedMoves([]);
        return;
      }

      const selectedPieceMoves = legalMoves.get(selectedSquare) || [];
      if (!selectedPieceMoves.includes(index)) {
        setSelectedSquare(null);
        setHighlightedMoves([]);
        return;
      }

      const pieceCount = boardState.reduce((acc, piece) => {
        if (piece?.player === 1) acc.p1++;
        if (piece?.player === 2) acc.p2++;
        return acc;
      }, { p1: 0, p2: 0 });

      const checkersState: CheckersGameState = {
        tiles: boardState,
        playerTurn: 1,
        numPieceOne: pieceCount.p1,
        numPieceTwo: pieceCount.p2,
        jumping: null,
      };

      const result = movePiece(selectedSquare, index, checkersState);
      
      if (result) {
        const newBoard = result.newState.tiles;
        const newTurn = 2;
        
        // Save to history
        setMoveHistory(prev => [...prev, { boardState: newBoard, turn: newTurn }]);
        
        setBoardState(newBoard);
        setCurrentTurn(newTurn);
        updateLegalMoves(newBoard, newTurn);
        setSelectedSquare(null);
        setHighlightedMoves([]);
      }
    }
  };

  const resetGame = () => {
    const initialBoard = getInitialCheckersBoard();
    setBoardState(initialBoard);
    setCurrentTurn(1);
    setGameOver(false);
    setWinner(null);
    setSelectedSquare(null);
    setHighlightedMoves([]);
    setMoveHistory([{ boardState: initialBoard, turn: 1 }]);
    updateLegalMoves(initialBoard, 1);
  };

  const takeBack = () => {
    if (moveHistory.length > 1) {
      // Remove last move (AI) and second-to-last move (player)
      const newHistory = moveHistory.slice(0, -2);
      const lastState = newHistory[newHistory.length - 1];
      
      setMoveHistory(newHistory);
      setBoardState(lastState.boardState);
      setCurrentTurn(lastState.turn);
      setGameOver(false);
      setWinner(null);
      setSelectedSquare(null);
      setHighlightedMoves([]);
      updateLegalMoves(lastState.boardState, lastState.turn);
    }
  };

  const boardIndices = Array.from({ length: 64 }, (_, i) => i);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-center flex-1">
          <h3 className="text-xl font-bold text-white mb-2">Practice Mode</h3>
          <p className="text-sm text-gray-400">
            {gameOver 
              ? winner === 1 ? "You Won! 🎉" : "AI Won!"
              : currentTurn === 1 ? "Your Turn (Red)" : "AI's Turn (Black)"
            }
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={takeBack}
            disabled={moveHistory.length <= 1 || gameOver}
            variant="outline"
            size="sm"
            className="border-chess-accent text-chess-accent"
          >
            <Undo2 className="w-4 h-4 mr-1" />
            Take Back
          </Button>
          <Button
            onClick={resetGame}
            variant="outline"
            size="sm"
            className="border-chess-accent text-chess-accent"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Restart
          </Button>
        </div>
      </div>

      <div className="w-full aspect-square grid grid-cols-8 grid-rows-8 border-4 border-chess-brown rounded-lg overflow-hidden shadow-2xl">
        {boardIndices.map((index) => {
          const piece = boardState[index];
          const row = Math.floor(index / 8);
          const col = index % 8;
          const isLight = (row + col) % 2 === 0;
          const isSelected = selectedSquare === index;
          const notation = indexToNotation(index);

          const renderPiece = () => {
            if (!piece || !piece.player) return null;
            
            const colors = piece.player === 1 
              ? { outer: 'rgb(255, 255, 255)', inner: 'rgb(66, 66, 66)' }
              : { outer: 'rgb(0, 0, 0)', inner: 'rgb(30, 30, 30)' };
            
            return (
              <div 
                className="w-[70%] h-[70%] rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: colors.outer,
                  boxShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                }}
              >
                <div 
                  className="w-[85%] h-[85%] rounded-full flex flex-col items-center justify-center"
                  style={{ backgroundColor: colors.inner }}
                >
                  {piece.king && <span className="text-base">👑</span>}
                  <span className="text-[8px] font-bold text-yellow-400">1hc</span>
                </div>
              </div>
            );
          };

              const isHighlighted = highlightedMoves.includes(index);
              const canMoveFromHere = legalMoves.has(index) && currentTurn === 1 && boardState[index]?.player === 1;

              return (
                <div
                  key={index}
                  onClick={() => handleSquareClick(index)}
                  className={`
                    relative flex items-center justify-center cursor-pointer transition-all
                    ${isLight ? 'bg-chess-light' : 'bg-chess-brown'}
                    ${isSelected ? 'ring-4 ring-chess-accent' : ''}
                    ${canMoveFromHere && !isSelected ? 'ring-2 ring-yellow-400 animate-glow-blink' : ''}
                    hover:opacity-80
                  `}
                  style={{
                    ...(isHighlighted && {
                      backgroundColor: '#e2c044',
                      opacity: 0.4,
                      boxShadow: '0 0 20px rgba(226, 192, 68, 0.6) inset'
                    })
                  }}
                >
              {renderPiece()}
              <div className="absolute bottom-0.5 right-0.5 text-[8px] opacity-50 font-mono">
                {notation}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};