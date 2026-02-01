/**
 * ThemeToggle Component
 * 
 * Button component for toggling between dark and light themes.
 * Part of Phase 2: Dark/Light Theme & Zoom Presets implementation.
 * 
 * Features:
 * - Sun/Moon icon toggle (lucide-react icons)
 * - Zustand store integration (useFabricatorUIStore)
 * - Applies data-theme attribute to document root
 * - Smooth transition animations
 * - Accessible (ARIA labels, keyboard navigation)
 * - Market leader-inspired UX (clean, minimal, intuitive)
 */

import React, { useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFabricatorUIStore } from '@/stores/fabricatorUIStore';
import { Button } from '@/shared/ui/ui/button';

export interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  size = 'md',
  variant = 'ghost',
  showLabel = false,
}) => {
  const theme = useFabricatorUIStore((state) => state.theme);
  const setTheme = useFabricatorUIStore((state) => state.setTheme);

  // Sync theme to document root data-theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Map 'md' to 'default' since Button component doesn't support 'md'
  const buttonSize = size === 'md' ? 'default' : size;

  const iconSizeClass = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <Button
      variant={variant}
      size={buttonSize}
      onClick={handleToggle}
      className={cn(
        'transition-all duration-200',
        'hover:scale-105 active:scale-95',
        'focus:outline-none focus:ring-2 focus:ring-amber-500/50',
        className
      )}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {theme === 'dark' ? (
        <Sun className={cn('transition-transform duration-200', iconSizeClass)} />
      ) : (
        <Moon className={cn('transition-transform duration-200', iconSizeClass)} />
      )}
      {showLabel && (
        <span className="ml-2 text-sm">
          {theme === 'dark' ? 'Light' : 'Dark'}
        </span>
      )}
    </Button>
  );
};
