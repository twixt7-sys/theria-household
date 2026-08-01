import React from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { TheriaCard } from '../../../shared/components/TheriaCard';

/**
 * Homi's presence on the dashboard: one line, tappable, never dominant.
 *
 * The line shown is the deterministic household summary — no model call is
 * made to render the dashboard (prompt0.md §11.6). Homi phrases things only
 * once the user actually opens a conversation.
 */
export const HomiStrip: React.FC<{ summary: string; onOpen: () => void }> = ({
  summary,
  onOpen,
}) => (
  <TheriaCard size="medium" onClick={onOpen} aria-label="Ask Homi about your household">
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
        <Sparkles size={16} className="text-primary" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
          Homi
        </p>
        <p className="truncate text-sm text-foreground">{summary}</p>
      </div>

      <ChevronRight size={16} className="shrink-0 text-muted-foreground" aria-hidden />
    </div>
  </TheriaCard>
);
