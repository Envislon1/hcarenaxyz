import {GameState} from '../hooks/useBoard';
import {TileClass} from '../Tile';

// convert index to x,y coordinates
export const indexToCoordinates = (index: number) => {
    const x = index % 8;
    const y = Math.floor(index/8);
    return [x, y];
}

// convert x,y coordinates to index
export const coordinatesToIndex =  (x: number, y: number) => {
    if(x < 0 || x > 7 || y < 0 || y > 7) return undefined;
    return x + (y*8);
}

// get the mid point between two indices
export const getMidIndex = (fromIndex: number, toIndex:number) => {
    const mid = (fromIndex + toIndex) / 2;
    return mid;
}

// check if index is within bounds
export const withinBounds = (index:number) => {
    if(index >= 0 && index < 64){
        return true;
    } else {
        return false;
    }
};

// movement directions for different checker pieces
export const moveDirections = (player:1|2, king:boolean) => {
    if(king){
        return [[-1,-1],[1,-1],[1,1],[-1,1]];
    } else {
        return player === 1 ? [[-1,-1],[1,-1]] : [[1,1],[-1,1]];
    }
};

// capture directions - all pieces can capture in all diagonal directions
export const captureDirections = () => {
    return [[-1,-1],[1,-1],[1,1],[-1,1]];
};

// check if tile has a piece
export const isTileEmpty = (index:number, state:GameState) => {
    return withinBounds(index) && state.tiles[index].piece ? false : true;
};

// check if tile has an enemy piece
export const hasEnemyPiece = (index:number, player:number, state: GameState) => {
    if(!withinBounds(index)) return false;

    const piece = state.tiles[index].piece;
    return piece && piece.player !== player;
};

// check if a piece can jump over the piece at the following index
export const canJump = (index:number, player:number, direction:number[], state: GameState) => {
    const [x,y] = indexToCoordinates(index);
    const newIndex = coordinatesToIndex(x + direction[0], y + direction[1]);

    if(newIndex === undefined) return false;
    return hasEnemyPiece(index,player,state) && isTileEmpty(newIndex,state);
}

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
        const adjX = captureDir[i][0], adjY = captureDir[i][1];
        
        if (king) {
            // Kings can jump multiple squares
            let distance = 1;
            let enemyFound = false;
            let enemyIndex = -1;
            
            while (distance < 8) {
                const checkIndex = coordinatesToIndex(x + (adjX * distance), y + (adjY * distance));
                if (checkIndex === undefined) break;
                
                if (hasEnemyPiece(checkIndex, player, state) && !visited.has(checkIndex) && !enemyFound) {
                    enemyFound = true;
                    enemyIndex = checkIndex;
                    distance++;
                    continue;
                }
                
                if (enemyFound && isTileEmpty(checkIndex, state)) {
                    // Create temporary state with this jump
                    const tempState = JSON.parse(JSON.stringify(state));
                    tempState.tiles[checkIndex].piece = tempState.tiles[index].piece;
                    tempState.tiles[index].piece = null;
                    tempState.tiles[enemyIndex].piece = null;
                    
                    const newVisited = new Set(visited);
                    newVisited.add(enemyIndex);
                    
                    // Recursively find more jumps from this position
                    const furtherPaths = findMultiJumpPaths(checkIndex, player, king, tempState, newVisited);
                    
                    if (furtherPaths.length > 0) {
                        furtherPaths.forEach(path => {
                            paths.push([checkIndex, ...path]);
                        });
                    } else {
                        paths.push([checkIndex]);
                    }
                }
                
                if (enemyFound) break;
                if (!isTileEmpty(checkIndex, state)) break;
                distance++;
            }
        } else {
            // Regular pieces - single jump in each direction
            const enemyIndex = coordinatesToIndex(x + adjX, y + adjY);
            if (enemyIndex === undefined) continue;
            
            if (canJump(enemyIndex, player, captureDir[i], state) && !visited.has(enemyIndex)) {
                const jumpIndex = coordinatesToIndex(x + (adjX * 2), y + (adjY * 2));
                if (jumpIndex !== undefined) {
                    // Create temporary state with this jump
                    const tempState = JSON.parse(JSON.stringify(state));
                    tempState.tiles[jumpIndex].piece = tempState.tiles[index].piece;
                    tempState.tiles[index].piece = null;
                    tempState.tiles[enemyIndex].piece = null;
                    
                    const newVisited = new Set(visited);
                    newVisited.add(enemyIndex);
                    
                    // Recursively find more jumps
                    const furtherPaths = findMultiJumpPaths(jumpIndex, player, king, tempState, newVisited);
                    
                    if (furtherPaths.length > 0) {
                        furtherPaths.forEach(path => {
                            paths.push([jumpIndex, ...path]);
                        });
                    } else {
                        paths.push([jumpIndex]);
                    }
                }
            }
        }
    }
    
    return paths;
};

