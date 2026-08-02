import React from 'react';
import { Hammer } from 'lucide-react';
import { EmptyState } from '../../shared/components/EmptyState';
import { SCREEN_TITLES, type Screen } from '../routes';

/**
 * Honest placeholder for routes whose phase has not been built yet.
 *
 * Better than a broken link or a half-implemented screen: it names what is
 * coming and which build phase owns it, so the nav can be complete before the
 * features behind it are.
 */

const PHASE: Partial<Record<Screen, string>> = {
  profile: 'Phase 9',
  notifications: 'Phase 9',
};

export const PlaceholderScreen: React.FC<{ screen: Screen }> = ({ screen }) => (
  <EmptyState
    icon={Hammer}
    title={`${SCREEN_TITLES[screen]} is not built yet`}
    description={`This screen arrives in ${PHASE[screen] ?? 'a later phase'}. The dashboard, Stock, Bills, Deadlines and Analysis are live — everything else is still on the roadmap in prompt0.md.`}
  />
);
