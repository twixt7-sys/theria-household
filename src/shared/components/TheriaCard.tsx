import React from 'react';
import type { CardSize } from '../../core/domain/priority';
import { cn } from '../lib/cn';

/**
 * The surface every dashboard card sits on.
 *
 * Card size comes from the priority engine, so the grid spans live here rather
 * than being chosen by each card type. That is what keeps a dynamically
 * composed dashboard from turning into a ragged grid (prompt0.md §5.5).
 */

const SPAN: Record<CardSize, string> = {
  hero: 'sm:col-span-2 lg:col-span-2',
  large: 'sm:col-span-2 lg:col-span-2',
  medium: 'sm:col-span-1',
  compact: 'sm:col-span-1',
};

const PADDING: Record<CardSize, string> = {
  hero: 'p-5',
  large: 'p-5',
  medium: 'p-4',
  compact: 'p-3.5',
};

interface TheriaCardProps {
  size?: CardSize;
  /** Tints the surface — reserve it for cards that genuinely need attention. */
  accent?: 'none' | 'warning' | 'critical';
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
  'aria-label'?: string;
}

export const TheriaCard: React.FC<TheriaCardProps> = ({
  size = 'medium',
  accent = 'none',
  onClick,
  className,
  children,
  'aria-label': ariaLabel,
}) => {
  const classes = cn(
    'relative overflow-hidden rounded-2xl border bg-card text-card-foreground',
    'transition-colors duration-200',
    SPAN[size],
    PADDING[size],
    accent === 'critical' && 'border-status-critical/35 bg-status-critical-soft',
    accent === 'warning' && 'border-status-warning/30 bg-status-warning-soft',
    accent === 'none' && 'border-border',
    onClick && 'text-left hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    className,
  );

  if (!onClick) {
    return (
      <div className={classes} aria-label={ariaLabel}>
        {children}
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes} aria-label={ariaLabel}>
      {children}
    </button>
  );
};
