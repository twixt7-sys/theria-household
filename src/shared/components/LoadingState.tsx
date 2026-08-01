import React from 'react';
import { cn } from '../lib/cn';

/**
 * Skeletons rather than a spinner: they hold the layout still, so the page
 * does not jump when data lands.
 */
export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('animate-pulse rounded-lg bg-muted', className)} aria-hidden />
);

export const LoadingState: React.FC<{ label?: string }> = ({ label = 'Loading your household' }) => (
  <div className="space-y-4" role="status" aria-live="polite" aria-busy="true">
    <span className="sr-only">{label}</span>
    <Skeleton className="h-24 w-full rounded-2xl" />
    <Skeleton className="h-16 w-full rounded-2xl" />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  </div>
);
