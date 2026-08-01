import React from 'react';
import { cn } from '../lib/cn';

/**
 * Circular progress, shared by the calendar card and stock levels.
 *
 * Renders as an accessible progressbar rather than decorative SVG, because on
 * a stock card the ring *is* the value.
 */

export type RingSize = 'sm' | 'md' | 'lg';

const SIZES: Record<RingSize, { box: number; stroke: number }> = {
  sm: { box: 44, stroke: 4 },
  md: { box: 72, stroke: 6 },
  lg: { box: 104, stroke: 8 },
};

interface ProgressRingProps {
  /** 0-100. Clamped, so an overflowing item does not draw past full. */
  percentage: number;
  size?: RingSize;
  /** Any CSS colour; defaults to the app's primary. */
  color?: string;
  /** Large centred value, e.g. "31" or "72%". */
  value?: React.ReactNode;
  /** Small caption beneath the value. */
  caption?: React.ReactNode;
  label: string;
  className?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  percentage,
  size = 'md',
  color = 'var(--primary)',
  value,
  caption,
  label,
  className,
}) => {
  const { box, stroke } = SIZES[size];
  const clamped = Math.max(0, Math.min(100, percentage));
  const radius = (box - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: box, height: box }}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <svg width={box} height={box} className="-rotate-90" aria-hidden>
        <circle
          cx={box / 2}
          cy={box / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={box / 2}
          cy={box / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>

      {(value || caption) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          {value && (
            <span
              className={cn(
                'tabular font-semibold text-foreground',
                size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : 'text-2xl',
              )}
            >
              {value}
            </span>
          )}
          {caption && (
            <span className="mt-0.5 text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">
              {caption}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
