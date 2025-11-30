import { create } from 'zustand';
import { UserModel, RoleModel } from '../firestore';
import type { UserSchema } from '../schemas/UserSchema';
import type { RoleSchema } from '../schemas/RoleSchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { useToastStore } from './toastStore';

interface UsersState {
  users: UserSchema[];
  availableRoles: { id: string; name: string }[];
  loading: boolean;
  rolesLoading: boolean;
  rolesLoaded: boolean;
  totalItems: number | null;
  currentPage: number;
  currentPageSize: number;
  currentSearch: SearchParams | null;
  roleMembers: Record<string, UserSchema[]>;
  roleMembersLoading: Record<string, boolean>;
  roleMembersLoaded: Record<string, boolean>;
  paginatedData: (options: {
    pageNumber?: number;
    pageSize?: number;
    search?: SearchParams | null;
  }) => Promise<void>;
  loadUsers: () => Promise<void>;
  loadAvailableRoles: (force?: boolean) => Promise<void>;
  loadUsersForRole: (roleType: string, options?: { force?: boolean; pageSize?: number }) => Promise<UserSchema[]>;
  assignRole: (userId: string, userEmail: string, roleId: string, roleName: string) => Promise<void>;
  removeRole: (userId: string, userEmail: string, roleId: string, roleName: string) => Promise<void>;
  refreshUsers: () => Promise<void>;
}

export const useUsersStore = create<UsersState>((set, get) => ({
  users: [],
  availableRoles: [],
  loading: false,
  rolesLoading: false,
  rolesLoaded: false,
  totalItems: null,
  currentPage: 1,
  currentPageSize: 1000,
  currentSearch: null,
  roleMembers: {},
  roleMembersLoading: {},
  roleMembersLoaded: {},

  paginatedData: async (options = {}) => {
    const state = get();
    const resolvedPageNumber = options.pageNumber ?? state.currentPage ?? 1;
    const resolvedPageSize = options.pageSize ?? state.currentPageSize ?? 10;
    const resolvedSearch = options.search ?? state.currentSearch ?? null;

    set({ loading: true });
    try {
      const { data, total } = await UserModel.searchPaginated(
        {
          pageNumber: resolvedPageNumber,
          pageSize: resolvedPageSize,
        },
        resolvedSearch
      );
      set({
        users: data,
        totalItems: total,
        loading: false,
        currentPage: resolvedPageNumber,
        currentPageSize: resolvedPageSize,
        currentSearch: resolvedSearch,
      });
    } catch (error) {
      useToastStore.getState().addToast('Failed to load users: ' + (error as Error).message, 'error');
      set({ loading: false });
    }
  },

  loadUsers: async () => {
    await get().paginatedData({});
  },

  loadAvailableRoles: async (force = false) => {
    if (get().rolesLoading || (!force && get().rolesLoaded)) {
      return;
    }

    set({ rolesLoading: true });
    try {
      const pageSize = 50;
      let pageNumber = 1;
      let hasMore = true;
      const collected: RoleSchema[] = [];

      while (hasMore) {
        const { data, total: totalCount } = await RoleModel.searchPaginated(
          { pageNumber, pageSize },
          null,
        );
        collected.push(...data);
        const retrieved = pageNumber * pageSize;
        hasMore = data.length > 0 && retrieved < totalCount;
        pageNumber += 1;
      }

      set({
        availableRoles: collected.map((role) => ({ id: role.id!, name: role.name })),
        rolesLoading: false,
        rolesLoaded: true,
      });
    } catch (error) {
      useToastStore.getState().addToast('Failed to load roles: ' + (error as Error).message, 'error');
      set({ rolesLoading: false });
      throw error;
    }
  },

  loadUsersForRole: async (roleType, options) => {
    const normalized = roleType.trim().toLowerCase();
    const force = options?.force ?? false;
    const pageSize = options?.pageSize ?? 50;
    const { roleMembersLoaded, roleMembersLoading, roleMembers } = get();

    if (!force && roleMembersLoaded[normalized]) {
      return roleMembers[normalized] ?? [];
    }

    if (roleMembersLoading[normalized]) {
      return roleMembers[normalized] ?? [];
    }

    set((state) => ({
      roleMembersLoading: { ...state.roleMembersLoading, [normalized]: true },
    }));

    try {
      let pageNumber = 1;
      let hasMore = true;
      const collected: UserSchema[] = [];

      while (hasMore) {
        const { data, total: totalCount } = await UserModel.searchPaginated(
          { pageNumber, pageSize },
          { field: 'roleType', type: 'enum', value: roleType },
        );
        collected.push(...data);
        const retrieved = pageNumber * pageSize;
        hasMore = data.length > 0 && retrieved < totalCount;
        pageNumber += 1;
      }

      set((state) => ({
        roleMembers: { ...state.roleMembers, [normalized]: collected },
        roleMembersLoaded: { ...state.roleMembersLoaded, [normalized]: true },
        roleMembersLoading: { ...state.roleMembersLoading, [normalized]: false },
      }));

      return collected;
    } catch (error) {
      useToastStore.getState().addToast('Failed to load users for role: ' + (error as Error).message, 'error');
      set((state) => ({
        roleMembersLoading: { ...state.roleMembersLoading, [normalized]: false },
      }));
      throw error;
    }
  },

  assignRole: async (userId: string, userEmail: string, roleId: string, roleName: string) => {
    if (!roleId) return;

    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        useToastStore.getState().addToast('User not found', 'error');
        return;
      }

      const currentRoles = user.roles || [];
      if (!currentRoles.includes(roleId)) {
        await UserModel.updateById(userId, { roles: [...currentRoles, roleId] });
        useToastStore.getState().addToast(`Role '${roleName}' assigned to ${userEmail}`, 'success');
        await get().refreshUsers();
        set({ roleMembers: {}, roleMembersLoaded: {}, roleMembersLoading: {} });
      } else {
        useToastStore.getState().addToast('Role already assigned', 'info');
      }
    } catch (error) {
      useToastStore.getState().addToast('Failed to assign role: ' + (error as Error).message, 'error');
      throw error;
    }
  },

  removeRole: async (userId: string, userEmail: string, roleId: string, roleName: string) => {

    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        useToastStore.getState().addToast('User not found', 'error');
        return;
      }

      const currentRoles = user.roles || [];
      const updatedRoles = currentRoles.filter(r => r !== roleId);
      await UserModel.updateById(userId, { roles: updatedRoles });
      useToastStore.getState().addToast(`Role '${roleName}' removed from ${userEmail}`, 'success');
      await get().refreshUsers();
      set({ roleMembers: {}, roleMembersLoaded: {}, roleMembersLoading: {} });
    } catch (error) {
      useToastStore.getState().addToast('Failed to remove role: ' + (error as Error).message, 'error');
      throw error;
    }
  },

  refreshUsers: async () => {
    const { currentPage, currentPageSize, currentSearch } = get();
    await get().paginatedData({ pageNumber: currentPage, pageSize: currentPageSize, search: currentSearch });
  }
}));