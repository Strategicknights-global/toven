export const BANNER_PLACEMENT_OPTIONS = [
  {
    value: 'home',
    label: 'Home',
    sectionTitle: 'Home Banners',
    description: 'Hero visuals for the main landing page carousel.',
  },
  {
    value: 'packages',
    label: 'Packages',
    sectionTitle: 'Package Banners',
    description: 'Promotional creatives for package listings.',
  },
  {
    value: 'home-meal',
    label: 'Home Meal',
    sectionTitle: 'Home Meal Banners',
    description: 'Lifestyle imagery for everyday meal plans.',
  },
  {
    value: 'home-categories',
    label: 'Home Categories',
    sectionTitle: 'Landing Category Cards',
    description: 'Cards powering the landing page product category grid.',
  },
  {
    value: 'diet-meal',
    label: 'Diet Meal',
    sectionTitle: 'Diet Meal Banners',
    description: 'Healthy eating visuals for diet-focused plans.',
  },
  {
    value: 'subscription',
    label: 'Subscription',
    sectionTitle: 'Subscription Banners',
    description: 'Graphics used on subscription information pages.',
  },
  {
    value: 'addons',
    label: 'Add-ons',
    sectionTitle: 'Addon Banners',
    description: 'Highlight add-on offerings inside the public catalogue.',
  },
  {
    value: 'party-orders',
    label: 'Party Orders',
    sectionTitle: 'Party Banners',
    description: 'Event catering highlights for party order promotions.',
  },
  {
    value: 'about',
    label: 'About',
    sectionTitle: 'About Page Banners',
    description: 'Brand storytelling visuals for the about page.',
  },
  {
    value: 'contact',
    label: 'Contact',
    sectionTitle: 'Contact Page Banners',
    description: 'Support and outreach visuals for the contact page.',
  },
] as const;

export type BannerPlacement = typeof BANNER_PLACEMENT_OPTIONS[number]['value'];

export interface BannerSchema {
  id: string;
  placement: BannerPlacement;
  fileName: string;
  title?: string | null;
  description?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  imageBase64?: string | null;
  imageUrl?: string | null;
  sortOrder?: number | null;
  isActive?: boolean | null;
  createdAt?: Date;
  updatedAt?: Date;

  // ✅ Fix: Added customData field for CategoryCardGrid compatibility
  customData?: {
    discount?: string; // e.g. "20% OFF"
    [key: string]: any; // allows flexible custom fields for future use
  };
}

export interface BannerCreateInput {
  placement: BannerPlacement;
  fileName: string;
  imageBase64?: string | null;
  imageUrl?: string | null;
  title?: string | null;
  description?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  sortOrder?: number | null;
  isActive?: boolean | null;

  // ✅ Optional when creating banners
  customData?: {
    discount?: string;
    [key: string]: any;
  };
}

export type BannerUpdateInput = Partial<BannerCreateInput>;

export const isBannerPlacement = (value: unknown): value is BannerPlacement =>
  typeof value === 'string' &&
  BANNER_PLACEMENT_OPTIONS.some((option) => option.value === value);

export const getBannerPlacementMeta = (placement: BannerPlacement) =>
  BANNER_PLACEMENT_OPTIONS.find((option) => option.value === placement) ??
  BANNER_PLACEMENT_OPTIONS[0];
