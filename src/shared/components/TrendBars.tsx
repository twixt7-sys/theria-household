import React from 'react';
import { cn } from '../lib/cn';

/**
 * A short series as proportional bars.
 *
 * Deliberately plain DOM rather than a charting library: these series are five
 * or six points long, and pulling a chart engine into a phone-first bundle to
 * draw six rectangles is a poor trade. If a genuinely interactive chart is ever
 * needed, that is the moment to reach for one.
 *
 * The bars carry no meaning on their own — every row states its own value in
 * text beside it, so the chart is readable without colour or width perception.
 */

export interface TrendPoint {
  id: string;
  /** Short axis label, e.g. "Jun 26". */
  label: string;
  value: number;
  /** The value as the user should read it, e.g. "₱4,832". */
  valueLabel: string;
}

export const TrendBars: React.FC<{
  points: TrendPoint[];
  /** Emphasises the final point, which is usually "now". */
  highlightLast?: boolean;
  className?: string;
}> = ({ points, highlightLast = true, className }) => {
  if (points.length === 0) return null;

  const max = Math.max(...points.map((p) => p.value));

  return (
    <ul className={cn('space-y-1.5', className)}>
      {points.map((point, index) => {
        const latest = highlightLast && index === points.length - 1;
        return (
          <li key={point.id} className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-[0.6875rem] text-muted-foreground">
              {point.label}
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className={cn('block h-full rounded-full', latest ? 'bg-primary' : 'bg-primary/40')}
                style={{ width: `${max > 0 ? (point.value / max) * 100 : 0}%` }}
              />
            </span>
            <span className="tabular w-24 shrink-0 text-right text-[0.6875rem] text-foreground">
              {point.valueLabel}
            </span>
          </li>
        );
      })}
    </ul>
  );
};
