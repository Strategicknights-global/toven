import { create } from 'zustand';
import { UserDeliveryLocationModel } from '../firestore';
import type {
  UserDeliveryLocationCreateInput,
  UserDeliveryLocationSchema,
  UserDeliveryLocationUpdateInput,
} from '../schemas/UserDeliveryLocationSchema';
import { useToastStore } from './toastStore';

interface UserDeliveryLocationsState {
  locations: UserDeliveryLocationSchema[];
  loading: boolean;
  submitting: boolean;
  updatingId: string | null;
  deletingId: string | null;
  loadLocations: (userId: string) => Promise<void>;
  createLocation: (input: UserDeliveryLocationCreateInput) => Promise<UserDeliveryLocationSchema | null>;
  updateLocation: (id: string, input: UserDeliveryLocationUpdateInput) => Promise<UserDeliveryLocationSchema | null>;
  deleteLocation: (id: string) => Promise<void>;
  setAsDefault: (id: string, userId: string) => Promise<void>;
  refresh: (userId: string) => Promise<void>;
}

export const useUserDeliveryLocationsStore = create<UserDeliveryLocationsState>((set, get) => ({
  locations: [],
  loading: false,
  submitting: false,
  updatingId: null,
  deletingId: null,

  loadLocations: async (userId: string) => {
    set({ loading: true });
    try {
      const locations = await UserDeliveryLocationModel.findByUserId(userId);
      set({ locations, loading: false });
    } catch (error) {
      console.error('Failed to load delivery locations:', error);
      useToastStore.getState().addToast('Failed to load delivery locations', 'error');
      set({ loading: false });
    }
  },

  createLocation: async (input: UserDeliveryLocationCreateInput) => {
    set({ submitting: true });
    try {
      const created = await UserDeliveryLocationModel.create(input);
      
      // Reload locations to ensure proper ordering
      await get().loadLocations(input.userId);
      
      useToastStore.getState().addToast('Delivery location added successfully', 'success');
      set({ submitting: false });
      return created;
    } catch (error) {
      console.error('Failed to create delivery location:', error);
      useToastStore.getState().addToast('Failed to add delivery location', 'error');
      set({ submitting: false });
      return null;
    }
  },

  updateLocation: async (id: string, input: UserDeliveryLocationUpdateInput) => {
    set({ updatingId: id });
    try {
      const updated = await UserDeliveryLocationModel.update(id, input);
      
      if (updated) {
        // Update in local state
        set((state) => ({
          locations: state.locations.map((loc) => (loc.id === id ? updated : loc)),
          updatingId: null,
        }));
        useToastStore.getState().addToast('Delivery location updated successfully', 'success');
        return updated;
      }
      
      set({ updatingId: null });
      return null;
    } catch (error) {
      console.error('Failed to update delivery location:', error);
      useToastStore.getState().addToast('Failed to update delivery location', 'error');
      set({ updatingId: null });
      return null;
    }
  },

  deleteLocation: async (id: string) => {
    set({ deletingId: id });
    try {
      await UserDeliveryLocationModel.delete(id);
      
      // Remove from local state
      set((state) => ({
        locations: state.locations.filter((loc) => loc.id !== id),
        deletingId: null,
      }));
      
      useToastStore.getState().addToast('Delivery location deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete delivery location:', error);
      useToastStore.getState().addToast('Failed to delete delivery location', 'error');
      set({ deletingId: null });
    }
  },

  setAsDefault: async (id: string, userId: string) => {
    set({ updatingId: id });
    try {
      await UserDeliveryLocationModel.setAsDefault(id, userId);
      
      // Reload to get updated default flags
      await get().loadLocations(userId);
      
      useToastStore.getState().addToast('Default delivery location updated', 'success');
      set({ updatingId: null });
    } catch (error) {
      console.error('Failed to set default location:', error);
      useToastStore.getState().addToast('Failed to set default location', 'error');
      set({ updatingId: null });
    }
  },

  refresh: async (userId: string) => {
    await get().loadLocations(userId);
  },
}));
