/**
 * Theme Context and Hook
 * 
 * Provides light/dark theme toggle functionality.
 * Persists preference to localStorage.
 */

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'neutral';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Initialize from localStorage or system preference
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) {
      setThemeState(stored);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setThemeState('dark');
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    // Remove all theme classes
    root.classList.remove('dark', 'neutral');
    
    // Add appropriate theme class
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'neutral') {
      root.classList.add('neutral');
    }
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setThemeState(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'neutral';
      return 'light';
    });
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  // Prevent flash of wrong theme
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default useTheme;
