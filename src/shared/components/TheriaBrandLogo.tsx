import React from 'react';
import { cn } from '../lib/cn';

/**
 * Theria's mark — a hexagon, echoing the bottom nav's centre button so the
 * ecosystem reads as one family across Finance and Household.
 */

const BOX: Record<'sm' | 'md' | 'lg', number> = { sm: 26, md: 34, lg: 48 };

export const TheriaBrandLogo: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className,
}) => {
  const box = BOX[size];
  return (
    <svg
      width={box}
      height={box}
      viewBox="0 0 48 48"
      className={cn('shrink-0', className)}
      role="img"
      aria-label="Theria"
    >
      <defs>
        <linearGradient id="theria-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="55%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>
      <path
        d="M24 3 L40.6 12.5 L40.6 31.5 L24 41 L7.4 31.5 L7.4 12.5 Z"
        fill="url(#theria-mark)"
      />
      {/* A roofline inside the mark — the household half of the ecosystem. */}
      <path
        d="M16 25.5 L24 18.5 L32 25.5 M18.6 24 L18.6 31 L29.4 31 L29.4 24"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.92"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const TheriaBrandWordmark: React.FC<{ className?: string }> = ({ className }) => (
  <span
    className={cn(
      'shrink-0 text-sm font-bold uppercase tracking-[0.14em] text-foreground',
      className,
    )}
  >
    Theria
  </span>
);
