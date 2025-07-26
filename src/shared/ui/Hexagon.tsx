import React from 'react';

interface HexagonProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean;
  children: React.ReactNode;
}

const clipHexagonStyle = {
  clipPath: 'polygon(25% 5.77%, 75% 5.77%, 100% 50%, 75% 94.23%, 25% 94.23%, 0% 50%)',
};

const shadowNeonStyle = {
  boxShadow:
    '0 0 8px #22d3ee, 0 0 16px #22d3ee, 0 0 24px #22d3ee, 0 0 32px #22d3ee',
};

const Hexagon: React.FC<HexagonProps> = ({ active = false, children, className = '', ...rest }) => {
  const baseClasses = [
    'relative',
    'w-24',
    'h-28',
    'cursor-pointer',
    'rounded-lg',
    'flex',
    'items-center',
    'justify-center',
    'transition-all',
    'duration-300',
  ];

  if (active) {
    baseClasses.push('bg-cyan-600/30', 'border-cyan-400', 'border-2');
  } else {
    baseClasses.push('bg-gray-800', 'border', 'border-gray-700');
  }

  if (className) {
    baseClasses.push(className);
  }

  return (
    <div
      className={baseClasses.join(' ')}
      style={{ ...clipHexagonStyle, ...(active ? shadowNeonStyle : {}) }}
      {...rest}
    >
      <div
        className="absolute inset-0 rounded-lg border-2 border-cyan-400 opacity-50 pointer-events-none animate-pulse"
        style={clipHexagonStyle}
      ></div>
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default Hexagon;
