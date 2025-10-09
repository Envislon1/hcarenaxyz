import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { gameService, indexToNotation } from "@/services/gameService";
import { userService } from "@/services/userService";
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
import { GameChat } from "@/components/GameChat";
import { useGamePresence } from "@/hooks/useGamePresence";
import { useNotifications } from "@/context/NotificationContext";
import { CapturedPieces } from "@/components/CapturedPieces";

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
  player1_captures: number;
  player2_captures: number;
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
  const [player1Username, setPlayer1Username] = useState<string>('');
  const [player2Username, setPlayer2Username] = useState<string>('');
  const [showRematchDialog, setShowRematchDialog] = useState(false);
  const [rematchOfferId, setRematchOfferId] = useState<string | null>(null);
  const [rematchOfferFrom, setRematchOfferFrom] = useState<string | null>(null);
  const [showDrawDialog, setShowDrawDialog] = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showTakebackDialog, setShowTakebackDialog] = useState(false);
  const [takebackRequestId, setTakebackRequestId] = useState<string | null>(null);
  const [takebackRequestFrom, setTakebackRequestFrom] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [lowTimeWarning, setLowTimeWarning] = useState(false);
  
  const { playSound } = useNotifications();

  const isPlayer1 = user?.id === game?.player1_id;
  const isPlayer2 = user?.id === game?.player2_id;
  const isMyTurn = (isPlayer1 && moveCount % 2 === 0) || (isPlayer2 && moveCount % 2 === 1);

  const { player1Online, player2Online, shouldControlTimer } = useGamePresence(
    gameId,
    user?.id,
    game?.player1_id,
    game?.player2_id,
    isMyTurn
  );

  useEffect(() => {
    if (!gameId) return;

    // Load game
    gameService.getGame(gameId).then(async (gameData) => {
      if (gameData) {
        setGame(gameData);
        setPlayer1Time(gameData.player1_time_remaining);
        setPlayer2Time(gameData.player2_time_remaining);
        setMoveCount(gameData.current_turn - 1);
        
        // Play sound when game starts
        if (gameData.status === 'active' && !gameStarted) {
          playSound('/sounds/game-start.mp3');
          setGameStarted(true);
        }
        
        // Fetch player usernames
        const p1 = await userService.getUserById(gameData.player1_id);
        if (p1) setPlayer1Username(p1.username);
        
        if (gameData.player2_id) {
          const p2 = await userService.getUserById(gameData.player2_id);
          if (p2) setPlayer2Username(p2.username);
        }
        
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
        // Check if game was cancelled
        if (payload.new.status === 'cancelled') {
          toast({
            title: "Game Cancelled",
            description: "The game has been cancelled. All funds have been refunded.",
            variant: "destructive",
          });
          setTimeout(() => navigate('/matches'), 2000);
          return;
        }
        
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

    // Subscribe to rematch offers
    const rematchChannel = gameService.subscribeToRematchOffers(gameId, (payload) => {
      console.log('Rematch offer event:', payload);
      
      // Handle new rematch offer
      if (payload.eventType === 'INSERT' && payload.new) {
        const offer = payload.new;
        if (offer.to_player_id === user?.id) {
          setRematchOfferId(offer.id);
          setRematchOfferFrom(offer.from_player_id);
          setShowRematchDialog(true);
        }
      }
      
      // Handle rematch accepted - navigate offerer to new game
      if (payload.eventType === 'UPDATE' && payload.new) {
        const offer = payload.new;
        if (offer.status === 'accepted' && offer.from_player_id === user?.id && offer.new_game_id) {
          toast({
            title: "Rematch Accepted!",
            description: "Opening new game...",
          });
          setTimeout(() => navigate(`/game/${offer.new_game_id}`), 500);
        }
      }
    });

    // Subscribe to draw offers
    const drawChannel = gameService.subscribeToDrawOffers(gameId, (payload) => {
      console.log('Draw offer received:', payload);
      if (payload.eventType === 'INSERT' && payload.new) {
        const offer = payload.new;
        console.log('Draw offer details:', offer, 'Current user:', user?.id);
        // Only show dialog if the offer was made by the opponent
        if (offer.offered_by_player_id !== user?.id) {
          console.log('Showing draw dialog');
          setShowDrawDialog(true);
        }
      }
    });

    // Subscribe to takeback requests
    const takebackChannel = gameService.subscribeToTakebackRequests(gameId, async (payload: any) => {
      console.log('Takeback request:', payload);
      if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && payload.new) {
        const request = payload.new;
        
        // Only show dialog if the request was made by the opponent and is pending
        if (request.requested_by_player_id !== user?.id && request.status === 'pending') {
          setTakebackRequestId(request.id);
          const requestingPlayer = request.requested_by_player_id === game.player1_id ? player1Username : player2Username;
          setTakebackRequestFrom(requestingPlayer);
          setShowTakebackDialog(true);
        } else if (request.status === 'accepted' && request.requested_by_player_id === user?.id) {
          // Refresh the game state when takeback is accepted
          const latestGame = await gameService.getGame(gameId);
          if (latestGame && latestGame.board_state) {
            const syncedBoard = latestGame.board_state as any[];
            setBoardState(syncedBoard);
            setMoveCount(latestGame.current_turn - 1);
            setGame(latestGame);
            updateLegalMoves(syncedBoard, latestGame.current_turn);
            setSelectedSquare(null);
            setHighlightedMoves([]);
          }
          toast({
            title: "Takeback Accepted",
            description: "Your opponent accepted the takeback request.",
          });
        } else if (request.status === 'declined' && request.requested_by_player_id === user?.id) {
          toast({
            title: "Takeback Declined",
            description: "Your opponent declined the takeback request.",
          });
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
          setGame(latestGame);
          updateLegalMoves(syncedBoard, latestGame.current_turn);
          
          // Only sync time if it's significantly different (more than 2 seconds)
          // to avoid overriding the client countdown
          const timeDiff1 = Math.abs(latestGame.player1_time_remaining - player1Time);
          const timeDiff2 = Math.abs(latestGame.player2_time_remaining - player2Time);
          
          if (timeDiff1 > 2 || timeDiff2 > 2) {
            setPlayer1Time(latestGame.player1_time_remaining);
            setPlayer2Time(latestGame.player2_time_remaining);
          }
        }
      }
    }, 2000); // Sync every 2 seconds

    return () => {
      gameChannel.unsubscribe();
      rematchChannel?.unsubscribe();
      drawChannel?.unsubscribe();
      takebackChannel?.unsubscribe();
      clearInterval(syncInterval);
    };
  }, [gameId, user, player1Username, player2Username]);

  // Low time warning sound effect
  useEffect(() => {
    if (!game || game.status !== 'active') return;
    
    const isPlayer1 = user?.id === game.player1_id;
    const myTime = isPlayer1 ? player1Time : player2Time;
    
    // Play beep when time is less than 60 seconds
    if (myTime < 60 && myTime > 0 && !lowTimeWarning) {
      setLowTimeWarning(true);
      
      // Play beep sound repeatedly
      const beepInterval = setInterval(() => {
        if (myTime > 0 && myTime < 60) {
          playSound('/sounds/move.ogg');
        }
      }, 2000); // Beep every 2 seconds
      
      return () => clearInterval(beepInterval);
    }
    
    if (myTime >= 60) {
      setLowTimeWarning(false);
    }
  }, [player1Time, player2Time, game, user, lowTimeWarning]);

  // Client-side countdown timer for smooth display
  useEffect(() => {
    if (!game || game.status !== 'active') return;
    
    // Don't start timer until both players have made at least one move
    if (moveCount < 2) return;

    const interval = setInterval(() => {
      const isPlayer1Turn = moveCount % 2 === 0;
      
      if (isPlayer1Turn) {
        setPlayer1Time((prevTime) => Math.max(0, prevTime - 1));
      } else {
        setPlayer2Time((prevTime) => Math.max(0, prevTime - 1));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [game, moveCount]);

  // Timer control based on player presence
  useEffect(() => {
    if (!game || game.status !== 'active' || !gameId) return;
    
    // Don't start timer until both players have made at least one move
    if (moveCount < 2) return;
    
    // If neither player online, server controls timer
    if (!player1Online && !player2Online) {
      const serverInterval = setInterval(() => {
        gameService.updatePlayerTime(gameId).catch((e) => console.log('server timer error', e));
      }, 1000);
      return () => clearInterval(serverInterval);
    }
    
    // If current user should control timer, send updates to server
    if (shouldControlTimer) {
      const controlInterval = setInterval(() => {
        gameService.updatePlayerTime(gameId).catch((e) => console.log('timer control error', e));
      }, 1000);
      return () => clearInterval(controlInterval);
    }
  }, [game?.status, gameId, player1Online, player2Online, shouldControlTimer, moveCount]);

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
          return;
        }
        
        setSelectedSquare(index);
        setHighlightedMoves(pieceLegalMoves);
      }
    } else {
      // Check if clicking on another piece to select it instead
      const clickedPiece = boardState[index];
      if (clickedPiece && clickedPiece.player) {
        const isPieceOwnedByCurrentPlayer = 
          (isPlayer1Turn && clickedPiece.player === 1) || 
          (!isPlayer1Turn && clickedPiece.player === 2);
        
        if (isPieceOwnedByCurrentPlayer && legalMoves.has(index)) {
          // Deselect previous piece and select new one
          const pieceLegalMoves = legalMoves.get(index) || [];
          if (pieceLegalMoves.length > 0) {
            setSelectedSquare(index);
            setHighlightedMoves(pieceLegalMoves);
            return;
          }
        }
      }
      
      // Make a move or deselect
      if (index === selectedSquare) {
        setSelectedSquare(null);
        setHighlightedMoves([]);
        return;
      }

      try {
        // Check if the move is legal using the checkers logic
        const selectedPieceMoves = legalMoves.get(selectedSquare) || [];
        if (!selectedPieceMoves.includes(index)) {
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
          setSelectedSquare(null);
          setHighlightedMoves([]);
          return;
        }

        const { newState, capturedPieces } = moveResult;

        // Debug: Log captured pieces
        console.log('Captured pieces in this move:', capturedPieces, 'Count:', capturedPieces.length);

        // Check for game over
        const gameOverCheck = checkGameOver(newState);
        if (gameOverCheck.isOver && gameOverCheck.winner) {
          const winnerId = gameOverCheck.winner === 1 ? game.player1_id : game.player2_id;
          // Complete the game
          await gameService.completeGame(game.id, winnerId);
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
          newState.tiles,
          boardState,
          capturedPieces.length
        );
        
        // Play move sound effect
        playSound('/sounds/move.ogg');
        
        setSelectedSquare(null);
        setHighlightedMoves([]);
      } catch (error) {
        console.error('Move error:', error);
      }
    }
  };

  const handleRematchOffer = async () => {
    if (!game || !user) return;
    
    try {
      await gameService.offerRematch(game.id, user.id, 
        user.id === game.player1_id ? game.player2_id : game.player1_id);
    } catch (error) {
      console.error('Rematch offer error:', error);
    }
  };

  const handleRematchResponse = async (accept: boolean) => {
    if (!rematchOfferId || !user) return;
    
    setShowRematchDialog(false);
    
    if (accept) {
      try {
        const result = await gameService.acceptRematch(rematchOfferId, user.id);
        if (result.success && result.gameId) {
          toast({
            title: "Rematch Started!",
            description: "Opening new game...",
          });
          navigate(`/game/${result.gameId}`);
        }
      } catch (error) {
        console.error('Rematch accept error:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to accept rematch",
          variant: "destructive",
        });
      }
    } else {
      await gameService.declineRematch(rematchOfferId);
      setRematchOfferId(null);
      setRematchOfferFrom(null);
    }
  };

  const handleResign = async () => {
    if (!game || !user) return;
    
    setShowResignConfirm(false);
    
    try {
      await gameService.resignGame(game.id);
      toast({
        title: "Game Resigned",
        description: "You have resigned from the game.",
      });
    } catch (error) {
      console.error('Resign error:', error);
      toast({
        title: "Error",
        description: "Failed to resign from game.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = async () => {
    if (!game || !user) return;
    
    setShowCancelConfirm(false);
    
    try {
      await gameService.cancelGame(game.id);
      toast({
        title: "Game Cancelled",
        description: "All coins have been refunded to both players.",
      });
      navigate('/matches');
    } catch (error) {
      console.error('Cancel error:', error);
      toast({
        title: "Error",
        description: "Failed to cancel game.",
        variant: "destructive",
      });
    }
  };

  const handleOfferDraw = async () => {
    if (!game || !user) return;
    
    try {
      await gameService.offerDraw(game.id, user.id);
      toast({
        title: "Draw Offered",
        description: "Waiting for opponent to accept.",
      });
    } catch (error) {
      console.error('Draw offer error:', error);
      toast({
        title: "Error",
        description: "Failed to offer draw.",
        variant: "destructive",
      });
    }
  };

  const handleDrawResponse = async (accept: boolean) => {
    if (!game) return;
    
    setShowDrawDialog(false);
    
    if (accept) {
      try {
        await gameService.acceptDraw(game.id);
        toast({
          title: "Draw Accepted",
          description: "Game ended in a draw. Stakes returned (minus holo fee).",
        });
      } catch (error) {
        console.error('Draw accept error:', error);
        toast({
          title: "Error",
          description: "Failed to accept draw.",
          variant: "destructive",
        });
      }
    }
  };

  const handleRequestTakeback = async () => {
    if (!game || !user) return;
    
    try {
      await gameService.requestTakeback(game.id, user.id);
      toast({
        title: "Takeback Requested",
        description: "Waiting for opponent to respond.",
      });
    } catch (error) {
      console.error('Takeback request error:', error);
      toast({
        title: "Error",
        description: "Failed to request takeback.",
        variant: "destructive",
      });
    }
  };

  const handleTakebackResponse = async (accept: boolean) => {
    if (!takebackRequestId) return;
    
    setShowTakebackDialog(false);
    
    try {
      if (accept) {
        await gameService.acceptTakeback(takebackRequestId, game!.id);
        toast({
          title: "Takeback Accepted",
          description: "Move has been taken back.",
        });
      } else {
        await gameService.declineTakeback(takebackRequestId);
        toast({
          title: "Takeback Declined",
          description: "You declined the takeback request.",
        });
      }
    } catch (error) {
      console.error('Takeback response error:', error);
      toast({
        title: "Error",
        description: "Failed to respond to takeback.",
        variant: "destructive",
      });
    }
    
    setTakebackRequestId(null);
    setTakebackRequestFrom(null);
  };

  // Get board indices in correct order based on player perspective
  const getBoardIndices = () => {
    const indices = Array.from({ length: 64 }, (_, i) => i);
    // Rotate board for player 2 so their pieces are at bottom
    return isPlayer2 ? indices.reverse() : indices;
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

  const currentPlayerTime = (moveCount % 2 === 0) ? player1Time : player2Time;
  const isGameOver = game.status === 'completed';
  const boardIndices = getBoardIndices();

  return (
    <div className="w-full min-h-screen">
      {/* Desktop Layout - Sidebar */}
      <div className="hidden lg:grid lg:grid-cols-4 gap-4 max-w-7xl mx-auto px-4 py-8">
        {/* Sidebar - Player Info */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4 bg-chess-dark/90 border-chess-brown">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-5 h-5 text-chess-accent" />
              <span className="text-sm text-gray-400">{player1Username || 'Player 1'}</span>
            </div>
            <div className="text-white font-semibold mb-2">{player1Username || 'Player 1'}</div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span 
                className={`font-mono ${player1Time < 60 ? 'text-[#e2c044] animate-pulse font-bold' : ''}`}
                style={player1Time < 60 ? { textShadow: '0 0 10px #e2c044' } : {}}
              >
                {Math.floor(player1Time / 60)}:{(player1Time % 60).toString().padStart(2, '0')}
              </span>
            </div>
            {game.status === 'active' && isPlayer1 && moveCount % 2 === 0 && (
              <div className="mt-2 text-xs font-semibold">
                <span className="text-chess-accent">YOUR TURN</span>
              </div>
            )}
          </Card>

          <Card className="p-4 bg-chess-dark/90 border-chess-brown">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-5 h-5 text-chess-accent" />
              <span className="text-sm text-gray-400">{player2Username || 'Player 2'}</span>
            </div>
            <div className="text-white font-semibold mb-2">
              {game.player2_id ? (player2Username || 'Player 2') : 'Waiting...'}
            </div>
            {game.player2_id && (
              <>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span 
                    className={`font-mono ${player2Time < 60 ? 'text-[#e2c044] animate-pulse font-bold' : ''}`}
                    style={player2Time < 60 ? { textShadow: '0 0 10px #e2c044' } : {}}
                  >
                    {Math.floor(player2Time / 60)}:{(player2Time % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                {game.status === 'active' && isPlayer1 && moveCount % 2 === 1 && (
                  <div className="mt-2 text-xs font-semibold">
                    <span className="text-[#e2c044]">OPPONENT'S TURN</span>
                  </div>
                )}
                {game.status === 'active' && isPlayer2 && moveCount % 2 === 1 && (
                  <div className="mt-2 text-xs font-semibold">
                    <span className="text-chess-accent">YOUR TURN</span>
                  </div>
                )}
                {game.status === 'active' && isPlayer2 && moveCount % 2 === 0 && (
                  <div className="mt-2 text-xs font-semibold">
                    <span className="text-[#e2c044]">OPPONENT'S TURN</span>
                  </div>
                )}
              </>
            )}
          </Card>

          <Card className="p-4 bg-chess-dark/90 border-chess-brown">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-chess-accent" />
              <span className="text-sm text-gray-400">Total Stake</span>
            </div>
            <div className="text-white font-semibold">{(game.stake_amount * 12).toFixed(1)} HC</div>
            <div className="text-xs text-gray-400 mt-2">
              Stake Per Piece: {game.stake_amount.toFixed(1)} HC
            </div>
          </Card>

          {game.status === 'active' && (
            <CapturedPieces
              player1Captures={game.player1_captures || 0}
              player2Captures={game.player2_captures || 0}
              player1Username={player1Username}
              player2Username={player2Username}
              isPlayer1={isPlayer1}
            />
          )}
        </div>

        {/* Game Board - Desktop */}
        <div className="lg:col-span-3">
          <div className="w-full max-w-3xl mx-auto">
            <div className="aspect-square w-full grid grid-cols-8 grid-rows-8 border-4 border-chess-brown rounded-lg overflow-hidden shadow-2xl">
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
                  
                  const pieceWorth = `${Math.round(game.stake_amount)}hc`;
                  
                  return (
                    <div 
                      className="w-[70%] h-[70%] rounded-full flex items-center justify-center relative"
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
                        <span className="text-[8px] font-bold text-yellow-400">{pieceWorth}</span>
                      </div>
                    </div>
                  );
                };

                const isHighlighted = highlightedMoves.includes(index);
                const isPlayer1 = user?.id === game?.player1_id;
                const currentPlayerNumber = isPlayer1 ? 1 : 2;
                const isMyTurn = (isPlayer1 && moveCount % 2 === 0) || (!isPlayer1 && moveCount % 2 === 1);
                const canMoveFromHere = legalMoves.has(index) && boardState[index]?.player === currentPlayerNumber && isMyTurn;

                return (
                  <div
                    key={index}
                    onClick={() => handleSquareClick(index)}
                    className={`
                      relative flex items-center justify-center cursor-pointer transition-all
                      ${isLight ? 'bg-chess-light' : 'bg-chess-brown'}
                      ${canMoveFromHere && !isSelected ? 'shadow-[0_0_12px_rgba(255,237,74,0.8)] animate-pulse' : ''}
                      hover:opacity-80
                    `}
                    style={{
                      ...(isHighlighted && {
                        backgroundColor: 'rgba(255, 237, 74, 0.4)',
                        boxShadow: '0 0 25px rgba(255, 237, 74, 0.7) inset'
                      })
                    }}
                  >
                    {renderPiece()}
                    <div className="absolute bottom-0.5 right-0.5 text-xs opacity-50 font-mono">
                      {notation}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Move indicator and Action Buttons */}
            <div className="mt-4 text-center space-y-2">
              {(game.status === 'active' || game.status === 'waiting') && (
                <>
                  {game.status === 'active' && (
                    <div className="text-white text-lg">
                      {(isPlayer1 && moveCount % 2 === 0) || (isPlayer2 && moveCount % 2 === 1)
                        ? "Your turn"
                        : "Opponent's turn"}
                    </div>
                  )}
                  {game.status === 'waiting' && (
                    <div className="text-white text-lg">
                      Waiting for opponent to join...
                    </div>
                  )}
                  <div className="flex gap-2 justify-center">
                    {game.status === 'waiting' || moveCount < 2 ? (
                      <Button 
                        onClick={() => setShowCancelConfirm(true)} 
                        variant="outline"
                        size="sm"
                        className="border-red-500 text-red-500"
                      >
                        Cancel
                      </Button>
                    ) : (
                      <>
                        <Button 
                          onClick={() => setShowResignConfirm(true)} 
                          variant="destructive"
                          size="sm"
                        >
                          Resign
                        </Button>
                        <Button 
                          onClick={handleOfferDraw} 
                          variant="outline"
                          size="sm"
                          className="border-chess-accent text-chess-accent"
                        >
                          Offer Draw
                        </Button>
                        <Button 
                          onClick={handleRequestTakeback}
                          variant="outline"
                          size="sm"
                          className="border-blue-500 text-blue-500"
                        >
                          Take Back
                        </Button>
                      </>
                    )}
                  </div>
                </>
              )}
              {isGameOver && (
                <div className="space-y-2">
                  <div className="text-white text-xl font-semibold">
                    {game.winner_id === user?.id ? "You Won! 🎉" : game.winner_id ? "Game Over" : "Draw"}
                  </div>
                  <Button onClick={handleRematchOffer} className="bg-chess-accent hover:bg-chess-accent/80">
                    Offer Rematch
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rematch Dialog */}
      {showRematchDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md mx-4 bg-chess-dark border-chess-brown">
            <h3 className="text-xl font-semibold mb-4 text-white">Rematch Offer</h3>
            <p className="mb-6 text-gray-300">Your opponent wants a rematch! Same stakes will be deducted.</p>
            <div className="flex gap-4">
              <Button onClick={() => handleRematchResponse(true)} className="flex-1 bg-chess-accent hover:bg-chess-accent/80 text-black">
                Accept
              </Button>
              <Button onClick={() => handleRematchResponse(false)} variant="outline" className="flex-1">
                Decline
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Draw Offer Dialog */}
      {showDrawDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md mx-4 bg-chess-dark border-chess-brown">
            <h3 className="text-xl font-semibold mb-4 text-white">Draw Offer</h3>
            <p className="mb-6 text-gray-300">Your opponent is offering a draw. Both players will get their stakes back (minus holo fee).</p>
            <div className="flex gap-4">
              <Button onClick={() => handleDrawResponse(true)} className="flex-1 bg-chess-accent hover:bg-chess-accent/80 text-black">
                Accept Draw
              </Button>
              <Button onClick={() => handleDrawResponse(false)} variant="outline" className="flex-1">
                Decline
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Resign Confirmation Dialog */}
      {showResignConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md mx-4 bg-chess-dark border-chess-brown">
            <h3 className="text-xl font-semibold mb-4 text-white">Resign Game?</h3>
            <p className="mb-6 text-gray-300">Are you sure you want to resign? Your opponent will win and receive all coins.</p>
            <div className="flex gap-4">
              <Button onClick={handleResign} variant="destructive" className="flex-1">
                Yes, Resign
              </Button>
              <Button onClick={() => setShowResignConfirm(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Takeback Request Dialog */}
      {showTakebackDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md mx-4 bg-chess-dark border-chess-brown">
            <h3 className="text-xl font-semibold mb-4 text-white">Takeback Request</h3>
            <p className="mb-6 text-gray-300">{takebackRequestFrom} wants to take back their last move.</p>
            <div className="flex gap-4">
              <Button onClick={() => handleTakebackResponse(true)} className="flex-1" style={{ backgroundColor: '#e2c044' }}>
                Accept
              </Button>
              <Button onClick={() => handleTakebackResponse(false)} variant="outline" className="flex-1">
                Decline
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md mx-4 bg-chess-dark border-chess-brown">
            <h3 className="text-xl font-semibold mb-4 text-white">Cancel Game?</h3>
            <p className="mb-6 text-gray-300">Are you sure you want to cancel? All coins including holo fees will be refunded to both players.</p>
            <div className="flex gap-4">
              <Button onClick={handleCancel} variant="outline" className="flex-1 border-red-500 text-red-500">
                Yes, Cancel
              </Button>
              <Button onClick={() => setShowCancelConfirm(false)} variant="outline" className="flex-1">
                Go Back
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Mobile/Tablet Layout - Full screen board */}
      <div className="lg:hidden flex flex-col min-h-screen justify-between">
        {/* Top Player Info - Opponent */}
        <div className="flex justify-between items-center px-4 py-2 bg-background">
          <div className="flex items-center gap-2">
            <div className="text-white font-semibold text-sm">
              {isPlayer1 ? player2Username || 'Waiting...' : player1Username} 
              {isPlayer1 ? ' (opponent)' : ' (opponent)'}
            </div>
            {game.status === 'active' && (
              <div className="text-xs font-semibold">
                {((isPlayer1 && moveCount % 2 === 0) || (!isPlayer1 && moveCount % 2 === 1))
                  ? <span className="text-chess-accent">YOUR TURN</span>
                  : <span className="text-[#e2c044]">OPPONENT'S TURN</span>}
              </div>
            )}
          </div>
          <div className="text-right">
            <div 
              className={`text-xl font-mono ${
                (isPlayer1 ? player2Time : player1Time) < 60 
                  ? 'text-[#e2c044] animate-pulse font-bold' 
                  : 'text-white'
              }`}
              style={(isPlayer1 ? player2Time : player1Time) < 60 ? { textShadow: '0 0 10px #e2c044' } : {}}
            >
              {isPlayer1 
                ? `${Math.floor(player2Time / 60)}:${(player2Time % 60).toString().padStart(2, '0')}`
                : `${Math.floor(player1Time / 60)}:${(player1Time % 60).toString().padStart(2, '0')}`
              }
            </div>
          </div>
        </div>

        {/* Game Board - Full Width */}
        <div className="flex-1 flex items-center justify-center w-full px-2">
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
                
                const pieceWorth = `${Math.round(game.stake_amount)}hc`;
                
                return (
                  <div 
                    className="w-[80%] h-[80%] rounded-full flex items-center justify-center relative"
                    style={{
                      backgroundColor: colors.outer,
                      boxShadow: '3px 3px 6px rgba(0,0,0,0.4)'
                    }}
                  >
                    <div 
                      className="w-[85%] h-[85%] rounded-full flex flex-col items-center justify-center"
                      style={{ backgroundColor: colors.inner }}
                    >
                      {piece.king && <span className="text-sm">👑</span>}
                      <span className="text-[9px] font-bold text-yellow-400">{pieceWorth}</span>
                    </div>
                  </div>
                );
              };

              const isHighlighted = highlightedMoves.includes(index);
              const isPlayer1 = user?.id === game?.player1_id;
              const currentPlayerNumber = isPlayer1 ? 1 : 2;
              const isMyTurn = (isPlayer1 && moveCount % 2 === 0) || (!isPlayer1 && moveCount % 2 === 1);
              const canMoveFromHere = legalMoves.has(index) && boardState[index]?.player === currentPlayerNumber && isMyTurn;

              return (
                <div
                  key={index}
                  onClick={() => handleSquareClick(index)}
                  className={`
                    relative flex items-center justify-center cursor-pointer transition-all
                    ${isLight ? 'bg-chess-light' : 'bg-chess-brown'}
                    ${canMoveFromHere && !isSelected ? 'shadow-[0_0_12px_rgba(255,237,74,0.8)] animate-pulse' : ''}
                    active:opacity-80
                  `}
                  style={{
                    ...(isHighlighted && {
                      backgroundColor: 'rgba(255, 237, 74, 0.4)',
                      boxShadow: '0 0 25px rgba(255, 237, 74, 0.7) inset'
                    })
                  }}
                >
                  {renderPiece()}
                  <div className="absolute bottom-0 right-0.5 text-[8px] opacity-50 font-mono">
                    {notation}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Player Info - You */}
        <div className="flex justify-between items-center px-4 py-2 bg-background">
          <div className="flex items-center gap-2">
            <div className="text-white font-semibold text-sm">
              {isPlayer1 ? player1Username : player2Username || 'You'} (you)
            </div>
          </div>
          <div className="text-right">
            <div 
              className={`text-xl font-mono ${
                (isPlayer1 ? player1Time : player2Time) < 60 
                  ? 'text-[#e2c044] animate-pulse font-bold' 
                  : 'text-white'
              }`}
              style={(isPlayer1 ? player1Time : player2Time) < 60 ? { textShadow: '0 0 10px #e2c044' } : {}}
            >
              {isPlayer1 
                ? `${Math.floor(player1Time / 60)}:${(player1Time % 60).toString().padStart(2, '0')}`
                : `${Math.floor(player2Time / 60)}:${(player2Time % 60).toString().padStart(2, '0')}`
              }
            </div>
          </div>
        </div>

        {/* Stake Info for Mobile */}
        <div className="px-4 py-3 flex justify-around items-center text-sm">
          <div className="text-center">
            <div className="text-gray-400 mb-1">Total Stake</div>
            <div className="text-white font-semibold">{(game.stake_amount * 12).toFixed(1)} HC</div>
          </div>
          <div className="h-8 w-px bg-gray-700"></div>
          <div className="text-center">
            <div className="text-gray-400 mb-1">Per Piece</div>
            <div className="text-white font-semibold">{game.stake_amount.toFixed(1)} HC</div>
          </div>
        </div>

        {/* Action Buttons for Mobile */}
        {game.status === 'active' && (
          <div className="px-4 pb-4 pt-2">
            <div className="flex gap-2 justify-center">
              {moveCount < 2 ? (
                <Button 
                  onClick={() => setShowCancelConfirm(true)} 
                  variant="outline"
                  className="w-1/4 border-red-500 text-red-500"
                >
                  Cancel
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={() => setShowResignConfirm(true)} 
                    variant="destructive"
                    className="flex-1"
                  >
                    Resign
                  </Button>
                  <Button 
                    onClick={handleOfferDraw} 
                    variant="outline"
                    className="flex-1 border-chess-accent text-chess-accent"
                  >
                    Draw
                  </Button>
                  <Button 
                    onClick={handleRequestTakeback}
                    variant="outline"
                    className="flex-1 border-blue-500 text-blue-500"
                  >
                    Take Back
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Rematch Button for Mobile */}
        {isGameOver && (
          <div className="px-4 pb-4 text-center">
            <div className="text-white text-lg font-semibold mb-2">
              {game.winner_id === user?.id ? "You Won! 🎉" : game.winner_id ? "Game Over" : "Draw"}
            </div>
            <Button onClick={handleRematchOffer} className="w-full bg-chess-accent hover:bg-chess-accent/80">
              Offer Rematch
            </Button>
          </div>
        )}
      </div>

      {/* Game Chat - Only show if game is active or both players accepted rematch */}
      {game.player1_id && game.player2_id && user && game.status === 'active' && (
        <GameChat
          gameId={game.id}
          currentUserId={user.id}
          player1Id={game.player1_id}
          player2Id={game.player2_id}
          player1Username={player1Username}
          player2Username={player2Username}
        />
      )}
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
