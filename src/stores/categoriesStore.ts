import { create } from 'zustand';
import { CategoryModel } from '../firestore';
import type { CategoryCreateInput, CategorySchema, CategoryUpdateInput } from '../schemas/CategorySchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { useToastStore } from './toastStore';

interface CategoriesState {
  categories: CategorySchema[];
  categoryOptions: CategorySchema[];
  loading: boolean;
  optionsLoading: boolean;
  optionsLoaded: boolean;
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
  loadCategories: () => Promise<void>;
  refresh: () => Promise<void>;
  loadCategoryOptions: (force?: boolean) => Promise<void>;
  createCategory: (input: CategoryCreateInput) => Promise<string | null>;
  updateCategory: (id: string, input: CategoryUpdateInput) => Promise<boolean>;
  deleteCategory: (id: string, name?: string) => Promise<boolean>;
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  categories: [],
  categoryOptions: [],
  loading: false,
  optionsLoading: false,
  optionsLoaded: false,
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
      const { data, total } = await CategoryModel.searchPaginated(
        {
          pageNumber: resolvedPageNumber,
          pageSize: resolvedPageSize,
        },
        resolvedSearch,
      );
      set({
        categories: data,
        totalItems: total,
        loading: false,
        currentPage: resolvedPageNumber,
        currentPageSize: resolvedPageSize,
        currentSearch: resolvedSearch,
      });
    } catch (error) {
      useToastStore.getState().addToast('Failed to load categories: ' + (error as Error).message, 'error');
      set({ loading: false });
    }
  },

  loadCategories: async () => {
    await get().paginatedData({});
  },

  refresh: async () => {
    const { currentPage, currentPageSize, currentSearch } = get();
    await get().paginatedData({ pageNumber: currentPage, pageSize: currentPageSize, search: currentSearch });
  },

  loadCategoryOptions: async (force = false) => {
    if (get().optionsLoading || (!force && get().optionsLoaded)) {
      return;
    }
    set({ optionsLoading: true });
    try {
      let pageNumber = 1;
      let hasMore = true;
      const collected: CategorySchema[] = [];

      while (hasMore) {
        const { data, total } = await CategoryModel.searchPaginated(
          { pageNumber, pageSize: 100 },
          null,
        );
        collected.push(...data);
        const retrieved = pageNumber * 100;
        hasMore = data.length > 0 && retrieved < total;
        pageNumber += 1;
      }

      set({ categoryOptions: collected, optionsLoaded: true, optionsLoading: false });
    } catch (error) {
      useToastStore.getState().addToast('Failed to load categories: ' + (error as Error).message, 'error');
      set({ optionsLoading: false });
    }
  },

  createCategory: async (input) => {
    set({ creating: true });
    try {
      const id = await CategoryModel.create(input);
      useToastStore.getState().addToast(`Category "${input.name}" created`, 'success');
      const { currentPage, currentPageSize, currentSearch } = get();
      await get().paginatedData({ pageNumber: currentPage, pageSize: currentPageSize, search: currentSearch });
      set({ optionsLoaded: false });
      return id;
    } catch (error) {
      useToastStore.getState().addToast('Failed to create category: ' + (error as Error).message, 'error');
      return null;
    } finally {
      set({ creating: false });
    }
  },

  updateCategory: async (id, input) => {
    set({ updatingId: id });
    try {
      await CategoryModel.update(id, input);
      useToastStore.getState().addToast('Category updated', 'success');
      const { currentPage, currentPageSize, currentSearch } = get();
      await get().paginatedData({ pageNumber: currentPage, pageSize: currentPageSize, search: currentSearch });
      set({ optionsLoaded: false });
      return true;
    } catch (error) {
      useToastStore.getState().addToast('Failed to update category: ' + (error as Error).message, 'error');
      return false;
    } finally {
      set({ updatingId: null });
    }
  },

  deleteCategory: async (id, name) => {
    set({ deletingId: id });
    try {
      await CategoryModel.delete(id);
      useToastStore.getState().addToast(`Category "${name ?? ''}" deleted`, 'success');
      const { currentPage, currentPageSize, currentSearch } = get();
      await get().paginatedData({ pageNumber: currentPage, pageSize: currentPageSize, search: currentSearch });
      set({ optionsLoaded: false });
      return true;
    } catch (error) {
      useToastStore.getState().addToast('Failed to delete category: ' + (error as Error).message, 'error');
      return false;
    } finally {
      set({ deletingId: null });
    }
  },
}));
