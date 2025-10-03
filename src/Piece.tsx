import React from 'react';
import {ItemTypes} from './Constants';
import {useDrag} from 'react-dnd';

export interface PieceClass{
    player: 1 | 2
    king: boolean
    canDrag: number[]
    hasJump: boolean
    AISelected: boolean
}

interface PieceProps extends PieceClass{
    index: number
    move: Function
    size: number
    selectPiece: Function
    isSelected: boolean
}

const Piece: React.FC<PieceProps> = ({player, king, canDrag, hasJump, AISelected, index, move, size, selectPiece, isSelected}) => {

    //styling
    const gradient = player === 1 
        ? 'radial-gradient(circle at 30% 30%, #ff6b6b, #f44336, #d32f2f, #b71c1c)'
        : 'radial-gradient(circle at 30% 30%, #d4d4d4, #a8a8a8, #7a7a7a, #5e5e5e)';
    
    const iconSize = `${size/21}px`
    
    let outerStyle : React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '80%',
        height: '80%',
        borderRadius: '50%',
        background: gradient,
        boxShadow: 'inset 0 -15px 35px rgba(0, 0, 0, 0.9), inset 0 8px 25px rgba(255, 255, 255, 0.6), inset 0 0 40px rgba(0, 0, 0, 0.4), 0 4px 8px rgba(0, 0, 0, 0.3)'
    }

    const innerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width:'100%',
        height:'100%',
        borderRadius: '50%'
    }

    const kingStyle: React.CSSProperties = {
        color: player === 1 ? '#c62828' : '#4a4a4a',
        fontSize: iconSize
    }

    const highlight = (canDrag.length > 0 && player === 1) || AISelected || isSelected;
    if(highlight) outerStyle = {...outerStyle, boxShadow: 'inset 0 -15px 35px rgba(0, 0, 0, 0.9), inset 0 8px 25px rgba(255, 255, 255, 0.6), inset 0 0 40px rgba(0, 0, 0, 0.4), 0 0 15px 3px rgba(255, 255, 255, 0.8)'}

    // Handle piece click
    const handlePieceClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (player === 1 && canDrag.length > 0) {
            selectPiece(isSelected ? null : index);
        }
    };

    //drag and drop logic
    const canDragPiece = canDrag.length > 0 && player === 1;
    
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.PIECE,
        item: { canDrag: canDrag },
        canDrag: () => canDragPiece,
        end: (item, monitor) => {
            const dropResult = monitor.getDropResult<{ toIndex: number }>();
            if(item && dropResult){
                move(index, dropResult.toIndex);
            }
        },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging()
        })
    }), [canDrag, canDragPiece, index, move]);

    
    return (
        <div 
            data-testid='piece-outer' 
            style={{...outerStyle, opacity: isDragging ? 0.5 : 1, cursor: canDragPiece ? 'grab' : 'default'}} 
            ref={canDragPiece ? drag : null}
            onClick={handlePieceClick}
        >
            <div data-testid='piece-inner' style={innerStyle}>
                {king ? <i data-testid='piece-king' className="fas fa-crown" style={kingStyle}></i> : ''}
            </div>
        </div>
    )
};

export default Piece;