import { useEffect, useRef } from 'react';
import { Chessground } from 'chessground';
import { Api } from 'chessground/api';
import { Config } from 'chessground/config';
import { Chess } from 'chess.js';
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';

interface ChessBoardProps {
  fen?: string;
  orientation?: 'white' | 'black';
  viewOnly?: boolean;
  onMove?: (orig: string, dest: string) => void;
  config?: Partial<Config>;
}

export const ChessBoard = ({ 
  fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  orientation = 'white',
  viewOnly = false,
  onMove,
  config = {}
}: ChessBoardProps) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const chessgroundRef = useRef<Api | null>(null);
  const chessRef = useRef<Chess>(new Chess());
  // One-time rebuild flags for opponent's first move
  const firstBlackTurnRebuiltRef = useRef(false);
  const lastTurnRef = useRef<'white' | 'black'>('white');

  useEffect(() => {
    if (!boardRef.current) return;

    // Initialize chess.js with current FEN
    try {
      chessRef.current = new Chess(fen);
    } catch (e) {
      console.error('Invalid FEN:', fen);
      chessRef.current = new Chess();
    }

    // Get valid moves for initial setup
    const initialDests = !viewOnly ? getValidMoves() : new Map();
    const turnColor = chessRef.current.turn() === 'w' ? 'white' : 'black';
    lastTurnRef.current = turnColor;

    console.log('ChessBoard initial setup:', {
      fen,
      turn: turnColor,
      viewOnly,
      validMovesCount: initialDests.size,
      sampleMoves: Array.from(initialDests.entries()).slice(0, 3)
    });

    const baseConfig: Config = {
      fen,
      orientation,
      viewOnly,
      movable: {
        free: false,
        color: viewOnly ? undefined : (((config as any)?.movable as any)?.color ?? turnColor),
        showDests: true,
        dests: initialDests,
        events: {
          after: (orig, dest) => {
            // Delegate to parent; parent validates with chess.js and updates FEN
            onMove?.(orig, dest);
          }
        }
      },
      draggable: {
        enabled: !viewOnly,
        showGhost: true
      }
    } as Config;

    // Deep-merge incoming config for movable/draggable so we don't lose events/dests
    const mergedMovable = { ...(baseConfig.movable as any), ...((config as any)?.movable || {}) };
    const mergedDraggable = { ...(baseConfig.draggable as any), ...((config as any)?.draggable || {}) };

    const chessgroundConfig: Config = {
      ...baseConfig,
      ...config,
      movable: mergedMovable,
      draggable: mergedDraggable,
    } as Config;

    chessgroundRef.current = Chessground(boardRef.current, chessgroundConfig);

    return () => {
      chessgroundRef.current?.destroy();
    };
  }, []);

  // Get valid moves for all pieces
  const getValidMoves = () => {
    const dests = new Map();
    const moves = chessRef.current.moves({ verbose: true });
    
    moves.forEach(move => {
      if (!dests.has(move.from)) {
        dests.set(move.from, []);
      }
      dests.get(move.from).push(move.to);
    });
    
    return dests;
  };

  // Update board when props change
  useEffect(() => {
    if (chessgroundRef.current) {
      try {
        // Update chess.js instance with new FEN
        chessRef.current = new Chess(fen);
        
        // Get whose turn it is from chess.js
        const turnColor = chessRef.current.turn() === 'w' ? 'white' : 'black';
        
        // Calculate legal moves
        const newDests = !viewOnly ? getValidMoves() : new Map();
        
        // Force a one-time rebuild on opponent's first move to ensure dragging enables
        if (
          orientation === 'black' &&
          lastTurnRef.current !== 'black' &&
          turnColor === 'black' &&
          !firstBlackTurnRebuiltRef.current
        ) {
          firstBlackTurnRebuiltRef.current = true;

          const initialDests = newDests;
          const baseConfig: Config = {
            fen,
            orientation,
            viewOnly,
            movable: {
              free: false,
              color: viewOnly ? undefined : ((config as any)?.movable?.color ?? turnColor),
              showDests: true,
              dests: initialDests,
              events: {
                after: (orig, dest) => {
                  onMove?.(orig, dest);
                }
              }
            },
            draggable: {
              enabled: !viewOnly,
              showGhost: true
            }
          } as Config;

          const mergedMovable = { ...(baseConfig.movable as any), ...((config as any)?.movable || {}) };
          const mergedDraggable = { ...(baseConfig.draggable as any), ...((config as any)?.draggable || {}) };

          const chessgroundConfig: Config = {
            ...baseConfig,
            ...config,
            movable: mergedMovable,
            draggable: mergedDraggable,
          } as Config;

          chessgroundRef.current.destroy();
          chessgroundRef.current = Chessground(boardRef.current!, chessgroundConfig);
          lastTurnRef.current = turnColor;
          return;
        }

        console.log('Updating chess board:', {
          fen,
          turn: turnColor,
          viewOnly,
          movesCount: newDests.size,
          moves: Array.from(newDests.entries())
        });
        
        chessgroundRef.current.set({
          fen,
          orientation,
          viewOnly,
          movable: {
            free: false,
            color: viewOnly ? undefined : ((config as any)?.movable?.color ?? turnColor),
            dests: newDests,
            showDests: true
          }
        });
        
        // Track latest turn color
        lastTurnRef.current = turnColor;
      } catch (e) {
        console.error('Invalid FEN:', fen, e);
      }
    }
  }, [fen, orientation, viewOnly]);

  return (
    <div 
      ref={boardRef} 
      className="w-full aspect-square"
      style={{ maxWidth: '100%' }}
    />
  );
};
