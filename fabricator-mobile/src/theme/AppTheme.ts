/**
 * App theme matching web app design system
 */
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const FabricatorTheme = {
  light: {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      primary: '#2563eb', // Blue matching web app
      secondary: '#64748b',
      tertiary: '#f1f5f9',
      error: '#ef4444',
      success: '#22c55e',
      warning: '#f59e0b',
      background: '#f8fafc',
      surface: '#ffffff',
      surfaceVariant: '#f1f5f9',
      onPrimary: '#ffffff',
      onSecondary: '#ffffff',
      onBackground: '#0f172a',
      onSurface: '#0f172a',
    },
  },
  dark: {
    ...MD3DarkTheme,
    colors: {
      ...MD3DarkTheme.colors,
      primary: '#3b82f6',
      secondary: '#94a3b8',
      tertiary: '#1e293b',
      error: '#f87171',
      success: '#4ade80',
      warning: '#fbbf24',
      background: '#0f172a',
      surface: '#1e293b',
      surfaceVariant: '#334155',
      onPrimary: '#ffffff',
      onSecondary: '#ffffff',
      onBackground: '#f8fafc',
      onSurface: '#f8fafc',
    },
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
};

