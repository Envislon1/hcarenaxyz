import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { gameService, indexToNotation } from "@/services/gameService";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Clock, Trophy, User } from "lucide-react";
import { 
  movePiece, 
  getLegalMovesForPlayer, 
  checkGameOver,
  GameState as CheckersGameState,
  PieceType
} from "@/utils/checkersLogic";

interface GameState {
  id: string;
  player1_id: string;
  player2_id: string | null;
  status: string;
  board_state: any;
  current_turn: number;
  player1_time_remaining: number;
  player2_time_remaining: number;
  game_type: string;
  stake_amount: number;
  winner_id: string | null;
}

const GamePage = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [game, setGame] = useState<GameState | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [boardState, setBoardState] = useState<any[]>([]);
  const [moveCount, setMoveCount] = useState(0);
  const [player1Time, setPlayer1Time] = useState(300);
  const [player2Time, setPlayer2Time] = useState(300);
  const [legalMoves, setLegalMoves] = useState<Map<number, number[]>>(new Map());
  const [highlightedMoves, setHighlightedMoves] = useState<number[]>([]);

  useEffect(() => {
    if (!gameId) return;

    // Load game
    gameService.getGame(gameId).then((gameData) => {
      if (gameData) {
        setGame(gameData);
        setPlayer1Time(gameData.player1_time_remaining);
        setPlayer2Time(gameData.player2_time_remaining);
        setMoveCount(gameData.current_turn - 1);
        
        // Load board state from database
        if (gameData.board_state && Array.isArray(gameData.board_state)) {
          const loadedBoard = gameData.board_state as any[];
          setBoardState(loadedBoard);
          updateLegalMoves(loadedBoard, gameData.current_turn);
        } else {
          // Initialize checkers board
          const initialBoard = getInitialCheckersBoard();
          setBoardState(initialBoard);
          updateLegalMoves(initialBoard, 1);
        }
      }
    });

    // Subscribe to game updates
    const gameChannel = gameService.subscribeToGame(gameId, (payload) => {
      console.log('Game update:', payload);
      if (payload.new) {
        setGame(payload.new);
        setPlayer1Time(payload.new.player1_time_remaining);
        setPlayer2Time(payload.new.player2_time_remaining);
        setMoveCount(payload.new.current_turn - 1);
        
        // Update board state from database
        if (payload.new.board_state && Array.isArray(payload.new.board_state)) {
          const updatedBoard = payload.new.board_state as any[];
          setBoardState(updatedBoard);
          updateLegalMoves(updatedBoard, payload.new.current_turn);
        }
      }
    });

    // Periodic sync to ensure board state is always up-to-date
    const syncInterval = setInterval(async () => {
      const latestGame = await gameService.getGame(gameId);
      if (latestGame && latestGame.board_state) {
        // Only update if board state actually changed
        const currentBoardStr = JSON.stringify(boardState);
        const latestBoardStr = JSON.stringify(latestGame.board_state);
        
        if (currentBoardStr !== latestBoardStr) {
          console.log('Syncing board state from database');
          const syncedBoard = latestGame.board_state as any[];
          setBoardState(syncedBoard);
          setMoveCount(latestGame.current_turn - 1);
          setPlayer1Time(latestGame.player1_time_remaining);
          setPlayer2Time(latestGame.player2_time_remaining);
          setGame(latestGame);
          updateLegalMoves(syncedBoard, latestGame.current_turn);
        }
      }
    }, 1000); // Sync every 1 second

    return () => {
      gameChannel.unsubscribe();
      clearInterval(syncInterval);
    };
  }, [gameId]);

  // Timer effect - sync with database every second
  useEffect(() => {
    if (!game || game.status !== 'active' || !user) return;
    
    // Don't start timer until both players have made their first moves
    if (moveCount < 2) return;

    const interval = setInterval(async () => {
      const isPlayer1 = user.id === game.player1_id;
      const isPlayer2 = user.id === game.player2_id;
      const isPlayer1Turn = moveCount % 2 === 0;

      // Only update time if it's this player's turn
      if ((isPlayer1 && isPlayer1Turn) || (isPlayer2 && !isPlayer1Turn)) {
        const currentTime = isPlayer1 ? player1Time : player2Time;
        const newTime = Math.max(0, currentTime - 1);

        if (isPlayer1) {
          setPlayer1Time(newTime);
        } else {
          setPlayer2Time(newTime);
        }

        // Sync to database
        try {
          await gameService.updatePlayerTime(game.id, user.id, newTime);
        } catch (error) {
          console.error('Failed to update time:', error);
        }

        if (newTime <= 0) {
          handleTimeout(isPlayer1 ? game.player2_id : game.player1_id);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [game, moveCount, player1Time, player2Time, user]);

  const handleTimeout = (winnerId: string | null) => {
    toast({
      title: "Time's up!",
      description: "Game over - time limit reached",
      variant: "destructive",
    });
  };

  // Update legal moves based on current board state
  const updateLegalMoves = (board: any[], currentTurn: number) => {
    const pieceCount = board.reduce((acc, piece) => {
      if (piece?.player === 1) acc.p1++;
      if (piece?.player === 2) acc.p2++;
      return acc;
    }, { p1: 0, p2: 0 });

    const checkersState: CheckersGameState = {
      tiles: board,
      playerTurn: ((currentTurn - 1) % 2 + 1) as 1 | 2,
      numPieceOne: pieceCount.p1,
      numPieceTwo: pieceCount.p2,
      jumping: null,
    };

    const moves = getLegalMovesForPlayer(checkersState);
    setLegalMoves(moves);
  };

  const handleSquareClick = async (index: number) => {
    if (!game || !user) return;
    if (game.status !== 'active') return;

    const isPlayer1 = user.id === game.player1_id;
    const isPlayer2 = user.id === game.player2_id;
    const isPlayer1Turn = moveCount % 2 === 0;

    // Check if it's player's turn
    if ((isPlayer1 && !isPlayer1Turn) || (isPlayer2 && isPlayer1Turn)) {
      return;
    }

    if (selectedSquare === null) {
      // Select a piece
      const piece = boardState[index];
      if (piece && piece.player) {
        const isPieceOwnedByCurrentPlayer = 
          (isPlayer1Turn && piece.player === 1) || 
          (!isPlayer1Turn && piece.player === 2);
        
        if (!isPieceOwnedByCurrentPlayer) {
          return;
        }

        // Check if this piece has legal moves
        const pieceLegalMoves = legalMoves.get(index) || [];
        if (pieceLegalMoves.length === 0) {
          toast({
            title: "Invalid Selection",
            description: "This piece has no legal moves",
            variant: "destructive",
          });
          return;
        }
        
        setSelectedSquare(index);
        setHighlightedMoves(pieceLegalMoves);
      }
    } else {
      // Make a move
      if (index === selectedSquare) {
        setSelectedSquare(null);
        setHighlightedMoves([]);
        return;
      }

      try {
        // Check if the move is legal using the checkers logic
        const selectedPieceMoves = legalMoves.get(selectedSquare) || [];
        if (!selectedPieceMoves.includes(index)) {
          toast({
            title: "Invalid Move",
            description: "That is not a legal move",
            variant: "destructive",
          });
          setSelectedSquare(null);
          setHighlightedMoves([]);
          return;
        }

        // Calculate piece counts
        const pieceCount = boardState.reduce((acc, piece) => {
          if (piece?.player === 1) acc.p1++;
          if (piece?.player === 2) acc.p2++;
          return acc;
        }, { p1: 0, p2: 0 });

        // Create game state for move validation
        const checkersState: CheckersGameState = {
          tiles: boardState,
          playerTurn: ((moveCount % 2) + 1) as 1 | 2,
          numPieceOne: pieceCount.p1,
          numPieceTwo: pieceCount.p2,
          jumping: null,
        };

        // Execute the move using checkers logic
        const moveResult = movePiece(selectedSquare, index, checkersState);
        
        if (!moveResult) {
          toast({
            title: "Invalid Move",
            description: "Move could not be executed",
            variant: "destructive",
          });
          setSelectedSquare(null);
          setHighlightedMoves([]);
          return;
        }

        const { newState, capturedPieces } = moveResult;

        // Check for game over
        const gameOverCheck = checkGameOver(newState);
        if (gameOverCheck.isOver && gameOverCheck.winner) {
          const winnerId = gameOverCheck.winner === 1 ? game.player1_id : game.player2_id;
          // Complete the game
          await gameService.completeGame(game.id, winnerId);
          
          toast({
            title: "Game Over!",
            description: `Player ${gameOverCheck.winner} wins!`,
          });
        }

        // Submit move to database
        await gameService.makeMove(
          game.id,
          user.id,
          {
            from: indexToNotation(selectedSquare),
            to: indexToNotation(index),
            piece: boardState[selectedSquare],
            captured: capturedPieces.length > 0
          },
          moveCount + 1,
          newState.tiles
        );
        
        setSelectedSquare(null);
        setHighlightedMoves([]);
      } catch (error) {
        console.error('Move error:', error);
        toast({
          title: "Error",
          description: "Failed to make move",
          variant: "destructive",
        });
      }
    }
  };

  if (!game) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-pulse text-chess-accent text-xl">Loading game...</div>
        </div>
      </div>
    );
  }

  const isPlayer1 = user?.id === game.player1_id;
  const isPlayer2 = user?.id === game.player2_id;
  const currentPlayerTime = (moveCount % 2 === 0) ? player1Time : player2Time;

  return (
    <div className="w-full max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar - Player Info */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4 bg-chess-dark/90 border-chess-brown">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-5 h-5 text-chess-accent" />
              <span className="text-sm text-gray-400">Player 1</span>
            </div>
            <div className="text-white font-semibold mb-2">Player 1</div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="font-mono">{Math.floor(player1Time / 60)}:{(player1Time % 60).toString().padStart(2, '0')}</span>
            </div>
          </Card>

          <Card className="p-4 bg-chess-dark/90 border-chess-brown">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-5 h-5 text-chess-accent" />
              <span className="text-sm text-gray-400">Player 2</span>
            </div>
            <div className="text-white font-semibold mb-2">
              {game.player2_id ? 'Player 2' : 'Waiting...'}
            </div>
            {game.player2_id && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="font-mono">{Math.floor(player2Time / 60)}:{(player2Time % 60).toString().padStart(2, '0')}</span>
              </div>
            )}
          </Card>

          <Card className="p-4 bg-chess-dark/90 border-chess-brown">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-chess-accent" />
              <span className="text-sm text-gray-400">Stake</span>
            </div>
            <div className="text-white font-semibold">{game.stake_amount} Holocoins</div>
          </Card>
        </div>

        {/* Game Board - 3/4 of screen */}
        <div className="lg:col-span-3">
          <div className="w-full max-w-3xl mx-auto px-0 md:px-4">
            <div className="aspect-square w-full grid grid-cols-8 grid-rows-8 border-2 md:border-4 border-chess-brown rounded-lg overflow-hidden shadow-2xl">
              {boardState.map((piece, index) => {
                const row = Math.floor(index / 8);
                const col = index % 8;
                const isLight = (row + col) % 2 === 0;
                const isSelected = selectedSquare === index;
                const notation = indexToNotation(index);

                // Render checkers piece
                const renderPiece = () => {
                  if (!piece || !piece.player) return null;
                  
                  const colors = piece.player === 1 
                    ? { outer: 'rgb(183, 28, 28)', inner: 'rgb(229, 57, 53)' }
                    : { outer: 'rgb(33, 33, 33)', inner: 'rgb(66, 66, 66)' };
                  
                  return (
                    <div 
                      className="w-[70%] h-[70%] rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: colors.outer,
                        boxShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                      }}
                    >
                      <div 
                        className="w-[85%] h-[85%] rounded-full flex items-center justify-center"
                        style={{ backgroundColor: colors.inner }}
                      >
                        {piece.king && <span className="text-lg">👑</span>}
                      </div>
                    </div>
                  );
                };

                const isHighlighted = highlightedMoves.includes(index);

                return (
                  <div
                    key={index}
                    onClick={() => handleSquareClick(index)}
                    className={`
                      relative flex items-center justify-center cursor-pointer transition-all
                      ${isLight ? 'bg-chess-light' : 'bg-chess-brown'}
                      ${isSelected ? 'ring-4 ring-chess-accent' : ''}
                      ${isHighlighted ? 'ring-2 ring-yellow-400' : ''}
                      hover:opacity-80
                    `}
                  >
                    {renderPiece()}
                    
                    {/* Square notation */}
                    <div className="absolute bottom-0.5 right-0.5 text-[8px] md:text-xs opacity-50 font-mono">
                      {notation}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Move indicator */}
            <div className="mt-4 text-center">
              {game.status === 'active' && (
                <div className="text-white text-lg">
                  {(isPlayer1 && moveCount % 2 === 0) || (isPlayer2 && moveCount % 2 === 1)
                    ? "Your turn"
                    : "Opponent's turn"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Initial checkers board setup
function getInitialBoard(): any[] {
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
}

// Initial checkers board setup
function getInitialCheckersBoard(): any[] {
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
}

export default GamePage;
