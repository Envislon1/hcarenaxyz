import {useState} from 'react';
import {TileClass} from '../Tile';
import {PieceClass} from '../Piece';
import {updateBoard, indexToCoordinates, movePiece} from '../util/gameLogic';
import {getRandMove, showMove} from '../util/dumbAI';
import {v4 as uuid} from 'uuid';

export interface GameState{
    playerTurn: 1 | 2
    winner: 1 | 2 | false
    tiles: TileClass[]
    numPieceOne: number
    numPieceTwo: number
    jumping: number | null
    selectedPiece: number | null
}

export const initialState = () => {
    const tiles: TileClass[] = [];

    for(let i = 0; i < 64; i++){
        const [x,y] = indexToCoordinates(i);
        const piece = pieceExist(x,y);
        tiles.push({id: uuid(), 
                    index:i, 
                    black: (x + y) % 2 === 1, 
                    piece: piece, 
                    AIMoveTo:false
                   })
    }

    const state : GameState = {
                               playerTurn:1, 
                               winner: false, 
                               tiles: tiles,
                               numPieceOne: 12,
                               numPieceTwo: 12,
                               jumping: null,
                               selectedPiece: null
                              }

    return updateBoard(state);

    function pieceExist(x:number,y:number): PieceClass | null {
        const piece:PieceClass = {
                                  player: 1, 
                                  king: false, 
                                  canDrag:[], 
                                  hasJump:false,
                                  AISelected:false
                                 }

        if(y <= 2 && (x+y) % 2 === 1){
            return {...piece, player: 2};
        } 
        else if(y >= 5 && (x+y) % 2 === 1){
            return piece;
        }
        else {
            return null;
        }
    }
}

const useBoard = (init = initialState()):[GameState, Function, Function, Function, boolean] => {
    const [boardState, setBoardState] = useState(init);
    const [history, setHistory] = useState<GameState[]>([init]);

    //handle AI's turn
    const handleAI = (state:GameState) => {
        setTimeout(()=> {
            AIShowMove(state);
        }, 300);
    };

    //makes move for AI
    const AIMakeMove = (from:number, to: number, state:GameState) => {
        const newState = movePiece(from, to, state);
        newState.tiles[to].AIMoveTo = false;
        
        const piece = newState.tiles[to].piece
        if (piece) piece.AISelected = false;

        setBoardState(newState);
        if(newState.playerTurn === 2) handleAI(newState);
    };

    //update state to show AI's move
    const AIShowMove = (state:GameState) => {
        const [from, to] = getRandMove(state);
        if(from === -1 || to === -1) return;

        const newState = showMove(from, to, state);
        setBoardState(newState);
        setTimeout(()=>{
            AIMakeMove(from, to, newState);
        }, 500)
    };

    const move:Function = (from:number, to:number) => {
        const newState = movePiece(from, to, boardState);
        newState.selectedPiece = null;
        setBoardState(newState);
        setHistory([...history, newState]);

        if(newState.playerTurn === 2) handleAI(newState);
    };

    const selectPiece = (index: number | null) => {
        setBoardState({...boardState, selectedPiece: index});
    };

    const undoMove = () => {
        if (history.length > 1) {
            const newHistory = history.slice(0, -1);
            const previousState = newHistory[newHistory.length - 1];
            setHistory(newHistory);
            setBoardState(previousState);
        }
    };

    const canUndo = history.length > 1 && boardState.playerTurn === 1;

    return [boardState, move, selectPiece, undoMove, canUndo];
}

export default useBoard;