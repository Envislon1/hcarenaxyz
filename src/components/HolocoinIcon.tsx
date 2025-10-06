import React from 'react';

interface HolocoinIconProps {
  size?: number;
  className?: string;
}

export const HolocoinIcon: React.FC<HolocoinIconProps> = ({ size = 32, className = '' }) => {
  return (
    <div 
      className={`rounded-full flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: 'rgb(255, 255, 255)',
        boxShadow: '2px 2px 4px rgba(0,0,0,0.3)'
      }}
    >
      <div 
        className="rounded-full flex items-center justify-center"
        style={{
          width: size * 0.85,
          height: size * 0.85,
          backgroundColor: 'rgb(66, 66, 66)'
        }}
      >
        <span 
          className="font-bold text-chess-accent"
          style={{ fontSize: size * 0.35 }}
        >
          Hc
        </span>
      </div>
    </div>
  );
};
