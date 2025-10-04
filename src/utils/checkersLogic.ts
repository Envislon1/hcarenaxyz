// Checkers game logic implementation based on src2/util/gameLogic.tsx

export interface PieceType {
  player: 1 | 2;
  king: boolean;
}

export interface GameState {
  tiles: (PieceType | null)[];
  playerTurn: 1 | 2;
  numPieceOne: number;
  numPieceTwo: number;
  jumping: number | null;
}

// Convert index to x,y coordinates
export const indexToCoordinates = (index: number): [number, number] => {
  const x = index % 8;
  const y = Math.floor(index / 8);
  return [x, y];
};

// Convert x,y coordinates to index
export const coordinatesToIndex = (x: number, y: number): number | undefined => {
  if (x < 0 || x > 7 || y < 0 || y > 7) return undefined;
  return x + y * 8;
};

// Get the mid point between two indices
export const getMidIndex = (fromIndex: number, toIndex: number): number => {
  return (fromIndex + toIndex) / 2;
};

// Check if index is within bounds
export const withinBounds = (index: number): boolean => {
  return index >= 0 && index < 64;
};

// Movement directions for different checker pieces
export const moveDirections = (player: 1 | 2, king: boolean): number[][] => {
  if (king) {
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  } else {
    return player === 1 ? [[-1, -1], [1, -1]] : [[1, 1], [-1, 1]];
  }
};

// Capture directions - all pieces can capture in all diagonal directions
export const captureDirections = (): number[][] => {
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]];
};

// Check if tile has a piece
export const isTileEmpty = (index: number, state: GameState): boolean => {
  return withinBounds(index) && !state.tiles[index];
};

// Check if tile has an enemy piece
export const hasEnemyPiece = (index: number, player: number, state: GameState): boolean => {
  if (!withinBounds(index)) return false;
  const piece = state.tiles[index];
  return piece !== null && piece.player !== player;
};

// Check if a piece can jump over the piece at the following index
export const canJump = (index: number, player: number, direction: number[], state: GameState): boolean => {
  const [x, y] = indexToCoordinates(index);
  const newIndex = coordinatesToIndex(x + direction[0], y + direction[1]);
  
  if (newIndex === undefined) return false;
  return hasEnemyPiece(index, player, state) && isTileEmpty(newIndex, state);
};

// Helper to find all multi-jump paths recursively
const findMultiJumpPaths = (
  index: number,
  player: number,
  king: boolean,
  state: GameState,
  visited: Set<number> = new Set()
): number[][] => {
  const paths: number[][] = [];
  const [x, y] = indexToCoordinates(index);
  const captureDir = captureDirections();
  
  for (let i = 0; i < captureDir.length; i++) {
    const [adjX, adjY] = captureDir[i];
    const enemyIndex = coordinatesToIndex(x + adjX, y + adjY);
    
    if (enemyIndex === undefined) continue;
    
    if (canJump(enemyIndex, player, captureDir[i], state) && !visited.has(enemyIndex)) {
      const jumpIndex = coordinatesToIndex(x + adjX * 2, y + adjY * 2);
      if (jumpIndex !== undefined) {
        // Create temporary state with this jump
        const tempState: GameState = JSON.parse(JSON.stringify(state));
        tempState.tiles[jumpIndex] = tempState.tiles[index];
        tempState.tiles[index] = null;
        tempState.tiles[enemyIndex] = null;
        
        const newVisited = new Set(visited);
        newVisited.add(enemyIndex);
        
        // Recursively find more jumps
        const furtherPaths = findMultiJumpPaths(jumpIndex, player, king, tempState, newVisited);
        
        if (furtherPaths.length > 0) {
          furtherPaths.forEach((path) => {
            paths.push([jumpIndex, ...path]);
          });
        } else {
          paths.push([jumpIndex]);
        }
      }
    }
  }
  
  return paths;
};

// Check if piece can move and return legal moves
export const canMove = (index: number, state: GameState): { moves: number[]; jumps: number[] } => {
  const piece = state.tiles[index];
  if (!piece) return { moves: [], jumps: [] };
  
  const player = piece.player;
  const king = piece.king;
  const [x, y] = indexToCoordinates(index);
  
  let moves: number[] = [];
  let jumps: number[] = [];
  
  // Find all multi-jump paths
  const jumpPaths = findMultiJumpPaths(index, player, king, state);
  
  // Get all unique end positions from jump paths
  const jumpDestinations = new Set<number>();
  jumpPaths.forEach((path) => {
    if (path.length > 0) {
      jumpDestinations.add(path[path.length - 1]);
    }
  });
  jumps = Array.from(jumpDestinations);
  
  if (king) {
    // Kings can move multiple squares like a bishop
    const directions = moveDirections(player, king);
    
    for (let i = 0; i < directions.length; i++) {
      const [adjX, adjY] = directions[i];
      let distance = 1;
      let blocked = false;
      
      while (!blocked && distance < 8) {
        const newIndex = coordinatesToIndex(x + adjX * distance, y + adjY * distance);
        
        if (newIndex === undefined) break;
        
        if (isTileEmpty(newIndex, state)) {
          moves.push(newIndex);
          distance++;
        } else {
          blocked = true;
        }
      }
    }
  } else {
    // Regular pieces - move forward only
    const moveDir = moveDirections(player, king);
    
    for (let i = 0; i < moveDir.length; i++) {
      const [adjX, adjY] = moveDir[i];
      const newIndex = coordinatesToIndex(x + adjX, y + adjY);
      
      if (newIndex === undefined) continue;
      
      if (isTileEmpty(newIndex, state)) {
        moves.push(newIndex);
      }
    }
  }
  
  return { moves, jumps };
};

