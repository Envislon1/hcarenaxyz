import React from 'react';
import Piece from './Piece';
import {PieceClass} from './Piece';
import {ItemTypes} from './Constants';
import {useDrop} from 'react-dnd'

export interface TileClass {
    id?: string 
    index: number
    black : boolean
    piece: PieceClass | null
    AIMoveTo: boolean
}

interface TileProps extends TileClass {
    move: Function
    size: number
    selectPiece: Function
    selectedPiece: number | null
    selectedPieceCanDrag: number[]
}

const Tile: React.FC<TileProps> = ({index, black, piece, AIMoveTo, move, size, selectPiece, selectedPiece, selectedPieceCanDrag}) => {
    //drag and drop logic
    const [{canDrop},drop] = useDrop(() => ({
        accept: ItemTypes.PIECE,
        drop: () => ({toIndex: index}),
        canDrop: (item: { canDrag: number[] }) => {
            return item.canDrag.includes(index)
        },
        collect: monitor => ({
            canDrop: !!monitor.canDrop()
        })
    }), [index])

    // Check if this tile is a legal move for selected piece
    const isSelectedLegal = selectedPiece !== null && 
        Array.isArray(selectedPieceCanDrag) && 
        selectedPieceCanDrag.includes(index);

    // Handle tile click
    const handleTileClick = () => {
        if (isSelectedLegal) {
            move(selectedPiece, index);
        }
    };

    //styling
    const tileColor = black ? '#000000' : '#ffffff';
    const highlightColor = '#5c6bc0';
    const isLegalMove = canDrop || AIMoveTo || isSelectedLegal;
    const statusColor = isLegalMove ? highlightColor : tileColor;
    const TileStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '12.5%',
        height: '12.5%',
        backgroundColor: statusColor
    }

    return (
        <div data-testid='tile' style={TileStyle} ref={drop} onClick={handleTileClick}>
            {piece ? <Piece player={piece.player} canDrag={piece.canDrag} hasJump={piece.hasJump}
                        king={piece.king} AISelected={piece.AISelected} index={index} move={move} size={size} 
                        selectPiece={selectPiece} isSelected={selectedPiece === index} /> : ''}
        </div>
    )
};

export default Tile;
