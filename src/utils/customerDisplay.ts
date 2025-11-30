export const getDisplayCustomerId = (
  customerShortId?: string | null,
  fallbackId?: string | null,
  options?: { allowFallback?: boolean },
): string => {
  const short = typeof customerShortId === 'string' ? customerShortId.trim() : '';
  if (short.length > 0) {
    return short;
  }

  if (options?.allowFallback) {
    const fallback = typeof fallbackId === 'string' ? fallbackId.trim() : '';
    if (fallback.length > 0) {
      return fallback;
    }
  }

  return '—';
};
