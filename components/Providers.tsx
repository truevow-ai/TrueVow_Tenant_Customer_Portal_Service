/**
 * Client-side providers wrapper
 * 
 * Wraps children with all necessary client-side providers.
 */

'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from '@/hooks/useTheme';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
}
