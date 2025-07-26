import React, { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

type Variant = 'outline' | 'industrial';
type Glow = 'subtle' | 'industrialGlow' | 'none';
type Size = 'sm' | 'md' | 'lg';

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  glow?: Glow;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

const glowStyles = {
  subtle: 'shadow-[0_0_8px_rgba(34,211,238,0.7)] hover:shadow-[0_0_12px_rgba(34,211,238,0.9)]',
  industrialGlow:
    'shadow-[0_0_12px_rgba(0,255,255,0.9),0_0_24px_rgba(0,255,255,0.7)] hover:shadow-[0_0_16px_rgba(0,255,255,1),0_0_32px_rgba(0,255,255,0.9)]',
  none: '',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

const variantStyles = {
  outline:
    'bg-transparent border border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-gray-900 transition-colors duration-300',
  industrial:
    'bg-cyan-500 text-gray-900 font-semibold border border-cyan-400 hover:bg-cyan-600 transition-colors duration-300',
};

const NeonButton: React.FC<NeonButtonProps> = ({
  variant = 'outline',
  glow = 'none',
  size = 'md',
  className = '',
  children,
  ...rest
}) => {
  return (
    <button
      className={clsx(
        'rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2',
        variantStyles[variant],
        glowStyles[glow],
        sizeStyles[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
};

export { NeonButton };
