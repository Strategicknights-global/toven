import { create } from 'zustand';
import { ProductModel } from '../firestore';
import type { ProductCreateInput, ProductSchema, ProductUpdateInput } from '../schemas/ProductSchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { useToastStore } from './toastStore';

interface ProductsState {
  products: ProductSchema[];
  productOptions: ProductSchema[];
  loading: boolean;
  optionsLoading: boolean;
  optionsLoaded: boolean;
  totalItems: number | null;
  currentPage: number;
  currentPageSize: number;
  currentSearch: SearchParams | null;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  paginatedData: (options: {
    pageNumber?: number;
    pageSize?: number;
    search?: SearchParams | null;
  }) => Promise<void>;
  loadProducts: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  loadProductOptions: (force?: boolean) => Promise<void>;
  createProduct: (input: ProductCreateInput) => Promise<string>;
  updateProduct: (id: string, input: ProductUpdateInput) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  productOptions: [],
  loading: false,
  optionsLoading: false,
  optionsLoaded: false,
  totalItems: null,
  currentPage: 1,
  currentPageSize: 1000,
  currentSearch: null,
  creating: false,
  updating: false,
  deleting: false,

  paginatedData: async (options = {}) => {
    const state = get();
    const resolvedPageNumber = options.pageNumber ?? state.currentPage ?? 1;
    const resolvedPageSize = options.pageSize ?? state.currentPageSize ?? 10;
    const resolvedSearch = options.search ?? state.currentSearch ?? null;

    set({ loading: true });
    try {
      const { data, total } = await ProductModel.searchPaginated(
        {
          pageNumber: resolvedPageNumber,
          pageSize: resolvedPageSize,
        },
        resolvedSearch,
      );
      set({
        products: data,
        totalItems: total,
        loading: false,
        currentPage: resolvedPageNumber,
        currentPageSize: resolvedPageSize,
        currentSearch: resolvedSearch,
      });
    } catch (error) {
      useToastStore.getState().addToast('Failed to load products: ' + (error as Error).message, 'error');
      set({ loading: false });
    }
  },

  loadProducts: async () => {
    await get().paginatedData({});
  },

  refreshProducts: async () => {
    const { currentPage, currentPageSize, currentSearch } = get();
    await get().paginatedData({ pageNumber: currentPage, pageSize: currentPageSize, search: currentSearch });
  },

  loadProductOptions: async (force = false) => {
    if (get().optionsLoading || (!force && get().optionsLoaded)) {
      return;
    }
    set({ optionsLoading: true });
    try {
      let pageNumber = 1;
      let hasMore = true;
      const collected: ProductSchema[] = [];

      while (hasMore) {
        const { data, total } = await ProductModel.searchPaginated(
          { pageNumber, pageSize: 100 },
          null,
        );
        collected.push(...data);
        const retrieved = pageNumber * 100;
        hasMore = data.length > 0 && retrieved < total;
        pageNumber += 1;
      }

      set({ productOptions: collected, optionsLoaded: true, optionsLoading: false });
    } catch (error) {
      useToastStore.getState().addToast('Failed to load products: ' + (error as Error).message, 'error');
      set({ optionsLoading: false });
    }
  },

  createProduct: async (input) => {
    set({ creating: true });
    try {
      const id = await ProductModel.create(input);
      const { currentPage, currentPageSize, currentSearch } = get();
      await get().paginatedData({ pageNumber: currentPage, pageSize: currentPageSize, search: currentSearch });
      set({ optionsLoaded: false });
      return id;
    } catch (error) {
      useToastStore.getState().addToast('Failed to create product: ' + (error as Error).message, 'error');
      throw error;
    } finally {
      set({ creating: false });
    }
  },

  updateProduct: async (id, input) => {
    set({ updating: true });
    try {
      await ProductModel.update(id, input);
      const { currentPage, currentPageSize, currentSearch } = get();
      await get().paginatedData({ pageNumber: currentPage, pageSize: currentPageSize, search: currentSearch });
      set({ optionsLoaded: false });
    } catch (error) {
      useToastStore.getState().addToast('Failed to update product: ' + (error as Error).message, 'error');
      throw error;
    } finally {
      set({ updating: false });
    }
  },

  deleteProduct: async (id) => {
    set({ deleting: true });
    try {
      await ProductModel.delete(id);
      const { currentPage, currentPageSize, currentSearch } = get();
      await get().paginatedData({ pageNumber: currentPage, pageSize: currentPageSize, search: currentSearch });
      set({ optionsLoaded: false });
    } catch (error) {
      useToastStore.getState().addToast('Failed to delete product: ' + (error as Error).message, 'error');
      throw error;
    } finally {
      set({ deleting: false });
    }
  },
}));
