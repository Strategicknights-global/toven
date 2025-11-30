import { create } from 'zustand';
import { RatingModel } from '../firestore/RatingModel';
import type { RatingSchema } from '../schemas/RatingSchema';

interface RatingsState {
  ratings: RatingSchema[];
  loading: boolean;
  error: string | null;
  
  loadRatings: () => Promise<void>;
  loadUserRatings: (userId: string) => Promise<void>;
  loadApprovedRatings: () => Promise<void>;
  createRating: (data: Omit<RatingSchema, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string | null>;
  updateRating: (id: string, data: Partial<RatingSchema>) => Promise<boolean>;
  updateStatus: (id: string, status: 'pending' | 'approved' | 'rejected') => Promise<boolean>;
  deleteRating: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export const useRatingsStore = create<RatingsState>((set, get) => ({
  ratings: [],
  loading: false,
  error: null,

  loadRatings: async () => {
    set({ loading: true, error: null });
    try {
      const ratings = await RatingModel.getAll();
      set({ ratings, loading: false });
    } catch (error) {
      console.error('Failed to load ratings:', error);
      set({ error: 'Failed to load ratings', loading: false });
    }
  },

  loadUserRatings: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const ratings = await RatingModel.getByUserId(userId);
      set({ ratings, loading: false });
    } catch (error) {
      console.error('Failed to load user ratings:', error);
      set({ error: 'Failed to load user ratings', loading: false });
    }
  },

  loadApprovedRatings: async () => {
    set({ loading: true, error: null });
    try {
      const ratings = await RatingModel.getApprovedRatings();
      set({ ratings, loading: false });
    } catch (error) {
      console.error('Failed to load approved ratings:', error);
      set({ error: 'Failed to load approved ratings', loading: false });
    }
  },

  createRating: async (data) => {
    set({ loading: true, error: null });
    try {
      const id = await RatingModel.create(data);
      await get().refresh();
      set({ loading: false });
      return id;
    } catch (error) {
      console.error('Failed to create rating:', error);
      set({ error: 'Failed to submit rating', loading: false });
      return null;
    }
  },

  updateRating: async (id, data) => {
    set({ loading: true, error: null });
    try {
      await RatingModel.update(id, data);
      await get().refresh();
      set({ loading: false });
      return true;
    } catch (error) {
      console.error('Failed to update rating:', error);
      set({ error: 'Failed to update rating', loading: false });
      return false;
    }
  },

  updateStatus: async (id, status) => {
    set({ loading: true, error: null });
    try {
      await RatingModel.updateStatus(id, status);
      await get().refresh();
      set({ loading: false });
      return true;
    } catch (error) {
      console.error('Failed to update status:', error);
      set({ error: 'Failed to update status', loading: false });
      return false;
    }
  },

  deleteRating: async (id) => {
    set({ loading: true, error: null });
    try {
      await RatingModel.delete(id);
      await get().refresh();
      set({ loading: false });
      return true;
    } catch (error) {
      console.error('Failed to delete rating:', error);
      set({ error: 'Failed to delete rating', loading: false });
      return false;
    }
  },

  refresh: async () => {
    await get().loadRatings();
  },
}));
