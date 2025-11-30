import { create } from 'zustand';
import { GrnModel, ProductModel } from '../firestore';
import type { GrnCreateInput, GrnSchema } from '../schemas/GRNSchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { useToastStore } from './toastStore';

interface GrnState {
  grns: GrnSchema[];
  loading: boolean;
  totalItems: number | null;
  creating: boolean;
  deletingId: string | null;
  paginatedData: (options: {
    pageNumber?: number;
    pageSize?: number;
    search?: SearchParams | null;
  }) => Promise<void>;
  loadGrns: () => Promise<void>;
  refreshGrns: () => Promise<void>;
  createGrn: (input: GrnCreateInput) => Promise<string | null>;
  deleteGrn: (id: string) => Promise<boolean>;
}

export const useGrnStore = create<GrnState>((set, get) => ({
  grns: [],
  loading: false,
  totalItems: null,
  creating: false,
  deletingId: null,

  paginatedData: async (options) => {
    set({ loading: true });
    try {
      const { data, total } = await GrnModel.searchPaginated(
        { 
          pageNumber: options.pageNumber || 1, 
          pageSize: options.pageSize || 1000 
        },
        options.search || null
      );
      set({ grns: data, totalItems: total, loading: false });
    } catch (error) {
      useToastStore.getState().addToast('Failed to load GRNs: ' + (error as Error).message, 'error');
      set({ loading: false });
    }
  },

  loadGrns: async () => {
    await get().paginatedData({});
  },

  refreshGrns: async () => {
    try {
      await get().paginatedData({});
    } catch {
      // handled in paginatedData
    }
  },

  createGrn: async (input) => {
    set({ creating: true });
    try {
      const id = await GrnModel.create(input);
      await ProductModel.adjustStock(input.productId, input.quantity);
      useToastStore.getState().addToast('GRN recorded and stock updated.', 'success');
      await get().refreshGrns();
      return id;
    } catch (error) {
      useToastStore.getState().addToast('Failed to create GRN: ' + (error as Error).message, 'error');
      return null;
    } finally {
      set({ creating: false });
    }
  },

  deleteGrn: async (id) => {
    set({ deletingId: id });
    try {
      const existing = get().grns.find((record) => record.id === id) ?? (await GrnModel.findById(id));
      await GrnModel.delete(id);
      if (existing) {
        await ProductModel.adjustStock(existing.productId, -existing.quantity);
      }
      useToastStore.getState().addToast('GRN deleted.', 'success');
      await get().refreshGrns();
      return true;
    } catch (error) {
      useToastStore.getState().addToast('Failed to delete GRN: ' + (error as Error).message, 'error');
      return false;
    } finally {
      set({ deletingId: null });
    }
  },
}));
