import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/shared/ui/ui/button';
import { cn } from '@/lib/utils';

export interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  showLabel?: boolean;
}

/** Icons follow the root class, including before React mounts. */
export function ThemeToggle({ className, size = 'md', variant = 'ghost', showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button type="button" variant={variant} size={size === 'md' ? 'default' : size}
      className={cn('text-foreground focus-visible:ring-ring', className)}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
      <Moon aria-hidden="true" className="h-4 w-4 dark:hidden" />
      <Sun aria-hidden="true" className="hidden h-4 w-4 dark:block" />
      <span className={showLabel ? 'text-sm' : 'sr-only'}>
        <span className="dark:hidden">Switch to dark mode</span>
        <span className="hidden dark:inline">Switch to light mode</span>
      </span>
    </Button>
  );
}
