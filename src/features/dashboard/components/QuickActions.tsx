import React from 'react';
import { CalendarPlus, PackagePlus, ReceiptText, type LucideIcon } from 'lucide-react';
import { cn } from '../../../shared/lib/cn';

/**
 * The three things a Manager most often opens the app to do.
 *
 * Shown only to Managers — for an Observer these would be doors into rooms
 * they cannot enter, and the app should read as observational rather than
 * disabled (prompt0.md §1.5).
 *
 * Deliberately a thin strip, not a card: quick actions are a shortcut to
 * existing screens, and they must not out-shout the household state above.
 */

interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
}

export const QuickActions: React.FC<{
  onAddStock: () => void;
  onAddBill: () => void;
  onAddDeadline: () => void;
  className?: string;
}> = ({ onAddStock, onAddBill, onAddDeadline, className }) => {
  const actions: QuickAction[] = [
    { id: 'stock', label: 'Stock', icon: PackagePlus, onSelect: onAddStock },
    { id: 'bill', label: 'Bill', icon: ReceiptText, onSelect: onAddBill },
    { id: 'deadline', label: 'Deadline', icon: CalendarPlus, onSelect: onAddDeadline },
  ];

  return (
    <div className={cn('flex flex-wrap gap-2', className)} role="group" aria-label="Quick actions">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={action.onSelect}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5',
            'text-xs font-medium text-foreground transition-colors',
            'hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <action.icon size={14} className="text-muted-foreground" aria-hidden />
          Add {action.label}
        </button>
      ))}
    </div>
  );
};
