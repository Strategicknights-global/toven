import { create } from 'zustand';
import { UserModel } from '../firestore';
import type { UserSchema } from '../schemas/UserSchema';
import { useToastStore } from './toastStore';

interface ProfileState {
  profileData: Partial<UserSchema>;
  loading: boolean;
  updating: boolean;
  loadProfile: (userId: string) => Promise<void>;
  updateProfile: (userId: string, data: Partial<UserSchema>) => Promise<void>;
  setProfileData: (data: Partial<UserSchema>) => void;
  reset: () => void;
}

const initialProfileData = {
  fullName: '',
  phone: '',
  email: '',
  userType: ''
};

export const useProfileStore = create<ProfileState>((set) => ({
  profileData: initialProfileData,
  loading: false,
  updating: false,

  loadProfile: async (userId: string) => {
    try {
      set({ loading: true });
      const userData = await UserModel.findById(userId);
      if (userData) {
        set({
          profileData: {
            fullName: userData.fullName || '',
            phone: userData.phone || '',
            email: userData.email || '',
            userType: userData.userType || ''
          }
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      useToastStore.getState().addToast('Failed to load profile data', 'error');
    } finally {
      set({ loading: false });
    }
  },

  updateProfile: async (userId: string, data: Partial<UserSchema>) => {
    try {
      set({ updating: true });
      await UserModel.updateById(userId, data);
      useToastStore.getState().addToast('Profile updated successfully!', 'success');

      // Update local state with the new data
      set((state) => ({
        profileData: { ...state.profileData, ...data }
      }));
    } catch (error) {
      console.error('Error updating profile:', error);
      useToastStore.getState().addToast('Failed to update profile', 'error');
      throw error; // Re-throw to allow component to handle if needed
    } finally {
      set({ updating: false });
    }
  },

  setProfileData: (data: Partial<UserSchema>) => {
    set((state) => ({
      profileData: { ...state.profileData, ...data }
    }));
  },

  reset: () => {
    set({
      profileData: initialProfileData,
      loading: false,
      updating: false
    });
  }
}));