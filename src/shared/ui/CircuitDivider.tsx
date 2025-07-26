import React from 'react';

interface CircuitDividerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

const CircuitDivider: React.FC<CircuitDividerProps> = ({ className = '', ...rest }) => {
  const baseClasses = [
    'relative',
    'w-full',
    'h-1',
    'bg-gradient-to-r',
    'from-cyan-400',
    'via-blue-500',
    'to-cyan-400',
    'rounded-full',
  ];

  if (className) {
    baseClasses.push(className);
  }

  return (
    <div className={baseClasses.join(' ')} {...rest}>
      <div className="absolute top-0 left-0 w-4 h-1 bg-cyan-400 rounded-l-full animate-pulse"></div>
      <div className="absolute top-0 right-0 w-4 h-1 bg-cyan-400 rounded-r-full animate-pulse"></div>
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 100 10"
      >
        <path
          d="M0 5 L20 5 M30 5 L50 5 M60 5 L80 5 M90 5 L100 5"
          stroke="#22d3ee"
          strokeWidth="1"
          strokeDasharray="5,5"
        />
        <circle cx="20" cy="5" r="1" fill="#22d3ee" />
        <circle cx="50" cy="5" r="1" fill="#22d3ee" />
        <circle cx="80" cy="5" r="1" fill="#22d3ee" />
      </svg>
    </div>
  );
};

export default CircuitDivider;
