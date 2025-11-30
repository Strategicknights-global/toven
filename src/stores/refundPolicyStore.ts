import { create } from 'zustand';
import { RefundPolicyModel } from '../firestore';
import type {
  RefundPolicySchema,
  RefundPolicyCreateInput,
  RefundPolicyUpdateInput,
} from '../schemas/RefundPolicySchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { useToastStore } from './toastStore';

interface RefundPolicyStoreState {
  policies: RefundPolicySchema[];
  loading: boolean;
  totalItems: number | null;
  initialized: boolean;
  error?: string;
  paginatedData: (options: {
    pageNumber?: number;
    pageSize?: number;
    search?: SearchParams | null;
  }) => Promise<void>;
  fetchPolicies: () => Promise<void>;
  getPolicyByDuration: (days: number) => RefundPolicySchema | undefined;
  createPolicy: (input: RefundPolicyCreateInput) => Promise<string | null>;
  updatePolicy: (id: string, input: RefundPolicyUpdateInput) => Promise<void>;
  deletePolicy: (id: string) => Promise<void>;
}

export const useRefundPolicyStore = create<RefundPolicyStoreState>((set, get) => ({
  policies: [],
  loading: false,
  totalItems: null,
  initialized: false,
  error: undefined,

  paginatedData: async (options) => {
    set({ loading: true, error: undefined });
    try {
      const { data, total } = await RefundPolicyModel.searchPaginated(
        { 
          pageNumber: options.pageNumber || 1, 
          pageSize: options.pageSize || 1000 
        },
        options.search || null
      );
      set({ policies: data, totalItems: total, loading: false, initialized: true });
    } catch (error) {
      useToastStore.getState().addToast('Failed to load refund policies: ' + (error as Error).message, 'error');
      set({ loading: false, error: (error as Error).message });
    }
  },

  fetchPolicies: async () => {
    await get().paginatedData({});
  },

  getPolicyByDuration: (days: number) => {
    const { policies } = get();
    return policies.find((policy) => policy.subscriptionLengthDays === days);
  },

  createPolicy: async (input: RefundPolicyCreateInput) => {
    try {
      const id = await RefundPolicyModel.create(input);
      await get().fetchPolicies();
      return id;
    } catch (error) {
      console.error('Failed to create refund policy', error);
      set({ error: (error as Error).message });
      return null;
    }
  },

  updatePolicy: async (id: string, input: RefundPolicyUpdateInput) => {
    try {
      await RefundPolicyModel.update(id, input);
      await get().fetchPolicies();
    } catch (error) {
      console.error('Failed to update refund policy', error);
      set({ error: (error as Error).message });
    }
  },

  deletePolicy: async (id: string) => {
    try {
      await RefundPolicyModel.delete(id);
      set((state) => ({ policies: state.policies.filter((policy) => policy.id !== id) }));
    } catch (error) {
      console.error('Failed to delete refund policy', error);
      set({ error: (error as Error).message });
    }
  },
}));
