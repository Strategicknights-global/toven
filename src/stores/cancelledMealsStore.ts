import { create } from 'zustand';
import { CancelledMealModel } from '../firestore';
import type { CancelledMealSchema } from '../schemas/CancelledMealSchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { useToastStore } from './toastStore';

interface CancelledMealsState {
  meals: CancelledMealSchema[];
  loading: boolean;
  totalItems: number | null;
  paginatedData: (options: {
    pageNumber?: number;
    pageSize?: number;
    search?: SearchParams | null;
  }) => Promise<void>;
  loadCancelledMeals: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useCancelledMealsStore = create<CancelledMealsState>((set, get) => ({
  meals: [],
  loading: false,
  totalItems: null,

  paginatedData: async (options) => {
    set({ loading: true });
    try {
      const { data, total } = await CancelledMealModel.searchPaginated(
        { 
          pageNumber: options.pageNumber || 1, 
          pageSize: options.pageSize || 1000 
        },
        options.search || null
      );
      set({ meals: data, totalItems: total, loading: false });
    } catch (error) {
      console.error('Failed to load cancelled subscriptions', error);
      useToastStore.getState().addToast('Failed to load cancelled subscriptions: ' + (error as Error).message, 'error');
      set({ loading: false });
    }
  },

  loadCancelledMeals: async () => {
    await get().paginatedData({});
  },

  refresh: async () => {
    try {
      await get().paginatedData({});
    } catch {
      // Already handled in paginatedData
    }
  },
}));
