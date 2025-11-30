import { create } from 'zustand';
import { UserDeliveryLocationModel, UserGroupModel, UserModel } from '../firestore';
import type { GroupPolygon, MapCoordinate, UserGroupSchema } from '../schemas/UserGroupSchema';
import type { UserSchema } from '../schemas/UserSchema';
import type { UserDeliveryLocationSchema } from '../schemas/UserDeliveryLocationSchema';
import { clonePolygons, isPointInsideGroupPolygons, parseLatLngString } from '../utils/geo';
import { useToastStore } from './toastStore';

interface UserGroupsState {
  groups: UserGroupSchema[];
  users: UserSchema[];
  userDefaultLocations: Record<string, MapCoordinate>;
  loading: boolean;
  usersLoading: boolean;
  creatingGroup: boolean;
  userAssignmentStatus: Record<string, boolean>;
  coverageUpdateStatus: Record<string, boolean>;
  loadGroups: () => Promise<void>;
  loadUsersList: () => Promise<void>;
  createGroup: (input: { name: string; description?: string; coveragePolygons?: GroupPolygon[] }) => Promise<boolean>;
  assignUserToGroup: (userId: string, groupId: string) => Promise<void>;
  removeUserFromGroup: (userId: string) => Promise<void>;
  refreshUsers: () => Promise<void>;
  updateGroupCoverage: (groupId: string, polygons: GroupPolygon[]) => Promise<boolean>;
}