// check if piece can move
export const canMove = (index:number, state:GameState) => {
    const piece = state.tiles[index].piece;
    // if no piece return early
    if(!piece) return [[],[]];

    const player = piece.player;
    const king = piece.king;

    const [x,y] = indexToCoordinates(index);

    let canDrag:number[] = [];
    let hasJump:number[] = [];

    // Find all multi-jump paths
    const jumpPaths = findMultiJumpPaths(index, player, king, state);
    
    // Get all unique end positions from jump paths
    const jumpDestinations = new Set<number>();
    jumpPaths.forEach(path => {
        if (path.length > 0) {
            jumpDestinations.add(path[path.length - 1]);
        }
    });
    hasJump = Array.from(jumpDestinations);

    if(king) {
        // Kings can move multiple squares like a bishop
        const directions = moveDirections(player, king);
        
        for(let i = 0; i < directions.length; i++){
            const adjX = directions[i][0], adjY = directions[i][1];
            let distance = 1;
            let blocked = false;
            
            // Check multiple squares in this direction
            while(!blocked && distance < 8) {
                const newIndex = coordinatesToIndex(x + (adjX * distance), y + (adjY * distance));
                
                if(newIndex === undefined) break;
                
                // If empty, king can move here
                if(isTileEmpty(newIndex, state)) {
                    canDrag.push(newIndex);
                    distance++;
                } 
                // If any piece, can't move further
                else {
                    blocked = true;
                }
            }
        }
    } else {
        // Regular pieces - move forward only
        const moveDir = moveDirections(player, king);
        
        // Check forward moves
        for(let i = 0; i < moveDir.length; i++){
            const adjX = moveDir[i][0], adjY = moveDir[i][1];
            const newIndex = coordinatesToIndex(x + adjX, y + adjY);
            
            if(newIndex === undefined) continue;
            
            if(isTileEmpty(newIndex, state)){
                canDrag.push(newIndex);
            }
        }
    }

    return [canDrag, hasJump];
};

export const handleJumping = (state:GameState) => {
    const newTilesState:TileClass[] = state.tiles.map(tile => {
        if(tile.index === state.jumping && tile.piece){
            const [ ,hasJump] = canMove(tile.index, state);
            const newPieceState = {...tile.piece, canDrag: hasJump};
            return {...tile, piece: newPieceState};
        } 
        else if (tile.piece) {
            const newPieceState = {...tile.piece, canDrag: []}
            return {...tile, piece: newPieceState};
        }
        else {
            return tile;
        }
    })

    return {...state, tiles:newTilesState};
}

export const handleMovement = (state:GameState):GameState => {
    const dragIndex = {};
    const jumpIndex = {};

    const tiles = state.tiles;
    const playerTurn = state.playerTurn;

    tiles.forEach( (tile) => {
        if(tile.piece && tile.piece.player === playerTurn){
            const [canDrag, hasJump] = canMove(tile.index, state);
            if(canDrag.length > 0) dragIndex[tile.index] = canDrag;
            if(hasJump.length > 0) jumpIndex[tile.index] = hasJump;
        }
    });

    const hasJump = Object.keys(jumpIndex).length > 0; 
    const canDragIndex = hasJump ? jumpIndex : dragIndex;

    const newTileState:TileClass[] = tiles.map( (tile,index) => {
        if(tile.piece){
            const newDrag = canDragIndex[index] ? canDragIndex[index] : [];
            const newPieceState = {...tile.piece, canDrag: newDrag, hasJump: hasJump}
            
            return {...tile, piece: newPieceState}
        } else {
            return tile;
        } 
    });

    return {...state, tiles:newTileState};
};

export const updateBoard = (state:GameState):GameState => {
    const newState = state.jumping !== null ? handleJumping(state) : handleMovement(state);
    return newState;
};

