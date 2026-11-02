import { ThemeProvider, useTheme } from 'next-themes';
import { useEffect, type ReactNode } from 'react';

const THEMES = ['light', 'dark'];

/** One root theme controls CSS utilities, native controls and body portals. */
function ThemeAttributes() {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (resolvedTheme === 'light' || resolvedTheme === 'dark') {
      document.documentElement.dataset.theme = resolvedTheme;
      document.querySelector('meta[name="theme-color"]')?.setAttribute(
        'content', resolvedTheme === 'dark' ? '#2b2b2c' : '#e3d9c6'
      );
    }
  }, [resolvedTheme]);
  return null;
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem
      enableColorScheme disableTransitionOnChange storageKey="theme" themes={THEMES}>
      <ThemeAttributes />
      {children}
    </ThemeProvider>
  );
}
