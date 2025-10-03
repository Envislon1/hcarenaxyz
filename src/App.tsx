import React,{useEffect} from 'react';
import Board from './Board';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';

const appStyle : React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: 'var(--app-height)',
  width: '100vw'
}

const App : React.FC = () => {
  useEffect(()=>{
    const appHeight = () => document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    window.addEventListener('resize', appHeight);
    appHeight();

    return () => window.removeEventListener('resize', appHeight);
  }, []);

  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const backend = isTouchDevice ? TouchBackend : HTML5Backend;

  return (
    <div style={appStyle}>
      <DndProvider backend={backend}>
        <Board />
      </DndProvider>
    </div>
  )
}

export default App;
