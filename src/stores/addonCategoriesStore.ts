import { create } from 'zustand';
import { AddonCategoryModel } from '../firestore';
import type {
  AddonCategoryCreateInput,
  AddonCategorySchema,
  AddonCategoryUpdateInput,
} from '../schemas/AddonCategorySchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { useToastStore } from './toastStore';

interface AddonCategoriesState {
  addonCategories: AddonCategorySchema[];
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
  loadAddonCategories: () => Promise<void>;
  refresh: () => Promise<void>;
  createAddonCategory: (input: AddonCategoryCreateInput) => Promise<string | null>;
  updateAddonCategory: (id: string, input: AddonCategoryUpdateInput) => Promise<boolean>;
  deleteAddonCategory: (id: string, name?: string) => Promise<boolean>;
}

export const useAddonCategoriesStore = create<AddonCategoriesState>((set, get) => ({
  addonCategories: [],
  loading: false,
  totalItems: null,
  creating: false,
  updatingId: null,
  deletingId: null,

  paginatedData: async (options) => {
    set({ loading: true });
    try {
      const { data, total } = await AddonCategoryModel.searchPaginated(
        { 
          pageNumber: options.pageNumber || 1, 
          pageSize: options.pageSize || 1000 
        },
        options.search || null
      );
      set({ addonCategories: data, totalItems: total, loading: false });
    } catch (error) {
      useToastStore.getState().addToast('Failed to load addon categories: ' + (error as Error).message, 'error');
      set({ loading: false });
    }
  },

  loadAddonCategories: async () => {
    await get().paginatedData({});
  },

  refresh: async () => {
    try {
      await get().paginatedData({});
    } catch {
      // paginatedData handles toast
    }
  },

  createAddonCategory: async (input) => {
    set({ creating: true });
    try {
      const id = await AddonCategoryModel.create(input);
      useToastStore.getState().addToast(`Addon category "${input.name}" created`, 'success');
      await get().refresh();
      return id;
    } catch (error) {
      useToastStore.getState().addToast('Failed to create addon category: ' + (error as Error).message, 'error');
      return null;
    } finally {
      set({ creating: false });
    }
  },

  updateAddonCategory: async (id, input) => {
    set({ updatingId: id });
    try {
      await AddonCategoryModel.update(id, input);
      useToastStore.getState().addToast('Addon category updated', 'success');
      await get().refresh();
      return true;
    } catch (error) {
      useToastStore.getState().addToast('Failed to update addon category: ' + (error as Error).message, 'error');
      return false;
    } finally {
      set({ updatingId: null });
    }
  },

  deleteAddonCategory: async (id, name) => {
    set({ deletingId: id });
    try {
      await AddonCategoryModel.delete(id);
      useToastStore.getState().addToast(`Addon category "${name ?? ''}" deleted`, 'success');
      await get().refresh();
      return true;
    } catch (error) {
      useToastStore.getState().addToast('Failed to delete addon category: ' + (error as Error).message, 'error');
      return false;
    } finally {
      set({ deletingId: null });
    }
  },
}));
