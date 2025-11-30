import { create } from 'zustand';
import { BannerModel } from '../firestore';
import type { BannerCreateInput, BannerSchema, BannerUpdateInput } from '../schemas/BannerSchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { useToastStore } from './toastStore';

interface BannersState {
  banners: BannerSchema[];
  loading: boolean;
  totalItems: number | null;
  creating: boolean;
  updatingId: string | null;
  deletingId: string | null;
  paginatedData: (options: {
    pageNumber?: number;
    pageSize?: number;
    search?: SearchParams | null;
  }) => Promise<void>;
  loadBanners: () => Promise<void>;
  refresh: () => Promise<void>;
  createBanner: (input: BannerCreateInput) => Promise<string | null>;
  updateBanner: (id: string, input: BannerUpdateInput) => Promise<boolean>;
  deleteBanner: (id: string, fileName?: string) => Promise<boolean>;
}

export const useBannersStore = create<BannersState>((set, get) => ({
  banners: [],
  loading: false,
  totalItems: null,
  creating: false,
  updatingId: null,
  deletingId: null,

  paginatedData: async (options) => {
    set({ loading: true });
    try {
      const { data, total } = await BannerModel.searchPaginated(
        { 
          pageNumber: options.pageNumber || 1, 
          pageSize: options.pageSize || 1000 
        },
        options.search || null
      );
      set({ banners: data, totalItems: total, loading: false });
    } catch (error) {
      useToastStore.getState().addToast('Failed to load banners: ' + (error as Error).message, 'error');
      set({ loading: false });
    }
  },

  loadBanners: async () => {
    await get().paginatedData({});
  },

  refresh: async () => {
    try {
      await get().paginatedData({});
    } catch {
      // paginatedData handles toast
    }
  },

  createBanner: async (input) => {
    set({ creating: true });
    try {
      const id = await BannerModel.create(input);
      useToastStore.getState().addToast('Banner uploaded successfully', 'success');
      await get().refresh();
      return id;
    } catch (error) {
      useToastStore.getState().addToast('Failed to create banner: ' + (error as Error).message, 'error');
      return null;
    } finally {
      set({ creating: false });
    }
  },

  updateBanner: async (id, input) => {
    set({ updatingId: id });
    try {
      await BannerModel.update(id, input);
      useToastStore.getState().addToast('Banner updated', 'success');
      await get().refresh();
      return true;
    } catch (error) {
      useToastStore.getState().addToast('Failed to update banner: ' + (error as Error).message, 'error');
      return false;
    } finally {
      set({ updatingId: null });
    }
  },

  deleteBanner: async (id, fileName) => {
    set({ deletingId: id });
    try {
      await BannerModel.delete(id);
      const label = fileName ? `"${fileName}" ` : '';
      useToastStore.getState().addToast(`Banner ${label}deleted`, 'success');
      await get().refresh();
      return true;
    } catch (error) {
      useToastStore.getState().addToast('Failed to delete banner: ' + (error as Error).message, 'error');
      return false;
    } finally {
      set({ deletingId: null });
    }
  },
}));
