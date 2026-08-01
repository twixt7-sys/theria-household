import React from 'react';
import { CheckCircle2, CircleAlert, TriangleAlert } from 'lucide-react';
import type { HouseholdStatus } from '../../../core/domain/householdStatus';
import { TheriaCard } from '../../../shared/components/TheriaCard';

/**
 * The five-second answer: is the household okay?
 *
 * When everything is fine this card says so plainly and stops. A dashboard
 * that always finds something to report is one people stop reading.
 */
export const HouseholdStatusCard: React.FC<{ status: HouseholdStatus }> = ({ status }) => {
  const { overallStatus, summary, criticalItems, attentionItems } = status;

  const tone =
    overallStatus === 'CRITICAL'
      ? { Icon: CircleAlert, accent: 'critical' as const, color: 'text-status-critical' }
      : overallStatus === 'ATTENTION'
        ? { Icon: TriangleAlert, accent: 'warning' as const, color: 'text-status-warning' }
        : { Icon: CheckCircle2, accent: 'none' as const, color: 'text-status-good' };

  const named = [...criticalItems, ...attentionItems].slice(0, 3);

  return (
    <TheriaCard size="hero" accent={tone.accent}>
      <div className="flex items-start gap-3">
        <tone.Icon size={22} className={`mt-0.5 shrink-0 ${tone.color}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
            Home status
          </p>
          <p className="mt-1 text-base font-semibold leading-snug text-foreground">{summary}</p>

          {named.length > 0 && (
            <ul className="mt-2.5 space-y-1">
              {named.map((item) => (
                <li key={`${item.kind}-${item.id}`} className="flex gap-2 text-xs">
                  <span className="font-medium text-foreground">{item.label}</span>
                  <span className="text-muted-foreground">{item.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </TheriaCard>
  );
};
