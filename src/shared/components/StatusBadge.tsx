import React from 'react';
import type { Status } from '../../core/domain/types';
import { STATUS_STYLES } from '../lib/statusStyles';
import { cn } from '../lib/cn';

interface StatusBadgeProps {
  status: Status;
  /** Overrides the default word, e.g. "Overdue" instead of "Critical". */
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

/** Colour + icon + word. Never colour alone. */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'sm',
  className,
}) => {
  const style = STATUS_STYLES[status];
  const Icon = style.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        style.bg,
        style.border,
        style.text,
        size === 'sm' ? 'px-2 py-0.5 text-[0.6875rem]' : 'px-2.5 py-1 text-xs',
        className,
      )}
    >
      <Icon size={size === 'sm' ? 12 : 14} aria-hidden />
      {label ?? style.label}
    </span>
  );
};
