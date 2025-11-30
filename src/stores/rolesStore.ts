import { create } from 'zustand';
import { RoleModel, ConfigModel } from '../firestore';
import type { RoleSchema } from '../schemas/RoleSchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { useToastStore } from './toastStore';

interface RolesState {
  roles: RoleSchema[];
  defaultRoleId: string | null;
  defaultDeliveryRoleId?: string | null;
  defaultChefRoleId?: string | null;
  defaultAdminRoleId?: string | null;
  defaultSubscriberRoleId?: string | null;
  defaultSupervisorRoleId?: string | null;
  defaultHelpersRoleId?: string | null;
  loading: boolean;
  totalItems: number | null;
  currentPage: number;
  currentPageSize: number;
  currentSearch: SearchParams | null;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  editingRoleId: string | null;
  editName: string;
  editPermissions: string[];
  paginatedData: (options: {
    pageNumber?: number;
    pageSize?: number;
    search?: SearchParams | null;
  }) => Promise<void>;
  // Actions
  loadRoles: () => Promise<void>;
  setDefaultRole: (roleId: string) => Promise<void>;
  clearDefaultRole: () => Promise<void>;
  setPerRoleDefault: (roleType: 'Delivery' | 'Chef' | 'Admin' | 'Subscriber' | 'Supervisor' | 'Helpers', roleId: string) => Promise<void>;
  clearPerRoleDefault: (roleType: 'Delivery' | 'Chef' | 'Admin' | 'Subscriber' | 'Supervisor' | 'Helpers') => Promise<void>;
  createRole: (name: string, permissions: string[]) => Promise<void>;
  updateRole: (roleId: string, name: string, permissions: string[]) => Promise<void>;
  deleteRole: (roleId: string, roleName: string) => Promise<void>;
  setEditingRole: (roleId: string | null, name?: string, permissions?: string[]) => void;
  setEditName: (name: string) => void;
  setEditPermissions: (permissions: string[]) => void;
  cancelEdit: () => void;
}

