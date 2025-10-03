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
        ? 'radial-gradient(circle at 35% 35%, #ff5252, #f44336, #e53935)'
        : 'radial-gradient(circle at 35% 35%, #c0c0c0, #a8a8a8, #909090)';
    
    const iconSize = `${size/21}px`
    
    let outerStyle : React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '80%',
        height: '80%',
        borderRadius: '50%',
        background: gradient,
        boxShadow: 'inset 0 -10px 20px rgba(0, 0, 0, 0.8), inset 0 6px 18px rgba(255, 255, 255, 0.5), 0 4px 8px rgba(0, 0, 0, 0.3)'
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
    if(highlight) outerStyle = {...outerStyle, boxShadow: 'inset 0 -10px 20px rgba(0, 0, 0, 0.8), inset 0 6px 18px rgba(255, 255, 255, 0.5), 0 0 15px 3px rgba(255, 255, 255, 0.8)'}

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