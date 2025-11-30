import { create } from 'zustand';
import { DayDiscountModel } from '../firestore';
import type {
  DayDiscountCreateInput,
  DayDiscountSchema,
  DayDiscountUpdateInput,
} from '../schemas/DayDiscountSchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { useToastStore } from './toastStore';

interface DayDiscountsState {
  discounts: DayDiscountSchema[];
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
  loadDiscounts: () => Promise<void>;
  refresh: () => Promise<void>;
  createDiscount: (input: DayDiscountCreateInput) => Promise<string | null>;
  updateDiscount: (id: string, input: DayDiscountUpdateInput) => Promise<boolean>;
  deleteDiscount: (id: string, label?: string) => Promise<boolean>;
}

export const useDayDiscountsStore = create<DayDiscountsState>((set, get) => ({
  discounts: [],
  loading: false,
  totalItems: null,
  creating: false,
  updatingId: null,
  deletingId: null,

  paginatedData: async (options) => {
    set({ loading: true });
    try {
      const { data, total } = await DayDiscountModel.searchPaginated(
        { 
          pageNumber: options.pageNumber || 1, 
          pageSize: options.pageSize || 1000 
        },
        options.search || null
      );
      set({ discounts: data, totalItems: total, loading: false });
    } catch (error) {
      useToastStore.getState().addToast('Failed to load discounts: ' + (error as Error).message, 'error');
      set({ loading: false });
    }
  },

  loadDiscounts: async () => {
    await get().paginatedData({});
  },

  refresh: async () => {
    try {
      await get().paginatedData({});
    } catch {
      // paginatedData handles toast notification
    }
  },

  createDiscount: async (input) => {
    set({ creating: true });
    try {
      const id = await DayDiscountModel.create(input);
      useToastStore.getState().addToast(`Discount "${input.label}" created`, 'success');
      await get().refresh();
      return id;
    } catch (error) {
      useToastStore.getState().addToast('Failed to create discount: ' + (error as Error).message, 'error');
      return null;
    } finally {
      set({ creating: false });
    }
  },

  updateDiscount: async (id, input) => {
    set({ updatingId: id });
    try {
      await DayDiscountModel.update(id, input);
      useToastStore.getState().addToast('Discount updated', 'success');
      await get().refresh();
      return true;
    } catch (error) {
      useToastStore.getState().addToast('Failed to update discount: ' + (error as Error).message, 'error');
      return false;
    } finally {
      set({ updatingId: null });
    }
  },

  deleteDiscount: async (id, label) => {
    set({ deletingId: id });
    try {
      await DayDiscountModel.delete(id);
      const namePart = label ? ` "${label}"` : '';
      useToastStore.getState().addToast(`Discount${namePart} deleted`, 'success');
      await get().refresh();
      return true;
    } catch (error) {
      useToastStore.getState().addToast('Failed to delete discount: ' + (error as Error).message, 'error');
      return false;
    } finally {
      set({ deletingId: null });
    }
  },
}));
