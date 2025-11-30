import { create } from 'zustand';
import { AddonRequestModel } from '../firestore';
import { ConfigModel } from '../firestore/ConfigModel';
import type {
  AddonRequestCreateInput,
  AddonRequestSchema,
  AddonRequestStatus,
  AddonRequestStatusUpdateInput,
} from '../schemas/AddonRequestSchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { useToastStore } from './toastStore';

interface AddonRequestsState {
  requests: AddonRequestSchema[];
  loading: boolean;
  totalItems: number | null;
  submitting: boolean;
  updatingId: string | null;
  paginatedData: (options: {
    pageNumber?: number;
    pageSize?: number;
    search?: SearchParams | null;
  }) => Promise<void>;
  loadRequests: () => Promise<void>;
  refresh: () => Promise<void>;
  createRequest: (input: AddonRequestCreateInput) => Promise<AddonRequestSchema | null>;
  updateStatus: (id: string, input: AddonRequestStatusUpdateInput) => Promise<AddonRequestSchema | null>;
}

export const useAddonRequestsStore = create<AddonRequestsState>((set, get) => ({
  requests: [],
  loading: false,
  totalItems: null,
  submitting: false,
  updatingId: null,

  paginatedData: async (options) => {
    set({ loading: true });
    try {
      const { data, total } = await AddonRequestModel.searchPaginated(
        { 
          pageNumber: options.pageNumber || 1, 
          pageSize: options.pageSize || 1000 
        },
        options.search || null
      );
      set({ requests: data, totalItems: total, loading: false });
    } catch (error) {
      console.error('Failed to load addon requests', error);
      useToastStore.getState().addToast('Failed to load addon requests: ' + (error as Error).message, 'error');
      set({ loading: false });
    }
  },

  loadRequests: async () => {
    await get().paginatedData({});
  },

  refresh: async () => {
    try {
      await get().paginatedData({});
    } catch {
      // paginatedData already handles the toast
    }
  },

  createRequest: async (input) => {
    if (get().submitting) {
      return null;
    }

    set({ submitting: true });
    try {
      // Check config for auto-approve
      const config = await ConfigModel.get();
      const autoApprove = config.autoApproveAddonRequests ?? false;
      const initialStatus: AddonRequestStatus = autoApprove ? 'confirmed' : 'pending';

      const id = await AddonRequestModel.create(input, initialStatus);
      const created = await AddonRequestModel.findById(id);
      if (created) {
        set((state) => ({ requests: [created, ...state.requests] }));
      }
      const message = autoApprove ? 'Add-on request auto-approved and scheduled for delivery.' : 'Add-on request submitted for review.';
      useToastStore.getState().addToast(message, 'success');
      return created ?? null;
    } catch (error) {
      console.error('Failed to create addon request', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred.';
      const normalizedMessage = message.toLowerCase();
      if (normalizedMessage.includes('wallet') && normalizedMessage.includes('coin')) {
        useToastStore.getState().addToast('Not enough wallet coins to place this add-on order.', 'error');
      } else {
        useToastStore.getState().addToast('Failed to place addon request: ' + message, 'error');
      }
      throw error;
    } finally {
      set({ submitting: false });
    }
  },

  updateStatus: async (id, input) => {
    set({ updatingId: id });
    try {
      await AddonRequestModel.updateStatus(id, input);
      const updated = await AddonRequestModel.findById(id);
      if (updated) {
        set((state) => ({
          requests: state.requests.map((request) => (request.id === id ? updated : request)),
        }));
        const verb = input.status === 'confirmed' ? 'confirmed' : input.status === 'cancelled' ? 'cancelled' : 'updated';
        useToastStore.getState().addToast(`Add-on request ${verb}.`, 'success');
        return updated;
      }
      useToastStore.getState().addToast('Addon request updated.', 'success');
      return null;
    } catch (error) {
      console.error('Failed to update addon request status', error);
      useToastStore.getState().addToast('Failed to update addon request: ' + (error as Error).message, 'error');
      throw error;
    } finally {
      set({ updatingId: null });
    }
  },
}));
