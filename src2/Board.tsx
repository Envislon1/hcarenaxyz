import React, {useEffect, useRef, useState} from 'react';
import Tile from './Tile';
import useBoard from './hooks/useBoard';

const boardStyle : React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    border: '8px solid #000000',
    boxSizing: 'border-box'
}

const Board: React.FC = () => {
    const boardRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState(0);

    //logic to keep 1:1 aspect ratio of board
    useEffect(()=>{
        const resizeBoard = () => {
            const height = window.innerHeight;
            const width = window.innerWidth;
            const min = Math.min(height,width);
            const side = `${min}px`;

            if(boardRef && boardRef.current){
                boardRef.current.style.setProperty('height', side);
                boardRef.current.style.setProperty('width', side);
            }
            setSize(min);
        }

        resizeBoard();
        window.addEventListener('resize', resizeBoard);

        return () => window.removeEventListener('resize', resizeBoard);
    }, []);

    const [boardState, move, selectPiece, undoMove, canUndo, restartGame] = useBoard();

    const selectedPieceCanDrag = boardState.selectedPiece !== null && 
        boardState.tiles[boardState.selectedPiece]?.piece?.canDrag || [];

    const buttonContainerStyle: React.CSSProperties = {
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
    };

    const restartButtonStyle: React.CSSProperties = {
        padding: '12px 24px',
        backgroundColor: '#2196F3',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.3s ease'
    };

    const takeBackButtonStyle: React.CSSProperties = {
        padding: '12px 24px',
        backgroundColor: canUndo ? '#4CAF50' : '#cccccc',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: canUndo ? 'pointer' : 'not-allowed',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.3s ease'
    };

    return(
        <>
            <div style={buttonContainerStyle}>
                <button 
                    style={restartButtonStyle}
                    onClick={() => restartGame()}
                >
                    Restart
                </button>
                <button 
                    style={takeBackButtonStyle}
                    onClick={() => undoMove()}
                    disabled={!canUndo}
                >
                    Take Back
                </button>
            </div>
            <div data-testid='board' ref={boardRef} style={boardStyle}>
                {boardState.tiles.map( tile  => <Tile key={tile.id} index={tile.index} black={tile.black} move={move}
                                                        AIMoveTo={tile.AIMoveTo} piece={tile.piece} size={size} 
                                                        selectPiece={selectPiece} selectedPiece={boardState.selectedPiece}
                                                        selectedPieceCanDrag={selectedPieceCanDrag} />)}
            </div>
        </>
    )
};

export default Board;