export const useUserGroupsStore = create<UserGroupsState>((set, get) => {
  const buildDefaultLocationMap = (locations: UserDeliveryLocationSchema[]): Record<string, MapCoordinate> => {
    const map: Record<string, MapCoordinate> = {};
    const fallbacks: Record<string, MapCoordinate> = {};

    locations.forEach(location => {
      const point = parseLatLngString(location.coordinates);
      if (!point) {
        return;
      }

      if (location.isDefault) {
        map[location.userId] = point;
      } else if (!fallbacks[location.userId]) {
        fallbacks[location.userId] = point;
      }
    });

    Object.keys(fallbacks).forEach(userId => {
      if (!map[userId]) {
        map[userId] = fallbacks[userId];
      }
    });

    return map;
  };

  const autoAssignUsersToGroups = async (shouldNotify = true): Promise<void> => {
    const { groups, users, userDefaultLocations } = get();
    const groupsWithCoverage = groups.filter(group => (group.coveragePolygons?.length ?? 0) > 0 && group.id);
    if (groupsWithCoverage.length === 0) {
      return;
    }

    const assignments: Record<string, string> = {};

    users.forEach(user => {
      const userId = user.id;
      if (!userId) {
        return;
      }

      const point = userDefaultLocations[userId];
      if (!point) {
        return;
      }

      const targetGroup = groupsWithCoverage.find(group =>
        group.id && isPointInsideGroupPolygons(point, group.coveragePolygons ?? []),
      );

      if (targetGroup?.id && user.groupId !== targetGroup.id) {
        assignments[userId] = targetGroup.id;
      }
    });

    const assignmentEntries = Object.entries(assignments);
    if (assignmentEntries.length === 0) {
      return;
    }

    try {
      await Promise.all(
        assignmentEntries.map(([userId, groupId]) =>
          UserModel.updateById(userId, { groupId } as Partial<UserSchema>),
        ),
      );

      set(state => ({
        users: state.users.map(user => {
          const userId = user.id;
          if (!userId || !assignments[userId]) {
            return user;
          }
          return { ...user, groupId: assignments[userId] };
        }),
      }));

      if (shouldNotify) {
        useToastStore.getState().addToast(
          `Auto assigned ${assignmentEntries.length} user${assignmentEntries.length === 1 ? '' : 's'} based on delivery coverage`,
          'success',
        );
      }
    } catch (error) {
      useToastStore.getState().addToast('Failed to auto assign users: ' + (error as Error).message, 'error');
    }
  };

  return {
    groups: [],
    users: [],
    userDefaultLocations: {},
    loading: false,
    usersLoading: false,
    creatingGroup: false,
    userAssignmentStatus: {},
    coverageUpdateStatus: {},

    loadGroups: async () => {
      set({ loading: true });
      try {
        // Load all groups - required for group assignment UI to work with local filtering
        const groups = await UserGroupModel.findAll();
        set({ groups });
      } catch (error) {
        useToastStore.getState().addToast('Failed to load groups: ' + (error as Error).message, 'error');
        throw error;
      } finally {
        set({ loading: false });
      }
    },

    loadUsersList: async () => {
      set({ usersLoading: true });
      try {
        // Load all users and locations - required for group assignment UI to work with local filtering and auto-assignment logic
        const [users, locations] = await Promise.all([
          UserModel.findAll(),
          UserDeliveryLocationModel.findAll(),
        ]);
        const locationMap = buildDefaultLocationMap(locations);
        set({ users, userDefaultLocations: locationMap });
        await autoAssignUsersToGroups(false);
      } catch (error) {
        useToastStore.getState().addToast('Failed to load users: ' + (error as Error).message, 'error');
        throw error;
      } finally {
        set({ usersLoading: false });
      }
    },

    createGroup: async ({ name, description, coveragePolygons = [] }) => {
      if (!name.trim()) {
        useToastStore.getState().addToast('Group name is required', 'error');
        return false;
      }

      set({ creatingGroup: true });
      try {
        const existing = get().groups.find(group => group.name.toLowerCase() === name.trim().toLowerCase());
        if (existing) {
          useToastStore.getState().addToast('A group with this name already exists', 'info');
          return false;
        }

        await UserGroupModel.create({
          name: name.trim(),
          description: description?.trim(),
          coveragePolygons: clonePolygons(coveragePolygons),
        });
        useToastStore.getState().addToast('Group created successfully', 'success');
        await get().loadGroups();
        return true;
      } catch (error) {
        useToastStore.getState().addToast('Failed to create group: ' + (error as Error).message, 'error');
        throw error;
      } finally {
        set({ creatingGroup: false });
      }
    },

    assignUserToGroup: async (userId, groupId) => {
      if (!userId) {
        useToastStore.getState().addToast('Missing user identifier', 'error');
        return;
      }
      if (!groupId) {
        useToastStore.getState().addToast('Please select a group', 'error');
        return;
      }

      set(state => ({ userAssignmentStatus: { ...state.userAssignmentStatus, [userId]: true } }));
      try {
        const user = await UserModel.findById(userId);
        if (!user) {
          useToastStore.getState().addToast('User not found', 'error');
          return;
        }

        if (user.groupId === groupId) {
          useToastStore.getState().addToast('User is already in this group', 'info');
          return;
        }

        await UserModel.updateById(userId, { groupId } as Partial<UserSchema>);
        useToastStore.getState().addToast('User assigned to group', 'success');
        await get().refreshUsers();
      } catch (error) {
        useToastStore.getState().addToast('Failed to assign user: ' + (error as Error).message, 'error');
        throw error;
      } finally {
        set(state => {
          const updatedStatus = { ...state.userAssignmentStatus };
          delete updatedStatus[userId];
          return { userAssignmentStatus: updatedStatus };
        });
      }
    },

    removeUserFromGroup: async (userId) => {
      if (!userId) {
        useToastStore.getState().addToast('Missing user identifier', 'error');
        return;
      }
      set(state => ({ userAssignmentStatus: { ...state.userAssignmentStatus, [userId]: true } }));
      try {
        await UserModel.updateById(userId, { groupId: '' } as Partial<UserSchema>);
        useToastStore.getState().addToast('User removed from group', 'success');
        await get().refreshUsers();
      } catch (error) {
        useToastStore.getState().addToast('Failed to remove user from group: ' + (error as Error).message, 'error');
        throw error;
      } finally {
        set(state => {
          const updatedStatus = { ...state.userAssignmentStatus };
          delete updatedStatus[userId];
          return { userAssignmentStatus: updatedStatus };
        });
      }
    },

    refreshUsers: async () => {
      try {
        // Load all users and locations for group assignment UI
        const [users, locations] = await Promise.all([
          UserModel.findAll(),
          UserDeliveryLocationModel.findAll(),
        ]);
        const locationMap = buildDefaultLocationMap(locations);
        set({ users, userDefaultLocations: locationMap });
        await autoAssignUsersToGroups();
      } catch (error) {
        useToastStore.getState().addToast('Failed to refresh users: ' + (error as Error).message, 'error');
        throw error;
      }
    },

    updateGroupCoverage: async (groupId, polygons) => {
      if (!groupId) {
        useToastStore.getState().addToast('Missing group identifier', 'error');
        return false;
      }

      set(state => ({ coverageUpdateStatus: { ...state.coverageUpdateStatus, [groupId]: true } }));
      try {
        await UserGroupModel.updateById(groupId, { coveragePolygons: clonePolygons(polygons) });
        useToastStore.getState().addToast('Coverage areas updated', 'success');

        set(state => ({
          groups: state.groups.map(group =>
            group.id === groupId ? { ...group, coveragePolygons: clonePolygons(polygons) } : group,
          ),
        }));

        await autoAssignUsersToGroups();
        return true;
      } catch (error) {
        useToastStore.getState().addToast('Failed to update coverage: ' + (error as Error).message, 'error');
        return false;
      } finally {
        set(state => {
          const updatedStatus = { ...state.coverageUpdateStatus };
          delete updatedStatus[groupId];
          return { coverageUpdateStatus: updatedStatus };
        });
      }
    },
  };
});
