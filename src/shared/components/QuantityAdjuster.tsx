import React, { useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { StockItem } from '../../core/domain/types';
import { formatQuantity } from '../../core/domain/units';
import { cn } from '../lib/cn';

/**
 * One-tap stock adjustment — the interaction the whole product is optimised
 * for (prompt0.md §9.5).
 *
 * Taps are debounced into a single write. Someone recording four cups of rice
 * taps `−1` four times in two seconds; that should be one event of −4, not
 * four events racing each other through Firestore.
 */

const COMMIT_DELAY_MS = 900;

/**
 * Hoisted out of the component on purpose: defined inline, it would be a new
 * component type on every render, remounting the buttons and dropping keyboard
 * focus after each tap.
 */
const StepButton: React.FC<{
  onStep: () => void;
  label: string;
  children: React.ReactNode;
}> = ({ onStep, label, children }) => (
  <button
    type="button"
    onClick={(event) => {
      // The card behind may be clickable; a step is not a navigation.
      event.stopPropagation();
      onStep();
    }}
    aria-label={label}
    className={cn(
      'flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg border border-border px-2',
      'text-xs font-semibold text-foreground transition-colors',
      'hover:border-primary/40 hover:bg-primary/10 active:scale-95',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    )}
  >
    {children}
  </button>
);

interface QuantityAdjusterProps {
  item: StockItem;
  /** Called once per settled interaction with the net change. */
  onCommit: (delta: number) => void;
  disabled?: boolean;
  /** Packaged items also offer whole-pack steps. */
  showPackSteps?: boolean;
  className?: string;
}

export const QuantityAdjuster: React.FC<QuantityAdjusterProps> = ({
  item,
  onCommit,
  disabled = false,
  showPackSteps = true,
  className,
}) => {
  // Pending lives in a ref as well as state: the ref is what gets committed,
  // the state is only what gets rendered. Committing from inside a state
  // updater would double-fire under StrictMode, which means a double write.
  const [pending, setPending] = useState(0);
  const pendingRef = useRef(0);
  const timer = useRef<number | null>(null);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  const packStep = item.packaging?.packSize ?? 0;
  const offerPacks = showPackSteps && packStep > 0;
  const unitStep = 1;

  const schedule = (delta: number) => {
    if (disabled) return;

    pendingRef.current += delta;
    setPending(pendingRef.current);

    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      const net = pendingRef.current;
      pendingRef.current = 0;
      setPending(0);
      if (net !== 0) commitRef.current(net);
    }, COMMIT_DELAY_MS);
  };

  // Unmounting mid-interaction must not silently drop a change the user has
  // already seen counted on screen — flush it rather than discard it.
  useEffect(
    () => () => {
      if (timer.current) {
        window.clearTimeout(timer.current);
        if (pendingRef.current !== 0) {
          commitRef.current(pendingRef.current);
          pendingRef.current = 0;
        }
      }
    },
    [],
  );

  if (disabled) return null;

  const projected = Math.max(0, item.quantity + pending);

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {offerPacks && (
        <StepButton
          onStep={() => schedule(-packStep)}
          label={`Remove one pack of ${item.name}`}
        >
          <Minus size={12} aria-hidden />
          <span>pack</span>
        </StepButton>
      )}

      <StepButton
        onStep={() => schedule(-unitStep)}
        label={`Remove ${unitStep} ${item.unit} of ${item.name}`}
      >
        <Minus size={14} aria-hidden />
      </StepButton>

      {/* Live preview of the settling total, so the tap feels immediate even
          though the write has not happened yet. */}
      <span
        className={cn(
          'tabular min-w-16 px-1 text-center text-xs font-medium',
          pending !== 0 ? 'text-primary' : 'text-muted-foreground',
        )}
        aria-live="polite"
      >
        {formatQuantity(projected, item.unit)}
      </span>

      <StepButton
        onStep={() => schedule(unitStep)}
        label={`Add ${unitStep} ${item.unit} of ${item.name}`}
      >
        <Plus size={14} aria-hidden />
      </StepButton>

      {offerPacks && (
        <StepButton onStep={() => schedule(packStep)} label={`Add one pack of ${item.name}`}>
          <Plus size={12} aria-hidden />
          <span>pack</span>
        </StepButton>
      )}
    </div>
  );
};
