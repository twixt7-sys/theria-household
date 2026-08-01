import React from 'react';
import { History } from 'lucide-react';
import type { ChangeEntry } from '../../../core/domain/householdStatus';
import { TheriaCard } from '../../../shared/components/TheriaCard';

const relativeTime = (iso: string, now: Date): string => {
  const minutes = Math.round((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
};

/**
 * What changed, without having to ask anyone.
 *
 * This is the quiet centrepiece of the overseas-family case: it answers "has
 * anything happened at home?" before the question gets typed into a group chat
 * (prompt0.md §1.2).
 */
export const RecentChanges: React.FC<{ changes: ChangeEntry[]; now?: Date }> = ({
  changes,
  now = new Date(),
}) => {
  if (changes.length === 0) return null;

  return (
    <TheriaCard size="medium">
      <div className="mb-3 flex items-center gap-2">
        <History size={14} className="text-muted-foreground" aria-hidden />
        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
          Recent changes
        </h2>
      </div>

      <ul className="space-y-2">
        {changes.map((change) => (
          <li key={change.id} className="flex items-baseline justify-between gap-3 text-xs">
            <span className="min-w-0 flex-1 truncate">
              <span className="font-medium text-foreground">{change.label}</span>{' '}
              <span className="text-muted-foreground">{change.detail}</span>
            </span>
            <span className="shrink-0 text-[0.6875rem] text-muted-foreground">
              {relativeTime(change.at, now)}
            </span>
          </li>
        ))}
      </ul>
    </TheriaCard>
  );
};
