import { create } from 'zustand';
import { StudentVerificationModel } from '../firestore';
import type {
  StudentVerificationCreateInput,
  StudentVerificationSchema,
  StudentVerificationStatusUpdateInput,
} from '../schemas/StudentVerificationSchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { useToastStore } from './toastStore';

interface StudentVerificationState {
  verifications: StudentVerificationSchema[];
  userVerifications: StudentVerificationSchema[];
  loading: boolean;
  totalItems: number | null;
  submitting: boolean;
  updatingId: string | null;
  paginatedData: (options: {
    pageNumber?: number;
    pageSize?: number;
    search?: SearchParams | null;
  }) => Promise<void>;
  loadVerifications: () => Promise<void>;
  loadUserVerifications: (userId: string) => Promise<void>;
  refresh: () => Promise<void>;
  createVerification: (input: StudentVerificationCreateInput) => Promise<StudentVerificationSchema | null>;
  updateStatus: (id: string, input: StudentVerificationStatusUpdateInput) => Promise<StudentVerificationSchema | null>;
}

export const useStudentVerificationStore = create<StudentVerificationState>((set, get) => ({
  verifications: [],
  userVerifications: [],
  loading: false,
  totalItems: null,
  submitting: false,
  updatingId: null,

  paginatedData: async (options) => {
    set({ loading: true });
    try {
      const { data, total } = await StudentVerificationModel.searchPaginated(
        { 
          pageNumber: options.pageNumber || 1, 
          pageSize: options.pageSize || 1000 
        },
        options.search || null
      );
      set({ verifications: data, totalItems: total, loading: false });
    } catch (error) {
      console.error('Failed to load student verifications', error);
      useToastStore.getState().addToast('Failed to load student verifications: ' + (error as Error).message, 'error');
      set({ loading: false });
    }
  },

  loadVerifications: async () => {
    await get().paginatedData({});
  },

  loadUserVerifications: async (userId: string) => {
    set({ loading: true });
    try {
      const fetched = await StudentVerificationModel.findByUserId(userId);
      set({ userVerifications: fetched });
    } catch (error) {
      console.error('Failed to load user verifications', error);
      useToastStore.getState().addToast('Failed to load your verifications: ' + (error as Error).message, 'error');
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  refresh: async () => {
    try {
      await get().paginatedData({});
    } catch {
      // paginatedData already handles the toast
    }
  },

  createVerification: async (input) => {
    if (get().submitting) {
      return null;
    }

    set({ submitting: true });
    try {
      const id = await StudentVerificationModel.create(input);
      const created = await StudentVerificationModel.findById(id);
      if (created) {
        set((state) => ({ 
          verifications: [created, ...state.verifications],
          userVerifications: [created, ...state.userVerifications],
        }));
      }
      useToastStore.getState().addToast('Student verification request submitted for review.', 'success');
      return created ?? null;
    } catch (error) {
      console.error('Failed to create student verification', error);
      useToastStore.getState().addToast('Failed to submit verification: ' + (error as Error).message, 'error');
      throw error;
    } finally {
      set({ submitting: false });
    }
  },

  updateStatus: async (id, input) => {
    set({ updatingId: id });
    try {
      await StudentVerificationModel.updateStatus(id, input);
      const updated = await StudentVerificationModel.findById(id);
      if (updated) {
        set((state) => ({
          verifications: state.verifications.map((verification) => 
            verification.id === id ? updated : verification
          ),
        }));
        const verb = input.status === 'approved' ? 'approved' : input.status === 'rejected' ? 'rejected' : 'updated';
        useToastStore.getState().addToast(`Student verification ${verb}.`, 'success');
        return updated;
      }
      useToastStore.getState().addToast('Student verification updated.', 'success');
      return null;
    } catch (error) {
      console.error('Failed to update student verification status', error);
      useToastStore.getState().addToast('Failed to update verification: ' + (error as Error).message, 'error');
      throw error;
    } finally {
      set({ updatingId: null });
    }
  },
}));
