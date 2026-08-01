import type { UnitCode } from './types';

/**
 * Unit handling and human-facing number formatting.
 *
 * Conversion only ever happens within a dimension. Two arbitrary units do not
 * convert, and custom units never do — "3 containers" into kilograms is not a
 * conversion, it is a guess (prompt0.md §6.4).
 */

type Dimension = 'mass' | 'volume' | 'count' | 'ratio';

interface UnitDef {
  dimension: Dimension;
  /** Multiplier to the dimension's base unit (g, mL, or 1). */
  toBase: number;
  label: string;
}

const UNITS: Record<string, UnitDef> = {
  kg: { dimension: 'mass', toBase: 1000, label: 'kg' },
  g: { dimension: 'mass', toBase: 1, label: 'g' },
  L: { dimension: 'volume', toBase: 1000, label: 'L' },
  mL: { dimension: 'volume', toBase: 1, label: 'mL' },
  pcs: { dimension: 'count', toBase: 1, label: 'pcs' },
  pack: { dimension: 'count', toBase: 1, label: 'packs' },
  container: { dimension: 'count', toBase: 1, label: 'containers' },
  '%': { dimension: 'ratio', toBase: 1, label: '%' },
};

export const BUILT_IN_UNITS = Object.keys(UNITS) as UnitCode[];

export const isKnownUnit = (unit: UnitCode): boolean => unit in UNITS;

/** True only for two known units sharing a dimension. */
export function canConvert(from: UnitCode, to: UnitCode): boolean {
  const a = UNITS[from];
  const b = UNITS[to];
  return Boolean(a && b && a.dimension === b.dimension && a.dimension !== 'ratio');
}

/** Converts within a dimension; returns null rather than guessing across one. */
export function convert(value: number, from: UnitCode, to: UnitCode): number | null {
  if (from === to) return value;
  if (!canConvert(from, to)) return null;
  return (value * UNITS[from].toBase) / UNITS[to].toBase;
}

/**
 * Rounds for display only — the model keeps full precision.
 * `1.384729` becomes `1.38`; `18` stays `18` rather than `18.00`.
 */
export function roundForDisplay(value: number, maxDecimals = 2): number {
  const factor = 10 ** maxDecimals;
  return Math.round(value * factor) / factor;
}

/** `18 kg`, `2 containers`, `1.38 kg`. Count units pluralise. */
export function formatQuantity(value: number, unit: UnitCode): string {
  const rounded = roundForDisplay(value);
  const def = UNITS[unit];

  if (!def) return `${rounded} ${unit}`.trim();
  if (def.dimension === 'ratio') return `${rounded}%`;

  if (def.dimension === 'count') {
    const singular = unit === 'pcs' ? 'pcs' : unit;
    return Math.abs(rounded) === 1 ? `${rounded} ${singular}` : `${rounded} ${def.label}`;
  }

  return `${rounded} ${def.label}`;
}

/** `3 packs + 2.2 kg` — the cupboard's own vocabulary. */
export function formatPackaged(
  sealedPacks: number,
  openQuantity: number,
  packUnit: UnitCode,
): string {
  const packs = `${sealedPacks} ${sealedPacks === 1 ? 'pack' : 'packs'}`;
  if (openQuantity <= 0) return packs;
  return `${packs} + ${formatQuantity(openQuantity, packUnit)}`;
}

/** `~13 days remaining`, or the honest fallback when we cannot know. */
export function formatDaysRemaining(days: number | null): string {
  if (days === null) return 'Not enough data yet';
  if (days <= 0) return 'Out of stock';
  if (days < 1) return 'Less than a day left';
  const rounded = Math.round(days);
  return rounded === 1 ? '~1 day remaining' : `~${rounded} days remaining`;
}

/** Household currency, formatted for the household's locale. */
export function formatCurrency(amount: number, currency = 'PHP', locale = 'en-PH'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // An unknown currency code should not blank out a bill amount.
    return `${currency} ${roundForDisplay(amount)}`;
  }
}
