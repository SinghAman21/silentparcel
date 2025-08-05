'use client';

import { useState, useEffect } from 'react';

export function useHydrationSafe() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}

export function useClientOnly() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}

export function suppressHydrationWarning() {
  if (typeof window !== 'undefined') {
    // Suppress hydration warnings in development
    const originalError = console.error;
    console.error = (...args) => {
      if (args[0]?.includes?.('Hydration failed') || args[0]?.includes?.('Text content does not match')) {
        return;
      }
      originalError.apply(console, args);
    };
  }
} 