import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  /** Say what to do next, not just that there is nothing here. */
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-12 text-center',
      className,
    )}
  >
    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
      <Icon size={22} className="text-muted-foreground" aria-hidden />
    </div>
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);