// Get all legal moves for the current player
export const getLegalMovesForPlayer = (state: GameState): Map<number, number[]> => {
  const legalMoves = new Map<number, number[]>();
  const hasAnyJumps = new Map<number, number[]>();
  
  for (let i = 0; i < state.tiles.length; i++) {
    const piece = state.tiles[i];
    if (piece && piece.player === state.playerTurn) {
      const { moves, jumps } = canMove(i, state);
      
      if (jumps.length > 0) {
        hasAnyJumps.set(i, jumps);
      } else if (moves.length > 0) {
        legalMoves.set(i, moves);
      }
    }
  }
  
  // If any piece can jump, only jumps are legal (forced capture rule)
  return hasAnyJumps.size > 0 ? hasAnyJumps : legalMoves;
};

// Find path from start to destination through jumps
const findPathToDestination = (
  fromIndex: number,
  toIndex: number,
  player: number,
  king: boolean,
  state: GameState,
  currentPath: number[] = [],
  visited: Set<number> = new Set()
): number[] | null => {
  if (fromIndex === toIndex) return currentPath;
  
  const [x, y] = indexToCoordinates(fromIndex);
  const captureDir = captureDirections();
  
  for (let i = 0; i < captureDir.length; i++) {
    const [adjX, adjY] = captureDir[i];
    const enemyIndex = coordinatesToIndex(x + adjX, y + adjY);
    
    if (enemyIndex === undefined) continue;
    
    if (canJump(enemyIndex, player, captureDir[i], state) && !visited.has(enemyIndex)) {
      const jumpIndex = coordinatesToIndex(x + adjX * 2, y + adjY * 2);
      if (jumpIndex !== undefined) {
        const tempState: GameState = JSON.parse(JSON.stringify(state));
        tempState.tiles[jumpIndex] = tempState.tiles[fromIndex];
        tempState.tiles[fromIndex] = null;
        tempState.tiles[enemyIndex] = null;
        
        const newVisited = new Set(visited);
        newVisited.add(enemyIndex);
        
        const result = findPathToDestination(
          jumpIndex,
          toIndex,
          player,
          king,
          tempState,
          [...currentPath, jumpIndex],
          newVisited
        );
        
        if (result) return result;
      }
    }
  }
  
  return null;
};

// Check if piece should be promoted to king
export const checkKing = (index: number, piece: PieceType | null): PieceType | null => {
  if (!piece) return null;
  
  if (piece.player === 1 && index < 8) {
    return { ...piece, king: true };
  }
  
  if (piece.player === 2 && index >= 56) {
    return { ...piece, king: true };
  }
  
  return piece;
};

// Execute a move and return the new board state
export const movePiece = (
  fromIndex: number,
  toIndex: number,
  state: GameState
): { newState: GameState; capturedPieces: number[] } | null => {
  const piece = state.tiles[fromIndex];
  if (!piece) return null;
  
  const { moves, jumps } = canMove(fromIndex, state);
  const allLegalMoves = [...moves, ...jumps];
  
  if (!allLegalMoves.includes(toIndex)) return null;
  
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const capturedPieces: number[] = [];
  
  const isJump = jumps.includes(toIndex);
  
  if (isJump) {
    // Execute multi-jump path
    const path = findPathToDestination(fromIndex, toIndex, piece.player, piece.king, state);
    
    if (path && path.length > 0) {
      let currentIndex = fromIndex;
      
      // Execute each jump in the path
      for (let i = 0; i < path.length; i++) {
        const nextIndex = path[i];
        const midIndex = getMidIndex(currentIndex, nextIndex);
        
        // Move piece
        newState.tiles[nextIndex] = newState.tiles[currentIndex];
        newState.tiles[currentIndex] = null;
        
        // Capture enemy piece
        if (midIndex !== undefined && Number.isInteger(midIndex)) {
          const capturedPiece = newState.tiles[midIndex];
          if (capturedPiece) {
            if (capturedPiece.player === 1) {
              newState.numPieceOne--;
            } else {
              newState.numPieceTwo--;
            }
            newState.tiles[midIndex] = null;
            capturedPieces.push(midIndex);
          }
        }
        
        currentIndex = nextIndex;
      }
      
      newState.tiles[toIndex] = checkKing(toIndex, newState.tiles[toIndex]);
      newState.jumping = null;
    }
  } else {
    // Regular move
    newState.tiles[toIndex] = newState.tiles[fromIndex];
    newState.tiles[fromIndex] = null;
    newState.tiles[toIndex] = checkKing(toIndex, newState.tiles[toIndex]);
  }
  
  // Switch player turn
  newState.playerTurn = newState.playerTurn === 1 ? 2 : 1;
  
  return { newState, capturedPieces };
};

// Check if game is over
export const checkGameOver = (state: GameState): { isOver: boolean; winner: 1 | 2 | null } => {
  // Check if either player has no pieces left
  if (state.numPieceOne === 0) {
    return { isOver: true, winner: 2 };
  }
  if (state.numPieceTwo === 0) {
    return { isOver: true, winner: 1 };
  }
  
  // Check if current player has any legal moves
  const legalMoves = getLegalMovesForPlayer(state);
  if (legalMoves.size === 0) {
    return { isOver: true, winner: state.playerTurn === 1 ? 2 : 1 };
  }
  
  return { isOver: false, winner: null };
};
