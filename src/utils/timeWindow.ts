const DEFAULT_CUTOFF_FALLBACK = 18;

export const resolveCutoffHour = (
  value: number | null | undefined,
  fallback: number = DEFAULT_CUTOFF_FALLBACK,
  clamp: { min?: number; max?: number } = { min: 0, max: 23 },
): number => {
  const min = typeof clamp.min === 'number' ? clamp.min : 0;
  const max = typeof clamp.max === 'number' ? clamp.max : 23;

  if (typeof value === 'number' && Number.isFinite(value)) {
    const normalized = Math.floor(value);
    return Math.max(min, Math.min(max, normalized));
  }

  return Math.max(min, Math.min(max, Math.floor(fallback)));
};
