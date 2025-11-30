import { create } from 'zustand';
import { FoodItemModel } from '../firestore';
import type { FoodItemCreateInput, FoodItemSchema, FoodItemUpdateInput } from '../schemas/FoodItemSchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { useToastStore } from './toastStore';

interface FoodItemsState {
  items: FoodItemSchema[];
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
  loadItems: () => Promise<void>;
  refresh: () => Promise<void>;
  createItem: (input: FoodItemCreateInput) => Promise<string | null>;
  updateItem: (id: string, input: FoodItemUpdateInput) => Promise<boolean>;
  deleteItem: (id: string, name?: string) => Promise<boolean>;
}

export const useFoodItemsStore = create<FoodItemsState>((set, get) => ({
  items: [],
  loading: false,
  totalItems: null,
  creating: false,
  updatingId: null,
  deletingId: null,

  paginatedData: async (options) => {
    set({ loading: true });
    try {
      const { data, total } = await FoodItemModel.searchPaginated(
        { 
          pageNumber: options.pageNumber || 1, 
          pageSize: options.pageSize || 1000 
        },
        options.search || null
      );
      set({ items: data, totalItems: total, loading: false });
    } catch (error) {
      useToastStore.getState().addToast('Failed to load food items: ' + (error as Error).message, 'error');
      set({ loading: false });
    }
  },

  loadItems: async () => {
    await get().paginatedData({});
  },

  refresh: async () => {
    try {
      await get().paginatedData({});
    } catch {
      // load handles toast
    }
  },

  createItem: async (input) => {
    set({ creating: true });
    try {
      const id = await FoodItemModel.create(input);
      useToastStore.getState().addToast(`Food item "${input.name}" created`, 'success');
      await get().refresh();
      return id;
    } catch (error) {
      useToastStore.getState().addToast('Failed to create food item: ' + (error as Error).message, 'error');
      return null;
    } finally {
      set({ creating: false });
    }
  },

  updateItem: async (id, input) => {
    set({ updatingId: id });
    try {
      await FoodItemModel.update(id, input);
      useToastStore.getState().addToast(`Food item updated`, 'success');
      await get().refresh();
      return true;
    } catch (error) {
      useToastStore.getState().addToast('Failed to update food item: ' + (error as Error).message, 'error');
      return false;
    } finally {
      set({ updatingId: null });
    }
  },

  deleteItem: async (id, name) => {
    set({ deletingId: id });
    try {
      await FoodItemModel.delete(id);
      useToastStore.getState().addToast(`Food item "${name ?? ''}" deleted`, 'success');
      await get().refresh();
      return true;
    } catch (error) {
      useToastStore.getState().addToast('Failed to delete food item: ' + (error as Error).message, 'error');
      return false;
    } finally {
      set({ deletingId: null });
    }
  },
}));
