import type { IsoDate } from './types';

/**
 * Calendar dates, kept out of UTC.
 *
 * A due date has no time and no timezone — "the 4th" is the 4th in the
 * household's kitchen. `toISOString().slice(0, 10)` converts to UTC first,
 * which quietly moves every date back a day for anyone east of Greenwich, so
 * it must not be used to render one.
 */

export const MS_PER_DAY = 86_400_000;

/** Midnight local time, so day arithmetic counts calendar days, not 24h blocks. */
export const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** `YYYY-MM-DD` from a local Date. */
export const toIsoDate = (date: Date): IsoDate => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

/** Parses `YYYY-MM-DD` as local midnight, the inverse of `toIsoDate`. */
export const fromIsoDate = (date: IsoDate): Date => new Date(`${date}T00:00:00`);

/** Whole calendar days between two dates. Negative when `to` is in the past. */
export const daysBetween = (from: Date, to: Date): number =>
  Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);
