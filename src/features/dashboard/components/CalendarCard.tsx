import React from 'react';
import { ProgressRing } from '../../../shared/components/ProgressRing';
import { TheriaCard } from '../../../shared/components/TheriaCard';

/**
 * The dashboard's opening beat: compact, a little decorative, still
 * informative. The ring shows how far through the month we are, which is the
 * frame most household obligations are actually measured in.
 */
export const CalendarCard: React.FC<{ now?: Date }> = ({ now = new Date() }) => {
  const day = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const percentage = (day / daysInMonth) * 100;

  const month = now.toLocaleDateString(undefined, { month: 'long' });
  const weekday = now.toLocaleDateString(undefined, { weekday: 'long' });

  return (
    <TheriaCard size="medium" className="flex items-center gap-4">
      <ProgressRing
        percentage={percentage}
        size="md"
        value={day}
        caption={now.toLocaleDateString(undefined, { month: 'short' })}
        label={`Day ${day} of ${daysInMonth} in ${month}`}
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{weekday}</p>
        <p className="text-xs text-muted-foreground">
          {month} {now.getFullYear()}
        </p>
        <p className="mt-1 text-[0.6875rem] text-muted-foreground">
          Day {day} of {daysInMonth}
        </p>
      </div>
    </TheriaCard>
  );
};
