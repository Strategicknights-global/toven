import React from 'react';
import { ArrowRight } from 'lucide-react';
import { usePlacementBanners } from '../stores/publicBannersStore';
import type { BannerPlacement, BannerSchema } from '../schemas/BannerSchema';
import { getBannerAlt, getBannerImageSrc } from '../utils/bannerUtils';

interface AboutUsCardsProps {
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

const AboutUsCards: React.FC<AboutUsCardsProps> = ({
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
            'grid w-full gap-6 sm:gap-8 justify-items-center sm:justify-items-start place-content-center sm:place-content-start';

        // ✅ Always 2 columns on mobile when mobileColumns = 2
        const mobile =
            mobileColumns === 2 ? 'grid-cols-2' : 'grid-cols-1';

        if (bannerCount <= 1) return `${base} ${mobile}`;
        if (bannerCount === 2) return `${base} ${mobile} sm:grid-cols-2`;
        if (bannerCount === 3) return `${base} ${mobile} sm:grid-cols-2 lg:grid-cols-3`;
        return `${base} ${mobile} sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;
    }, [bannerCount, mobileColumns]);


    // LOADING SKELETON
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
            <div className="w-full text-center sm:text-left">
                <div className={gridClassName}>

                    {banners.map((banner) => {
                        const imageSrc = getBannerImageSrc(banner);
                        const alt = getBannerAlt(banner, 'Landing category banner');
                        const title = getCardTitle(banner);
                        const description = getCardDescription(banner);
                        const cta = getCardCta(banner);

                        /**
                         * 🔥 PERFECT SQUARE PROMO TILE (FIXED MOBILE STRETCH)
                         */
                        if (variant === 'promoTile') {
                            return (
                                <div
                                    key={banner.id}
                                    className={`relative flex flex-col items-center justify-between rounded-2xl shadow-md hover:shadow-lg transition p-5 aspect-square w-full max-w-[220px] sm:max-w-none ${cardClassName ?? ''}`}
                                    style={{ backgroundColor: '#510088' }}
                                >
                                    {/* Center Section */}
                                    <div className="flex flex-col items-center">
                                        {imageSrc ? (
                                            <img
                                                src={imageSrc}
                                                alt={alt}
                                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shadow-sm"
                                            />
                                        ) : (
                                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-200"></div>
                                        )}

                                        <h3 className="mt-3 sm:mt-4 text-lg sm:text-xl font-semibold text-white">
                                            {title}
                                        </h3>

                                        {description && (
                                            <p className="text-xs sm:text-sm text-gray-200 mt-1">
                                                {description}
                                            </p>
                                        )}
                                    </div>

                                    {/* CTA Button */}
                                    {cta && (
                                        <a
                                            href={cta.href}
                                            target={cta.target}
                                            rel={cta.rel}
                                            className="mt-3 sm:mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-[#510088] shadow hover:bg-gray-100 transition"
                                        >
                                            {cta.label}
                                            <ArrowRight size={14} />
                                        </a>
                                    )}
                                </div>
                            );
                        }

                        /**
                         * STACKED VARIANT
                         */
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
                                                const fallback =
                                                    event.currentTarget.nextElementSibling as HTMLElement | null;
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

                                <h3 className="mt-5 font-semibold text-lg text-gray-900">
                                    {title}
                                </h3>

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

export default AboutUsCards;
