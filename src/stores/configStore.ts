import { create } from 'zustand';
import { ConfigModel, type AppConfigSchema } from '../firestore/ConfigModel';
import { useToastStore } from './toastStore';

interface ConfigState {
  config: AppConfigSchema | null;
  loading: boolean;
  loaded: boolean;
  loadConfig: () => Promise<void>;
  refresh: () => Promise<void>;
  saving: boolean;
  saveConfig: (updates: Partial<AppConfigSchema>) => Promise<boolean>;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  loading: false,
  loaded: false,
  saving: false,

  loadConfig: async () => {
    if (get().loading) {
      return;
    }
    set({ loading: true });
    try {
      const data = await ConfigModel.get();
      set({ config: data, loaded: true });
    } catch (error) {
      useToastStore.getState().addToast('Failed to load configuration: ' + (error as Error).message, 'error');
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  refresh: async () => {
    set({ loaded: false });
    await get().loadConfig();
  },

  saveConfig: async (updates) => {
    if (!updates || Object.keys(updates).length === 0) {
      return false;
    }

    const payload: Partial<AppConfigSchema> = { ...updates };
    set({ saving: true });
    try {
      await ConfigModel.update(payload);
      const updatedAt = new Date();
      set((state) => ({
        config: { ...(state.config ?? {}), ...payload, updatedAt },
        loaded: true,
      }));
      useToastStore.getState().addToast('Configuration updated.', 'success');
      return true;
    } catch (error) {
      useToastStore.getState().addToast('Failed to update configuration: ' + (error as Error).message, 'error');
      return false;
    } finally {
      set({ saving: false });
    }
  },
}));
