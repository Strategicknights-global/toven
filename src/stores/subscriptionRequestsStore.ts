import { create } from 'zustand';
import { SubscriptionRequestModel } from '../firestore';
import type {
	SubscriptionRequestCreateInput,
	SubscriptionRequestSchema,
	SubscriptionRequestStatusUpdateInput,
} from '../schemas/SubscriptionRequestSchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { useToastStore } from './toastStore';

interface SubscriptionRequestsState {
	requests: SubscriptionRequestSchema[];
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
	createRequest: (input: SubscriptionRequestCreateInput) => Promise<SubscriptionRequestSchema | null>;
	updateStatus: (id: string, input: SubscriptionRequestStatusUpdateInput) => Promise<SubscriptionRequestSchema | null>;
}

export const useSubscriptionRequestsStore = create<SubscriptionRequestsState>((set, get) => ({
	requests: [],
	loading: false,
	totalItems: null,
	submitting: false,
	updatingId: null,

	paginatedData: async (options) => {
		set({ loading: true });
		try {
			const { data, total } = await SubscriptionRequestModel.searchPaginated(
				{ 
					pageNumber: options.pageNumber || 1, 
					pageSize: options.pageSize || 1000
				},
				options.search || null
			);
			set({ requests: data, totalItems: total, loading: false });
		} catch (error) {
			console.error('Failed to load subscription requests', error);
			useToastStore.getState().addToast('Failed to load subscription requests: ' + (error as Error).message, 'error');
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
			// error is handled inside paginatedData
		}
	},

	createRequest: async (input) => {
		if (get().submitting) {
			return null;
		}

		set({ submitting: true });
		try {
			const id = await SubscriptionRequestModel.create(input);
			const created = await SubscriptionRequestModel.findById(id);
			if (created) {
				set((state) => ({ requests: [created, ...state.requests] }));
			}
			useToastStore.getState().addToast('Subscription request submitted for review.', 'success');
			return created ?? null;
		} catch (error) {
			console.error('Failed to create subscription request', error);
			useToastStore.getState().addToast('Failed to submit subscription request: ' + (error as Error).message, 'error');
			throw error;
		} finally {
			set({ submitting: false });
		}
	},

	updateStatus: async (id, input) => {
		set({ updatingId: id });
		try {
			await SubscriptionRequestModel.updateStatus(id, input);
			const updated = await SubscriptionRequestModel.findById(id);
			if (updated) {
				set((state) => ({
					requests: state.requests.map((request) => (request.id === id ? updated : request)),
				}));
				const verb = input.status === 'approved' ? 'approved' : input.status === 'rejected' ? 'rejected' : 'updated';
				useToastStore.getState().addToast(`Subscription request ${verb}.`, 'success');
				return updated;
			}
			useToastStore.getState().addToast('Subscription request updated.', 'success');
			return null;
		} catch (error) {
			console.error('Failed to update subscription request status', error);
			useToastStore.getState().addToast('Failed to update subscription request: ' + (error as Error).message, 'error');
			throw error;
		} finally {
			set({ updatingId: null });
		}
	},
}));

