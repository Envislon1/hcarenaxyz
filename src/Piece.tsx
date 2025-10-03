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
    const color = player === 1 ? ['rgb(183, 28, 28)','rgb(229, 57, 53)'] : ['rgb(33, 33, 33)','rgb(66, 66, 66)'];
    const iconSize = `${size/21}px`
    
    let outerStyle : React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '80%',
        height: '80%',
        borderRadius: '100px',
        backgroundColor: color[0],
        boxShadow: '3px 3px 3px 1px #424242'
    }

    const innerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width:'79%',
        height:'79%',
        borderRadius: '100px',
        backgroundColor: color[1]
    }

    const kingStyle: React.CSSProperties = {
        color: color[0],
        fontSize: iconSize
    }

    const highlight = (canDrag.length > 0 && player === 1) || AISelected || isSelected;
    if(highlight) outerStyle = {...outerStyle, backgroundColor:'rgb(255, 238, 88)'}

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