import { create } from 'zustand';
import { CoinRequestModel } from '../firestore';
import type {
  CoinRequestCreateInput,
  CoinRequestSchema,
  CoinRequestStatusUpdateInput,
} from '../schemas/CoinRequestSchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { useToastStore } from './toastStore';

interface CoinRequestsState {
  requests: CoinRequestSchema[];
  loading: boolean;
  totalItems: number | null;
  submitting: boolean;
  updatingId: string | null;
  currentPage: number;
  currentPageSize: number;
  currentSearch: SearchParams | null;
  paginatedData: (options: {
    pageNumber?: number;
    pageSize?: number;
    search?: SearchParams | null;
  }) => Promise<void>;
  loadRequests: () => Promise<void>;
  loadUserRequests: (userId: string, options?: { pageNumber?: number; pageSize?: number }) => Promise<void>;
  refresh: () => Promise<void>;
  createRequest: (input: CoinRequestCreateInput) => Promise<CoinRequestSchema | null>;
  updateStatus: (id: string, input: CoinRequestStatusUpdateInput) => Promise<CoinRequestSchema | null>;
}

export const useCoinRequestsStore = create<CoinRequestsState>((set, get) => ({
  requests: [],
  loading: false,
  totalItems: null,
  submitting: false,
  updatingId: null,
  currentPage: 1,
  currentPageSize: 1000,
  currentSearch: null,

  paginatedData: async (options = {}) => {
    const state = get();
    const resolvedPageNumber = options.pageNumber ?? state.currentPage ?? 1;
    const resolvedPageSize = options.pageSize ?? state.currentPageSize ?? 10;
    const resolvedSearch = options.search ?? state.currentSearch ?? null;

    set({ loading: true });
    try {
      const { data, total } = await CoinRequestModel.searchPaginated(
        {
          pageNumber: resolvedPageNumber,
          pageSize: resolvedPageSize,
        },
        resolvedSearch
      );
      set({
        requests: data,
        totalItems: total,
        loading: false,
        currentPage: resolvedPageNumber,
        currentPageSize: resolvedPageSize,
        currentSearch: resolvedSearch,
      });
    } catch (error) {
      console.error('Failed to load coin requests', error);
      useToastStore.getState().addToast('Failed to load coin requests: ' + (error as Error).message, 'error');
      set({ loading: false });
    }
  },

  loadRequests: async () => {
    await get().paginatedData({});
  },

  loadUserRequests: async (userId: string, options) => {
    set({ loading: true });
    try {
      const pageNumber = options?.pageNumber ?? 1;
      const pageSize = options?.pageSize ?? 25;
      const search: SearchParams = { field: 'userId', value: userId, type: 'text' };
      const { data, total } = await CoinRequestModel.searchPaginated(
        { pageNumber, pageSize },
        search,
      );
      set({
        requests: data,
        totalItems: total,
        loading: false,
        currentPage: pageNumber,
        currentPageSize: pageSize,
        currentSearch: search,
      });
    } catch (error) {
      console.error('Failed to load user coin requests', error);
      useToastStore.getState().addToast('Failed to load your coin requests: ' + (error as Error).message, 'error');
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  refresh: async () => {
    const { currentPage, currentPageSize, currentSearch } = get();
    await get().paginatedData({
      pageNumber: currentPage,
      pageSize: currentPageSize,
      search: currentSearch,
    });
  },

  createRequest: async (input) => {
    if (get().submitting) {
      return null;
    }

    set({ submitting: true });
    try {
      const id = await CoinRequestModel.create(input);
      const created = await CoinRequestModel.findById(id);
      if (created) {
        set((state) => ({
          requests: [created, ...state.requests],
          totalItems: state.totalItems != null ? state.totalItems + 1 : state.totalItems,
        }));
      }
      useToastStore.getState().addToast('Coin request submitted for review.', 'success');
      return created ?? null;
    } catch (error) {
      console.error('Failed to create coin request', error);
      useToastStore.getState().addToast('Failed to submit coin request: ' + (error as Error).message, 'error');
      throw error;
    } finally {
      set({ submitting: false });
    }
  },

  updateStatus: async (id, input) => {
    set({ updatingId: id });
    try {
      await CoinRequestModel.updateStatus(id, input);
      const updated = await CoinRequestModel.findById(id);
      if (updated) {
        set((state) => ({
          requests: state.requests.map((request) => (request.id === id ? updated : request)),
        }));
        const verb = input.status === 'approved' ? 'approved' : input.status === 'rejected' ? 'rejected' : 'updated';
        useToastStore.getState().addToast(`Coin request ${verb}.`, 'success');
        return updated;
      }
      useToastStore.getState().addToast('Coin request updated.', 'success');
      return null;
    } catch (error) {
      console.error('Failed to update coin request status', error);
      useToastStore.getState().addToast('Failed to update coin request: ' + (error as Error).message, 'error');
      throw error;
    } finally {
      set({ updatingId: null });
    }
  },
}));
