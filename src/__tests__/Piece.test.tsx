import React from 'react';
import Piece from '../Piece';
import {render, cleanup, queryAllByTestId} from '@testing-library/react';
import {DndProvider} from 'react-dnd';
import { TestBackend } from 'react-dnd-test-backend';

afterEach(cleanup);

const mockFunction = () => {
}
const renderPiece = (player:1|2, king:boolean, canDrag:number[], hasJump:boolean, AISelected:boolean, index:number) => {
    return render(<DndProvider backend={TestBackend}>
                    <Piece player={player} king={king} canDrag={canDrag} 
                        hasJump={hasJump} AISelected={AISelected} index={index} move={mockFunction} size={100}
                        selectPiece={mockFunction} isSelected={false} />
                  </DndProvider>)
};

test('should render player 1 piece', ()=>{
    const {getByTestId, queryByTestId} = renderPiece(1, false, [], false, false, 1);
    expect(getByTestId('piece-outer').style.background).toContain('radial-gradient');

    //should not have king icon
    expect(queryByTestId('piece-king')).toBeNull();
});

test('should render player 2 piece', ()=>{
    const {getByTestId} = renderPiece(2, false, [], false, false, 1)
    expect(getByTestId('piece-outer').style.background).toContain('radial-gradient');
});

test('should render active piece', () => {
    const {getByTestId} = renderPiece(1, false, [1,2,3], false, false, 2);
    expect(getByTestId('piece-outer').style.boxShadow).toContain('rgba(255, 238, 88');
});

test('should render king piece', () => {
    const {getByTestId} = renderPiece(1, true, [], false, false, 1);
    expect(getByTestId('piece-king')).toBeTruthy();
});
