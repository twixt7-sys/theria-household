import React from 'react';
import { ChevronRight } from 'lucide-react';
import { HanaFace } from '../../../shared/components/HouseholdBuddy';
import { TheriaCard } from '../../../shared/components/TheriaCard';

/**
 * Hana's presence on the dashboard: one line, tappable, never dominant.
 *
 * The line shown is the deterministic household summary — no model call is made
 * to render the dashboard (prompt0.md §11.6). Hana phrases things only once the
 * user actually opens a conversation.
 */
export const HanaStrip: React.FC<{ summary: string; onOpen: () => void }> = ({
  summary,
  onOpen,
}) => (
  <TheriaCard size="medium" onClick={onOpen} aria-label="Ask Hana about your household">
    <div className="flex items-center gap-3">
      <span className="h-10 w-10 shrink-0">
        <HanaFace mood="happy" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
          Hana
        </p>
        <p className="truncate text-sm text-foreground">{summary}</p>
      </div>

      <ChevronRight size={16} className="shrink-0 text-muted-foreground" aria-hidden />
    </div>
  </TheriaCard>
);
