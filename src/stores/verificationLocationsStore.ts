import { create } from 'zustand';
import { VerificationLocationModel } from '../firestore';
import type {
  VerificationLocationCreateInput,
  VerificationLocationSchema,
  VerificationLocationUpdateInput,
} from '../schemas/VerificationLocationSchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { useToastStore } from './toastStore';

interface VerificationLocationsState {
  locations: VerificationLocationSchema[];
  loading: boolean;
  totalItems: number | null;
  currentPage: number;
  currentPageSize: number;
  currentSearch: SearchParams | null;
  creating: boolean;
  deleting: boolean;
  paginatedData: (options: {
    pageNumber?: number;
    pageSize?: number;
    search?: SearchParams | null;
  }) => Promise<void>;
  loadLocations: () => Promise<void>;
  createLocation: (input: VerificationLocationCreateInput) => Promise<string | undefined>;
  updateLocation: (id: string, input: VerificationLocationUpdateInput) => Promise<void>;
  deleteLocation: (id: string, name?: string) => Promise<void>;
}

export const useVerificationLocationsStore = create<VerificationLocationsState>((set, get) => ({
  locations: [],
  loading: false,
  totalItems: null,
  currentPage: 1,
  currentPageSize: 1000,
  currentSearch: null,
  creating: false,
  deleting: false,

  paginatedData: async (options = {}) => {
    const state = get();
    const resolvedPageNumber = options.pageNumber ?? state.currentPage ?? 1;
    const resolvedPageSize = options.pageSize ?? state.currentPageSize ?? 10;
    const resolvedSearch = options.search ?? state.currentSearch ?? null;

    set({ loading: true });
    try {
      const { data, total } = await VerificationLocationModel.searchPaginated(
        {
          pageNumber: resolvedPageNumber,
          pageSize: resolvedPageSize,
        },
        resolvedSearch,
      );
      set({
        locations: data,
        totalItems: total,
        loading: false,
        currentPage: resolvedPageNumber,
        currentPageSize: resolvedPageSize,
        currentSearch: resolvedSearch,
      });
    } catch (error) {
      useToastStore
        .getState()
        .addToast('Failed to load verification locations: ' + (error as Error).message, 'error');
      set({ loading: false });
    }
  },

  loadLocations: async () => {
    await get().paginatedData({});
  },

  createLocation: async (input: VerificationLocationCreateInput) => {
    set({ creating: true });
    try {
      const id = await VerificationLocationModel.create(input);
      useToastStore.getState().addToast('Verification location created successfully', 'success');
      const { currentPage, currentPageSize, currentSearch } = get();
      await get().paginatedData({ pageNumber: currentPage, pageSize: currentPageSize, search: currentSearch });
      return id;
    } catch (error) {
      useToastStore
        .getState()
        .addToast('Failed to create verification location: ' + (error as Error).message, 'error');
      throw error;
    } finally {
      set({ creating: false });
    }
  },

  updateLocation: async (id: string, input: VerificationLocationUpdateInput) => {
    try {
      await VerificationLocationModel.update(id, input);
      const { currentPage, currentPageSize, currentSearch } = get();
      await get().paginatedData({ pageNumber: currentPage, pageSize: currentPageSize, search: currentSearch });
    } catch (error) {
      useToastStore
        .getState()
        .addToast('Failed to update verification location: ' + (error as Error).message, 'error');
      throw error;
    }
  },

  deleteLocation: async (id: string, name?: string) => {
    set({ deleting: true });
    try {
      await VerificationLocationModel.delete(id);
      useToastStore
        .getState()
        .addToast(`Verification location${name ? ` '${name}'` : ''} deleted`, 'success');
      const { currentPage, currentPageSize, currentSearch } = get();
      await get().paginatedData({ pageNumber: currentPage, pageSize: currentPageSize, search: currentSearch });
    } catch (error) {
      useToastStore
        .getState()
        .addToast('Failed to delete verification location: ' + (error as Error).message, 'error');
      throw error;
    } finally {
      set({ deleting: false });
    }
  },
}));
