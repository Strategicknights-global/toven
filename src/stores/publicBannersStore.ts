import { useCallback, useEffect } from 'react';
import { create } from 'zustand';
import type { BannerPlacement, BannerSchema } from '../schemas/BannerSchema';
import { BannerModel } from '../firestore';

type PlacementState = {
  banners: BannerSchema[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
};

interface PublicBannersState {
  placements: Partial<Record<BannerPlacement, PlacementState>>;
  loadPlacement: (placement: BannerPlacement, options?: { force?: boolean }) => Promise<BannerSchema[]>;
}

const INITIAL_PLACEMENT_STATE: PlacementState = {
  banners: [],
  loading: false,
  loaded: false,
  error: null,
};

const buildPlacementState = (overrides?: Partial<PlacementState>): PlacementState => ({
  ...INITIAL_PLACEMENT_STATE,
  ...overrides,
});

export const usePublicBannersStore = create<PublicBannersState>((set, get) => ({
  placements: {},
  loadPlacement: async (placement, options) => {
    const existing = get().placements[placement];
    if (!options?.force && existing?.loaded && !existing.error) {
      return existing.banners;
    }

    set((state) => ({
      placements: {
        ...state.placements,
        [placement]: buildPlacementState({
          ...existing,
          loading: true,
          error: null,
        }),
      },
    }));

    try {
      const banners = await BannerModel.findActiveByPlacement(placement);
      set((state) => ({
        placements: {
          ...state.placements,
          [placement]: buildPlacementState({
            banners,
            loading: false,
            loaded: true,
            error: null,
          }),
        },
      }));
      return banners;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load banners';
      set((state) => ({
        placements: {
          ...state.placements,
          [placement]: buildPlacementState({
            banners: [],
            loading: false,
            loaded: false,
            error: message,
          }),
        },
      }));
      throw error;
    }
  },
}));

export const usePlacementBanners = (placement: BannerPlacement, options?: { auto?: boolean }) => {
  const auto = options?.auto ?? true;
  const loadPlacement = usePublicBannersStore((state) => state.loadPlacement);
  const entry = usePublicBannersStore((state) => state.placements[placement] ?? INITIAL_PLACEMENT_STATE);

  useEffect(() => {
    if (!auto) {
      return;
    }
    if (!entry.loaded && !entry.loading) {
      void loadPlacement(placement);
    }
  }, [auto, entry.loaded, entry.loading, loadPlacement, placement]);

  const refresh = useCallback(() => loadPlacement(placement, { force: true }), [loadPlacement, placement]);

  return {
    banners: entry.banners,
    loading: entry.loading,
    loaded: entry.loaded,
    error: entry.error,
    refresh,
  } as const;
};
