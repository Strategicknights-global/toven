import type { BannerSchema } from '../schemas/BannerSchema';

export const getBannerImageSrc = (banner?: BannerSchema | null): string | null => {
  if (!banner) {
    return null;
  }

  if (typeof banner.imageBase64 === 'string') {
    const trimmed = banner.imageBase64.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  if (typeof banner.imageUrl === 'string') {
    const trimmed = banner.imageUrl.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
};

export const getBannerAlt = (banner?: BannerSchema | null, fallback = 'Banner image'): string => {
  if (!banner) {
    return fallback;
  }

  const title = typeof banner.title === 'string' ? banner.title.trim() : '';
  return title || fallback;
};
