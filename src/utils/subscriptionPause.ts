/**
 * Subscription pause window utilities
 * Similar to addon order window - users can pause subscription for tomorrow only if done before the configured cutoff.
 */

import { DEFAULT_SUBSCRIPTION_PAUSE_CUTOFF_HOUR } from '../firestore/ConfigModel';
import { resolveCutoffHour } from './timeWindow';

export type PauseWindowOptions = {
  cutoffHour?: number | null;
};

export type PauseWindowLabelOptions = PauseWindowOptions & {
  locale?: string;
};

/**
 * Check if the pause window for tomorrow has closed
 * @param now Current date/time
 * @param options Optional overrides including cutoff hour
 * @returns true if past cutoff today (cannot pause for tomorrow)
 */
export const isPauseWindowClosed = (
  now: Date = new Date(),
  options?: PauseWindowOptions,
): boolean => {
  const cutoffHour = resolveCutoffHour(options?.cutoffHour ?? null, DEFAULT_SUBSCRIPTION_PAUSE_CUTOFF_HOUR);
  const cutoff = new Date(now);
  cutoff.setHours(cutoffHour, 0, 0, 0);
  return now.getTime() >= cutoff.getTime();
};

/**
 * Get the earliest date that can be paused starting from
 * @param now Current date/time
 * @param options Optional overrides including cutoff hour
 * @returns Date object representing the earliest pause start date
 */
export const getEarliestPauseDate = (
  now: Date = new Date(),
  options?: PauseWindowOptions,
): Date => {
  const pauseDate = new Date(now);
  const daysToAdd = isPauseWindowClosed(now, options) ? 2 : 1;
  pauseDate.setDate(pauseDate.getDate() + daysToAdd);
  pauseDate.setHours(0, 0, 0, 0);
  return pauseDate;
};

/**
 * Get a formatted label for the earliest pause date
 * @param now Current date/time
 * @param options Optional overrides including cutoff hour and locale
 * @returns Formatted date string or friendly label
 */
export const getEarliestPauseDateLabel = (
  now: Date = new Date(),
  options?: PauseWindowLabelOptions,
): string => {
  const { locale = 'en-IN', cutoffHour } = options ?? {};
  const pauseDate = getEarliestPauseDate(now, { cutoffHour });
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  if (pauseDate.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  }
  if (pauseDate.getTime() === dayAfterTomorrow.getTime()) {
    return 'Day after tomorrow';
  }

  return pauseDate.toLocaleDateString(locale, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Get minutes remaining until the pause window closes for tomorrow
 * @param now Current date/time
 * @param options Optional overrides including cutoff hour
 * @returns Number of minutes until cutoff
 */
export const getMinutesUntilPauseCutoff = (
  now: Date = new Date(),
  options?: PauseWindowOptions,
): number => {
  const cutoffHour = resolveCutoffHour(options?.cutoffHour ?? null, DEFAULT_SUBSCRIPTION_PAUSE_CUTOFF_HOUR);
  const cutoff = new Date(now);
  cutoff.setHours(cutoffHour, 0, 0, 0);
  const diff = cutoff.getTime() - now.getTime();
  return Math.max(0, Math.floor(diff / 60000));
};

/**
 * Format the cutoff time for display based on configured hour
 * @param cutoffHour Optional hour override
 * @returns Formatted cutoff time string (e.g. "6:00 PM")
 */
export const getPauseCutoffTimeLabel = (cutoffHour?: number | null): string => {
  const hour = resolveCutoffHour(cutoffHour ?? null, DEFAULT_SUBSCRIPTION_PAUSE_CUTOFF_HOUR);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
};
