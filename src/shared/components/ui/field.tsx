import React, { useId } from 'react';
import { cn } from '../../lib/cn';

/**
 * A labelled form control.
 *
 * Exists so no form in the app can ship an input without a real `<label>`
 * attached to it — the id wiring is done here once rather than remembered
 * field by field.
 */
export const Field: React.FC<{
  label: string;
  /** Shown under the control. Say what the field means, not what it is. */
  hint?: string;
  error?: string | null;
  className?: string;
  children: (id: string) => React.ReactNode;
}> = ({ label, hint, error, className, children }) => {
  const id = useId();

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-xs font-medium text-foreground">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className="text-[0.6875rem] text-status-critical">{error}</p>
      ) : (
        hint && <p className="text-[0.6875rem] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
};