// Find the path from start to destination through multi-jumps
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
        const adjX = captureDir[i][0], adjY = captureDir[i][1];
        
        if (king) {
            let distance = 1;
            let enemyFound = false;
            let enemyIndex = -1;
            
            while (distance < 8) {
                const checkIndex = coordinatesToIndex(x + (adjX * distance), y + (adjY * distance));
                if (checkIndex === undefined) break;
                
                if (hasEnemyPiece(checkIndex, player, state) && !visited.has(checkIndex) && !enemyFound) {
                    enemyFound = true;
                    enemyIndex = checkIndex;
                    distance++;
                    continue;
                }
                
                if (enemyFound && isTileEmpty(checkIndex, state)) {
                    const tempState = JSON.parse(JSON.stringify(state));
                    tempState.tiles[checkIndex].piece = tempState.tiles[fromIndex].piece;
                    tempState.tiles[fromIndex].piece = null;
                    tempState.tiles[enemyIndex].piece = null;
                    
                    const newVisited = new Set(visited);
                    newVisited.add(enemyIndex);
                    
                    const result = findPathToDestination(
                        checkIndex, 
                        toIndex, 
                        player, 
                        king, 
                        tempState, 
                        [...currentPath, checkIndex],
                        newVisited
                    );
                    
                    if (result) return result;
                }
                
                if (enemyFound) break;
                if (!isTileEmpty(checkIndex, state)) break;
                distance++;
            }
        } else {
            const enemyIndex = coordinatesToIndex(x + adjX, y + adjY);
            if (enemyIndex === undefined) continue;
            
            if (canJump(enemyIndex, player, captureDir[i], state) && !visited.has(enemyIndex)) {
                const jumpIndex = coordinatesToIndex(x + (adjX * 2), y + (adjY * 2));
                if (jumpIndex !== undefined) {
                    const tempState = JSON.parse(JSON.stringify(state));
                    tempState.tiles[jumpIndex].piece = tempState.tiles[fromIndex].piece;
                    tempState.tiles[fromIndex].piece = null;
                    tempState.tiles[enemyIndex].piece = null;
                    
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
    }
    
    return null;
};

export const movePiece = (fromIndex:number, toIndex:number, state:GameState):GameState => {
    const canDrag = state.tiles[fromIndex].piece?.canDrag;
    const hasJump = state.tiles[fromIndex].piece?.hasJump;
    const piece = state.tiles[fromIndex].piece;

    if(canDrag && canDrag.includes(toIndex) && piece){
        let newBoardState:GameState = {...state};
        
        if(hasJump){
            // Execute multi-jump path
            const path = findPathToDestination(fromIndex, toIndex, piece.player, piece.king, state);
            
            if (path && path.length > 0) {
                let currentIndex = fromIndex;
                
                // Execute each jump in the path
                for (let i = 0; i < path.length; i++) {
                    const nextIndex = path[i];
                    const midIndex = getMidIndex(currentIndex, nextIndex);
                    
                    // Move piece
                    let temp = newBoardState.tiles[nextIndex].piece;
                    newBoardState.tiles[nextIndex].piece = newBoardState.tiles[currentIndex].piece;
                    newBoardState.tiles[currentIndex].piece = temp;
                    
                    // Capture enemy piece
                    if (midIndex !== undefined && Number.isInteger(midIndex)) {
                        const capturedPiece = newBoardState.tiles[midIndex].piece;
                        if (capturedPiece) {
                            if (capturedPiece.player === 1) {
                                newBoardState.numPieceOne--;
                            } else {
                                newBoardState.numPieceTwo--;
                            }
                            newBoardState.tiles[midIndex].piece = null;
                        }
                    }
                    
                    currentIndex = nextIndex;
                }
                
                checkKing(toIndex, newBoardState);
                newBoardState.jumping = null;
            }
        } else {
            // Regular move
            let temp = newBoardState.tiles[toIndex].piece;
            newBoardState.tiles[toIndex].piece = newBoardState.tiles[fromIndex].piece;
            newBoardState.tiles[fromIndex].piece = temp;
            checkKing(toIndex, newBoardState);
        }

        newBoardState.playerTurn = newBoardState.playerTurn === 1 ? 2 : 1;
        return updateBoard(newBoardState);
    }

    return updateBoard(state);
};

export const handleCapture = (fromIndex:number, toIndex:number, state:GameState) => {
    const mid = getMidIndex(fromIndex, toIndex);

    if(!mid) return;

    const piece = state.tiles[mid].piece;

    if(!piece) return;

    if(piece.player === 1){
        state.numPieceOne--;
    } else {
        state.numPieceTwo--;
    }

    state.tiles[mid].piece = null;
};

export const checkKing = (index:number, state:GameState) => {
    const piece = state.tiles[index].piece;

    if(!piece) return;

    if(piece.player === 1 && index < 8){
        piece.king = true;
    }

    if(piece.player === 2 && index >= 56){
        piece.king = true;
    }
};