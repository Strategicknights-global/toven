import { create } from 'zustand';
import { CustomerInquiryModel } from '../firestore';
import type {
  CustomerInquiryCreateInput,
  CustomerInquirySchema,
  CustomerInquiryUpdateInput,
} from '../schemas/CustomerInquirySchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { useToastStore } from './toastStore';

interface CustomerInquiriesState {
  inquiries: CustomerInquirySchema[];
  loading: boolean;
  totalItems: number | null;
  creating: boolean;
  updatingId: string | null;
  paginatedData: (options: {
    pageNumber?: number;
    pageSize?: number;
    search?: SearchParams | null;
  }) => Promise<void>;
  loadInquiries: () => Promise<void>;
  refresh: () => Promise<void>;
  createInquiry: (input: CustomerInquiryCreateInput) => Promise<string | null>;
  updateInquiry: (id: string, input: CustomerInquiryUpdateInput) => Promise<boolean>;
}

export const useCustomerInquiriesStore = create<CustomerInquiriesState>((set, get) => ({
  inquiries: [],
  loading: false,
  totalItems: null,
  creating: false,
  updatingId: null,

  paginatedData: async (options) => {
    set({ loading: true });
    try {
      const { data, total } = await CustomerInquiryModel.searchPaginated(
        { 
          pageNumber: options.pageNumber || 1, 
          pageSize: options.pageSize || 1000 
        },
        options.search || null
      );
      set({ inquiries: data, totalItems: total, loading: false });
    } catch (error) {
      useToastStore.getState().addToast('Failed to load inquiries: ' + (error as Error).message, 'error');
      set({ loading: false });
    }
  },

  loadInquiries: async () => {
    await get().paginatedData({});
  },

  refresh: async () => {
    try {
      await get().paginatedData({});
    } catch {
      // paginatedData already handles the toast
    }
  },

  createInquiry: async (input) => {
    set({ creating: true });
    try {
      const id = await CustomerInquiryModel.create(input);
      useToastStore.getState().addToast('Thanks! Your message has been sent.', 'success');
      await get().refresh();
      return id;
    } catch (error) {
      console.error('Failed to submit customer inquiry', error);
      useToastStore.getState().addToast('Failed to send your message: ' + (error as Error).message, 'error');
      return null;
    } finally {
      set({ creating: false });
    }
  },

  updateInquiry: async (id, input) => {
    set({ updatingId: id });
    try {
      await CustomerInquiryModel.update(id, input);
      useToastStore.getState().addToast('Inquiry updated.', 'success');
      await get().refresh();
      return true;
    } catch (error) {
      console.error('Failed to update customer inquiry', error);
      useToastStore.getState().addToast('Failed to update inquiry: ' + (error as Error).message, 'error');
      return false;
    } finally {
      set({ updatingId: null });
    }
  },
}));
