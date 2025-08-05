'use client';

import { ReactNode } from 'react';
import { useHydrationSafe } from '@/hooks/use-hydration-safe';

interface HydrationSafeProps {
  children: ReactNode;
  fallback?: ReactNode;
  suppressHydrationWarning?: boolean;
}

export function HydrationSafe({ 
  children, 
  fallback = null, 
  suppressHydrationWarning = false 
}: HydrationSafeProps) {
  const isHydrated = useHydrationSafe();

  if (!isHydrated) {
    return <>{fallback}</>;
  }

  return (
    <div suppressHydrationWarning={suppressHydrationWarning}>
      {children}
    </div>
  );
}

export function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const isClient = useHydrationSafe();

  if (!isClient) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
} 