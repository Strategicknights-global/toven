import { create } from 'zustand';
import { WalletModel } from '../firestore';
import type { WalletSchema } from '../schemas/WalletSchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { useToastStore } from './toastStore';

interface WalletsState {
  wallets: WalletSchema[];
  loading: boolean;
  totalItems: number | null;
  currentPage: number;
  currentPageSize: number;
  currentSearch: SearchParams | null;
  paginatedData: (options: {
    pageNumber?: number;
    pageSize?: number;
    search?: SearchParams | null;
  }) => Promise<void>;
  loadWallets: () => Promise<void>;
  refreshWallets: () => Promise<void>;
}

export const useWalletsStore = create<WalletsState>((set, get) => ({
  wallets: [],
  loading: false,
  totalItems: null,
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
      const { data, total } = await WalletModel.searchPaginated(
        {
          pageNumber: resolvedPageNumber,
          pageSize: resolvedPageSize,
        },
        resolvedSearch
      );
      set({
        wallets: data,
        totalItems: total,
        loading: false,
        currentPage: resolvedPageNumber,
        currentPageSize: resolvedPageSize,
        currentSearch: resolvedSearch,
      });
    } catch (error) {
      useToastStore.getState().addToast('Failed to load wallets: ' + (error as Error).message, 'error');
      set({ loading: false });
    }
  },

  loadWallets: async () => {
    await get().paginatedData({});
  },

  refreshWallets: async () => {
    await get().paginatedData({});
  },
}));
