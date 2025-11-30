import React from 'react';
import { ArrowRight } from 'lucide-react';
import { usePlacementBanners } from '../stores/publicBannersStore';
import type { BannerPlacement, BannerSchema } from '../schemas/BannerSchema';
import { getBannerAlt, getBannerImageSrc } from '../utils/bannerUtils';

interface CategoryCardGridProps {
  banners?: BannerSchema[];
  placement?: BannerPlacement;
  loading?: boolean;
  emptyContent?: React.ReactNode;
  className?: string;
  cardClassName?: string;
  maxItems?: number;
  mobileColumns?: 1 | 2;
  variant?: 'stacked' | 'promoTile';
}

const prettifyFileName = (value: string): string => {
  const base = value
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return base ? base.replace(/\b\w/g, (char) => char.toUpperCase()) : 'Featured';
};

const getCardTitle = (banner: BannerSchema): string =>
  banner.title?.trim() || prettifyFileName(banner.fileName);
const getCardDescription = (banner: BannerSchema): string =>
  banner.description?.trim() || '';
const getCardDiscount = (banner: BannerSchema): string | null =>
  banner.customData?.discount || null;

const getCardCta = (banner: BannerSchema) => {
  const label = banner.ctaLabel?.trim();
  const href = banner.ctaHref?.trim();
  if (!label || !href) return null;
  const isAbsolute = /^https?:\/\//i.test(href);
  return {
    label,
    href,
    target: isAbsolute ? '_blank' : undefined,
    rel: isAbsolute ? 'noopener noreferrer' : undefined,
  } as const;
};

const DEFAULT_EMPTY = (
  <div className="rounded-2xl border border-dashed border-purple-200 bg-purple-50/40 px-6 py-16 text-center text-sm text-purple-600">
    Upload banners under <strong>Landing Category Cards</strong> to populate this section.
  </div>
);

const CategoryCardGrid: React.FC<CategoryCardGridProps> = ({
  banners: providedBanners,
  placement = 'home-categories',
  loading: loadingOverride,
  emptyContent = DEFAULT_EMPTY,
  className,
  cardClassName,
  maxItems,
  mobileColumns,
  variant = 'stacked',
}) => {
  const shouldAutoLoad = providedBanners === undefined;
  const { banners: storeBanners, loading: storeLoading } = usePlacementBanners(
    placement,
    { auto: shouldAutoLoad }
  );

  const bannersSource = providedBanners ?? storeBanners;
  const banners = React.useMemo(
    () => (maxItems ? bannersSource.slice(0, maxItems) : bannersSource),
    [bannersSource, maxItems]
  );
  const loading = loadingOverride ?? (shouldAutoLoad ? storeLoading : false);
  const bannerCount = banners.length;

  const gridClassName = React.useMemo(() => {
    const base =
      'grid w-full sm:inline-grid sm:w-auto gap-6 sm:gap-8 justify-items-center sm:justify-items-start place-content-center sm:place-content-start';
    const mobile =
      mobileColumns === 2 && bannerCount >= 2 ? 'grid-cols-2' : 'grid-cols-1';
    if (bannerCount <= 1) return `${base} ${mobile}`;
    if (bannerCount === 2) return `${base} ${mobile} sm:grid-cols-2`;
    if (bannerCount === 3) return `${base} ${mobile} sm:grid-cols-2 lg:grid-cols-3`;
    return `${base} ${mobile} sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;
  }, [bannerCount, mobileColumns]);

  if (loading) {
    return (
      <div
        className={`grid w-full gap-6 sm:gap-8 ${mobileColumns === 2 ? 'grid-cols-2' : 'grid-cols-1'
          } sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`}
      >
        {Array.from({ length: maxItems || 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-gray-200 animate-pulse rounded-2xl aspect-square"
          ></div>
        ))}
      </div>
    );
  }

  if (!bannerCount) return <>{emptyContent}</>;

  return (
    <div className={className}>
      <div className="flex justify-center sm:justify-start w-full text-center sm:text-left">
        <div className={gridClassName}>
          {banners.map((banner) => {
            const imageSrc = getBannerImageSrc(banner);
            const alt = getBannerAlt(banner, 'Landing category banner');
            const title = getCardTitle(banner);
            const description = getCardDescription(banner);
            const cta = getCardCta(banner);
            const discount = getCardDiscount(banner);

            // === PROMO TILE VARIANT ===
            if (variant === 'promoTile') {
              const content = (
                <div className="relative h-full w-full p-4 sm:p-5 flex flex-col justify-between">
                  <div className="z-20 flex flex-col text-left items-start">
                    <h3 className="font-bold tracking-tight text-gray-800 text-lg sm:text-xl">
                      {title}
                    </h3>
                    {description && (
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2 sm:line-clamp-3">
                        {description}
                      </p>
                    )}
                    {discount && (
                      <span className="mt-2 inline-block bg-[#E6E6FA] text-[#7851A9] text-xs font-semibold px-2 py-1 rounded-full">
                        {discount}
                      </span>
                    )}
                  </div>

                  <div className="relative flex justify-between items-end mt-4">
                    {cta && (
                      <a
                        href={cta.href}
                        target={cta.target}
                        rel={cta.rel}
                        className="relative z-30 flex items-center justify-center rounded-full bg-[#502883] p-2 text-white shadow-md hover:bg-[#402069] transition-colors"
                      >
                        <ArrowRight size={20} />
                      </a>
                    )}

                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={alt}
                        className="absolute bottom-[-25px] right-[-25px] scale-90 origin-bottom-right object-contain pointer-events-none"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-300 uppercase tracking-wide">
                        No Image
                      </div>
                    )}
                  </div>
                </div>
              );

              if (cta) {
                return (
                  <a
                    key={banner.id}
                    href={cta.href}
                    target={cta.target}
                    rel={cta.rel}
                    className={`relative block w-full aspect-square rounded-2xl bg-white shadow-md hover:shadow-lg transition ${cardClassName ?? ''}`}
                  >
                    {content}
                  </a>
                );
              }

              return (
                <div
                  key={banner.id}
                  className={`relative w-full aspect-square rounded-2xl bg-white shadow-md hover:shadow-lg transition ${cardClassName ?? ''}`}
                >
                  {content}
                </div>
              );
            }

            // === STACKED VARIANT ===
            return (
              <div
                key={banner.id}
                className={`flex flex-col items-center sm:items-start text-center sm:text-left rounded-2xl p-5 sm:p-6 transition-shadow duration-300 hover:shadow-xl bg-white ${cardClassName ?? ''}`}
              >
                <div className="relative w-full aspect-square flex items-center justify-center">
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt={alt}
                      className="absolute inset-0 w-full h-full object-contain drop-shadow-md"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                        const fallback = event.currentTarget
                          .nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center text-xs text-gray-400 uppercase tracking-wide"
                    style={{ display: imageSrc ? 'none' : 'flex' }}
                  >
                    Image Coming Soon
                  </div>
                </div>

                <h3 className="mt-5 font-semibold text-lg text-gray-900">{title}</h3>
                <p className="mt-2 text-sm text-gray-500">{description}</p>
                {cta && (
                  <a
                    href={cta.href}
                    target={cta.target}
                    rel={cta.rel}
                    className="mt-4 inline-flex items-center justify-center rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
                  >
                    {cta.label}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CategoryCardGrid;
