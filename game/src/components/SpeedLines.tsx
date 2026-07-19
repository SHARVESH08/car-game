import React, { useMemo } from 'react';

interface SpeedLineProps {
  count?: number;
  color?: string;
}

const SpeedLines: React.FC<SpeedLineProps> = ({ count = 18, color = '#e05561' }) => {
  const lines = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      width: `${80 + Math.random() * 200}px`,
      duration: `${1.2 + Math.random() * 2}s`,
      delay: `${Math.random() * 2}s`,
      opacity: 0.05 + Math.random() * 0.1,
      height: Math.random() > 0.7 ? '2px' : '1px',
    })),
    [count]
  );

  return (
    <div
      className="speed-lines"
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}
    >
      {lines.map(line => (
        <div
          key={line.id}
          style={{
            position: 'absolute',
            top: line.top,
            left: 0,
            width: line.width,
            height: line.height,
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            animation: `speedLine ${line.duration} linear ${line.delay} infinite`,
            opacity: line.opacity,
          }}
        />
      ))}
      <style>{`
        @keyframes speedLine {
          0%   { transform: translateX(-100%); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateX(110vw); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default SpeedLines;
