import type { HouseholdStatus } from '../../core/domain/householdStatus';
import type { Screen } from '../../app/routes';
import type { BuddyMood } from '../../shared/components/HouseholdBuddy';

/**
 * What Hana says, and when.
 *
 * Every line is derived from `householdStatus` — the same numbers the dashboard
 * renders — so Hana can never cheerfully contradict the screen behind her. No
 * model is called to produce these (prompt0.md §11.6); the AI only phrases
 * things once a conversation is actually opened.
 */

export interface HanaSpeech {
  mood: BuddyMood;
  lines: string[];
}

const moodFor = (status: HouseholdStatus): BuddyMood =>
  status.overallStatus === 'CRITICAL'
    ? 'concerned'
    : status.overallStatus === 'ATTENTION'
      ? 'neutral'
      : 'happy';

/** The first critical or attention item, named plainly. */
const firstConcern = (status: HouseholdStatus): string | null => {
  const item = status.criticalItems[0] ?? status.attentionItems[0];
  return item ? `${item.label} — ${item.detail}` : null;
};

/**
 * Screen-aware chatter.
 *
 * Hana leads with whatever the household actually needs, then offers something
 * useful about the screen you are on. When there is nothing wrong she says so
 * once and stops — a companion who always has news is one people learn to
 * ignore.
 */
export function hanaSpeechFor(screen: Screen, status: HouseholdStatus): HanaSpeech | null {
  const mood = moodFor(status);
  const concern = firstConcern(status);
  const lines: string[] = [];

  if (concern && status.overallStatus !== 'GOOD') {
    lines.push(`${status.summary} ${concern}.`);
  }

  switch (screen) {
    case 'home':
      if (lines.length === 0) lines.push(status.summary);
      lines.push('Tap me any time and I can talk you through what changed.');
      break;
    case 'stock':
      lines.push('Tap an item to change what counts as low for it.');
      break;
    case 'bills':
      lines.push('Recording a payment opens the next month automatically.');
      break;
    case 'deadlines':
      lines.push('Marking a repeating deadline done schedules the next one.');
      break;
    case 'tasks':
      lines.push('Small things, written down before they are forgotten.');
      break;
    case 'analysis':
      lines.push('I only show a trend once there is enough history to trust it.');
      break;
    default:
      break;
  }

  return lines.length > 0 ? { mood, lines } : null;
}
