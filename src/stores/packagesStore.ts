import { create } from 'zustand';
import { PackageModel } from '../firestore';
import type {
  PackageCreateInput,
  PackageSchema,
  PackageUpdateInput,
} from '../schemas/PackageSchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { useToastStore } from './toastStore';

interface PackagesState {
  packages: PackageSchema[];
  loading: boolean;
  totalItems: number | null;
  currentPage: number;
  currentPageSize: number;
  currentSearch: SearchParams | null;
  creating: boolean;
  updatingId: string | null;
  deletingId: string | null;
  paginatedData: (options: {
    pageNumber?: number;
    pageSize?: number;
    search?: SearchParams | null;
  }) => Promise<void>;
  loadPackages: () => Promise<void>;
  refresh: () => Promise<void>;
  createPackage: (input: PackageCreateInput) => Promise<string | null>;
  updatePackage: (id: string, input: PackageUpdateInput) => Promise<boolean>;
  deletePackage: (id: string, name?: string) => Promise<boolean>;
}

export const usePackagesStore = create<PackagesState>((set, get) => ({
  packages: [],
  loading: false,
  totalItems: null,
  currentPage: 1,
  currentPageSize: 1000,
  currentSearch: null,
  creating: false,
  updatingId: null,
  deletingId: null,

  paginatedData: async (options = {}) => {
    const state = get();
    const resolvedPageNumber = options.pageNumber ?? state.currentPage ?? 1;
    const resolvedPageSize = options.pageSize ?? state.currentPageSize ?? 10;
    const resolvedSearch = options.search ?? state.currentSearch ?? null;

    set({ loading: true });
    try {
      const { data, total } = await PackageModel.searchPaginated(
        {
          pageNumber: resolvedPageNumber,
          pageSize: resolvedPageSize,
        },
        resolvedSearch,
      );
      set({
        packages: data,
        totalItems: total,
        loading: false,
        currentPage: resolvedPageNumber,
        currentPageSize: resolvedPageSize,
        currentSearch: resolvedSearch,
      });
    } catch (error) {
      useToastStore.getState().addToast('Failed to load packages: ' + (error as Error).message, 'error');
      set({ loading: false });
    }
  },

  loadPackages: async () => {
    await get().paginatedData({});
  },

  refresh: async () => {
    const { currentPage, currentPageSize, currentSearch } = get();
    await get().paginatedData({ pageNumber: currentPage, pageSize: currentPageSize, search: currentSearch });
  },

  createPackage: async (input) => {
    set({ creating: true });
    try {
      const id = await PackageModel.create(input);
      useToastStore.getState().addToast(`Package "${input.name}" created`, 'success');
      const { currentPage, currentPageSize, currentSearch } = get();
      await get().paginatedData({ pageNumber: currentPage, pageSize: currentPageSize, search: currentSearch });
      return id;
    } catch (error) {
      useToastStore.getState().addToast('Failed to create package: ' + (error as Error).message, 'error');
      return null;
    } finally {
      set({ creating: false });
    }
  },

  updatePackage: async (id, input) => {
    set({ updatingId: id });
    try {
      await PackageModel.update(id, input);
      useToastStore.getState().addToast('Package updated', 'success');
      const { currentPage, currentPageSize, currentSearch } = get();
      await get().paginatedData({ pageNumber: currentPage, pageSize: currentPageSize, search: currentSearch });
      return true;
    } catch (error) {
      useToastStore.getState().addToast('Failed to update package: ' + (error as Error).message, 'error');
      return false;
    } finally {
      set({ updatingId: null });
    }
  },

  deletePackage: async (id, name) => {
    set({ deletingId: id });
    try {
      await PackageModel.delete(id);
      useToastStore.getState().addToast(`Package "${name ?? ''}" deleted`, 'success');
      const { currentPage, currentPageSize, currentSearch } = get();
      await get().paginatedData({ pageNumber: currentPage, pageSize: currentPageSize, search: currentSearch });
      return true;
    } catch (error) {
      useToastStore.getState().addToast('Failed to delete package: ' + (error as Error).message, 'error');
      return false;
    } finally {
      set({ deletingId: null });
    }
  },
}));
