import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import type { BillStatus, Status } from '../../core/domain/types';

/**
 * Status presentation, in one place.
 *
 * Every status carries an icon and a word alongside its colour. Colour alone
 * fails WCAG 1.4.1 and fails anyone with a colour vision deficiency — which,
 * for a red/green ramp, is a lot of people (prompt0.md §5.3).
 */

export interface StatusStyle {
  label: string;
  icon: LucideIcon;
  text: string;
  bg: string;
  border: string;
  ring: string;
}

export const STATUS_STYLES: Record<Status, StatusStyle> = {
  GOOD: {
    label: 'Good',
    icon: CheckCircle2,
    text: 'text-status-good',
    bg: 'bg-status-good-soft',
    border: 'border-status-good/25',
    ring: 'var(--status-good)',
  },
  WARNING: {
    label: 'Low',
    icon: AlertTriangle,
    text: 'text-status-warning',
    bg: 'bg-status-warning-soft',
    border: 'border-status-warning/30',
    ring: 'var(--status-warning)',
  },
  CRITICAL: {
    label: 'Critical',
    icon: CircleAlert,
    text: 'text-status-critical',
    bg: 'bg-status-critical-soft',
    border: 'border-status-critical/35',
    ring: 'var(--status-critical)',
  },
  UNKNOWN: {
    label: 'No data',
    icon: HelpCircle,
    text: 'text-status-unknown',
    bg: 'bg-status-unknown-soft',
    border: 'border-status-unknown/25',
    ring: 'var(--status-unknown)',
  },
};

/** Bill states map onto the same four-colour ramp so the UI stays legible. */
export const BILL_STATUS_TO_STATUS: Record<BillStatus, Status> = {
  PAID: 'GOOD',
  UPCOMING: 'GOOD',
  DUE_SOON: 'WARNING',
  DUE_TODAY: 'WARNING',
  OVERDUE: 'CRITICAL',
};

export const BILL_STATUS_LABEL: Record<BillStatus, string> = {
  PAID: 'Paid',
  UPCOMING: 'Upcoming',
  DUE_SOON: 'Due soon',
  DUE_TODAY: 'Due today',
  OVERDUE: 'Overdue',
};
