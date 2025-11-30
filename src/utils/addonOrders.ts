import { DEFAULT_ADDON_ORDER_CUTOFF_HOUR } from '../firestore/ConfigModel';
import { resolveCutoffHour } from './timeWindow';

export type AddonOrderWindowOptions = {
  cutoffHour?: number | null;
};

export type AddonDeliveryLabelOptions = AddonOrderWindowOptions & {
  locale?: string;
};

export const isAddonOrderWindowClosed = (
  now: Date = new Date(),
  options?: AddonOrderWindowOptions,
): boolean => {
  const cutoffHour = resolveCutoffHour(options?.cutoffHour ?? null, DEFAULT_ADDON_ORDER_CUTOFF_HOUR);
  const cutoff = new Date(now);
  cutoff.setHours(cutoffHour, 0, 0, 0);
  return now.getTime() >= cutoff.getTime();
};

export const getAddonDeliveryDate = (
  now: Date = new Date(),
  options?: AddonOrderWindowOptions,
): Date => {
  const delivery = new Date(now);
  const daysToAdd = isAddonOrderWindowClosed(now, options) ? 2 : 1;
  delivery.setDate(delivery.getDate() + daysToAdd);
  delivery.setHours(0, 0, 0, 0);
  return delivery;
};

export const getAddonDeliveryDateKey = (
  now: Date = new Date(),
  options?: AddonOrderWindowOptions,
): string => {
  const delivery = getAddonDeliveryDate(now, options);
  return delivery.toISOString().split('T')[0];
};

export const getAddonDeliveryLabel = (
  now: Date = new Date(),
  options?: AddonDeliveryLabelOptions,
): string => {
  const { locale, cutoffHour } = options ?? {};
  const delivery = getAddonDeliveryDate(now, { cutoffHour });
  return delivery.toLocaleDateString(locale, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
};

export const getMinutesUntilCutoff = (
  now: Date = new Date(),
  options?: AddonOrderWindowOptions,
): number => {
  const cutoffHour = resolveCutoffHour(options?.cutoffHour ?? null, DEFAULT_ADDON_ORDER_CUTOFF_HOUR);
  const cutoff = new Date(now);
  cutoff.setHours(cutoffHour, 0, 0, 0);
  const diff = cutoff.getTime() - now.getTime();
  return Math.max(0, Math.floor(diff / 60000));
};