export const useRolesStore = create<RolesState>((set, get) => ({
  roles: [],
  defaultRoleId: null,
  defaultDeliveryRoleId: null,
  defaultChefRoleId: null,
  defaultAdminRoleId: null,
  defaultSubscriberRoleId: null,
  defaultSupervisorRoleId: null,
  defaultHelpersRoleId: null,
  loading: false,
  totalItems: null,
  currentPage: 1,
  currentPageSize: 1000,
  currentSearch: null,
  creating: false,
  updating: false,
  deleting: false,
  editingRoleId: null,
  editName: '',
  editPermissions: [],

  paginatedData: async (options = {}) => {
    const state = get();
    const resolvedPageNumber = options.pageNumber ?? state.currentPage ?? 1;
    const resolvedPageSize = options.pageSize ?? state.currentPageSize ?? 10;
    const resolvedSearch = options.search ?? state.currentSearch ?? null;

    set({ loading: true });
    try {
      const [{ data, total }, cfg] = await Promise.all([
        RoleModel.searchPaginated(
          {
            pageNumber: resolvedPageNumber,
            pageSize: resolvedPageSize,
          },
          resolvedSearch,
        ),
        ConfigModel.get(),
      ]);
      set({
        roles: data,
        totalItems: total,
        loading: false,
        currentPage: resolvedPageNumber,
        currentPageSize: resolvedPageSize,
        currentSearch: resolvedSearch,
        defaultRoleId: cfg.defaultRoleId ?? null,
        defaultDeliveryRoleId: cfg.defaultDeliveryRoleId ?? null,
        defaultChefRoleId: cfg.defaultChefRoleId ?? null,
        defaultAdminRoleId: cfg.defaultAdminRoleId ?? null,
        defaultSubscriberRoleId: cfg.defaultSubscriberRoleId ?? null,
        defaultSupervisorRoleId: cfg.defaultSupervisorRoleId ?? null,
        defaultHelpersRoleId: cfg.defaultHelpersRoleId ?? null,
      });
    } catch (error) {
      useToastStore.getState().addToast('Failed to load roles: ' + (error as Error).message, 'error');
      set({ loading: false });
    }
  },

  loadRoles: async () => {
    await get().paginatedData({});
  },

  setDefaultRole: async (roleId: string) => {
    try {
      await ConfigModel.setDefaultRole(roleId);
      set({ defaultRoleId: roleId });
      useToastStore.getState().addToast('Default role updated', 'success');
    } catch (error) {
      useToastStore.getState().addToast('Failed to set default role: ' + (error as Error).message, 'error');
      throw error;
    }
  },

  clearDefaultRole: async () => {
    try {
      await ConfigModel.clearDefaultRole();
      set({ defaultRoleId: null });
      useToastStore.getState().addToast('Default role cleared', 'success');
    } catch (error) {
      useToastStore.getState().addToast('Failed to clear default role: ' + (error as Error).message, 'error');
      throw error;
    }
  },

  setPerRoleDefault: async (roleType, roleId) => {
    try {
      await ConfigModel.setPerRoleDefault(roleType, roleId);
      const patch: Partial<RolesState> = {};
    if (roleType === 'Delivery') patch.defaultDeliveryRoleId = roleId;
    if (roleType === 'Chef') patch.defaultChefRoleId = roleId;
    if (roleType === 'Admin') patch.defaultAdminRoleId = roleId;
    if (roleType === 'Subscriber') patch.defaultSubscriberRoleId = roleId;
    if (roleType === 'Supervisor') patch.defaultSupervisorRoleId = roleId;
    if (roleType === 'Helpers') patch.defaultHelpersRoleId = roleId;
      set(patch);
      useToastStore.getState().addToast(`${roleType} default role updated`, 'success');
    } catch (error) {
      useToastStore.getState().addToast('Failed to set per-role default: ' + (error as Error).message, 'error');
      throw error;
    }
  },

  clearPerRoleDefault: async (roleType) => {
    try {
      await ConfigModel.clearPerRoleDefault(roleType);
      const patch: Partial<RolesState> = {};
    if (roleType === 'Delivery') patch.defaultDeliveryRoleId = null;
    if (roleType === 'Chef') patch.defaultChefRoleId = null;
    if (roleType === 'Admin') patch.defaultAdminRoleId = null;
    if (roleType === 'Subscriber') patch.defaultSubscriberRoleId = null;
    if (roleType === 'Supervisor') patch.defaultSupervisorRoleId = null;
    if (roleType === 'Helpers') patch.defaultHelpersRoleId = null;
      set(patch);
      useToastStore.getState().addToast(`${roleType} default role cleared`, 'success');
    } catch (error) {
      useToastStore.getState().addToast('Failed to clear per-role default: ' + (error as Error).message, 'error');
      throw error;
    }
  },

  createRole: async (name: string, permissions: string[]) => {
    set({ creating: true });
    try {
      await RoleModel.create({
        name,
        permissions,
      });
      useToastStore.getState().addToast(`Role '${name}' created`, 'success');
      const { currentPage, currentPageSize, currentSearch } = get();
      await get().paginatedData({ pageNumber: currentPage, pageSize: currentPageSize, search: currentSearch });
    } catch (error) {
      useToastStore.getState().addToast('Failed to create role: ' + (error as Error).message, 'error');
      throw error;
    } finally {
      set({ creating: false });
    }
  },

  updateRole: async (roleId: string, name: string, permissions: string[]) => {
    set({ updating: true });
    try {
      await RoleModel.updateById(roleId, {
        name,
        permissions,
      });
      useToastStore.getState().addToast(`Role '${name}' updated`, 'success');
      const { currentPage, currentPageSize, currentSearch } = get();
      await get().paginatedData({ pageNumber: currentPage, pageSize: currentPageSize, search: currentSearch });
      get().cancelEdit(); // Cancel edit after successful update
    } catch (error) {
      useToastStore.getState().addToast('Failed to update role: ' + (error as Error).message, 'error');
      throw error;
    } finally {
      set({ updating: false });
    }
  },

  deleteRole: async (roleId: string, roleName: string) => {
    set({ deleting: true });
    try {
      await RoleModel.deleteById(roleId);
      useToastStore.getState().addToast(`Role '${roleName}' deleted`, 'success');
      const { currentPage, currentPageSize, currentSearch } = get();
      await get().paginatedData({ pageNumber: currentPage, pageSize: currentPageSize, search: currentSearch });
    } catch (error) {
      useToastStore.getState().addToast('Failed to delete role: ' + (error as Error).message, 'error');
      throw error;
    } finally {
      set({ deleting: false });
    }
  },

  // Form actions
  setEditingRole: (roleId: string | null, name = '', permissions: string[] = []) => set({
    editingRoleId: roleId,
    editName: name,
    editPermissions: permissions,
  }),
  
  setEditName: (name: string) => set({ editName: name }),
  setEditPermissions: (permissions: string[]) => set({ editPermissions: permissions }),

  cancelEdit: () => set({
    editingRoleId: null,
    editName: '',
    editPermissions: []
  }),
}));