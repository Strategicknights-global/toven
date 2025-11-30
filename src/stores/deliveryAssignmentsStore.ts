import { create } from 'zustand';
import type { Unsubscribe } from 'firebase/firestore';
import type { DeliveryAssignmentSchema, DeliveryPersonSummary } from '../schemas/DeliveryAssignmentSchema';
import { ConfigModel, DeliveryAssignmentModel, RoleModel, SubscriptionRequestModel, UserGroupModel, UserModel } from '../firestore';
import type { UserSchema } from '../schemas/UserSchema';
import type { RoleSchema } from '../schemas/RoleSchema';
import type { SubscriptionRequestSchema } from '../schemas/SubscriptionRequestSchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { useToastStore } from './toastStore';

interface DeliveryAssignmentsState {
  assignments: DeliveryAssignmentSchema[];
  deliveryPersons: DeliveryPersonSummary[];
  loading: boolean;
  totalItems: number | null;
  assigningId: string | null;
  assigningGroupId: string | null;
  completingId: string | null;
  tripLabels: string[];
  tripLabelsLoading: boolean;
  tripCreateLoading: boolean;
  tripUpdatingId: string | null;
  paginatedData: (options: {
    pageNumber?: number;
    pageSize?: number;
    search?: SearchParams | null;
  }) => Promise<void>;
  loadAssignments: () => Promise<void>;
  unloadAssignments: () => void;
  loadDeliveryPersons: () => Promise<void>;
  loadTripLabels: () => Promise<void>;
  createTripLabel: (label?: string) => Promise<string | null>;
  assignTrip: (assignmentId: string, tripLabel: string | null) => Promise<void>;
  assignDelivery: (assignmentId: string, deliveryPersonId: string) => Promise<void>;
  assignGroupDelivery: (groupId: string, deliveryPersonId: string) => Promise<void>;
  clearAssignment: (assignmentId: string) => Promise<void>;
  markAsCompleted: (assignmentId: string) => Promise<void>;
}

let assignmentsUnsubscribe: Unsubscribe | null = null;

const recalculateActiveTrips = (
  deliveryPersons: DeliveryPersonSummary[],
  assignments: DeliveryAssignmentSchema[],
): DeliveryPersonSummary[] => {
  if (deliveryPersons.length === 0) {
    return deliveryPersons;
  }
  const counts = assignments.reduce<Record<string, number>>((acc, assignment) => {
    if (assignment.assignPersonId) {
      acc[assignment.assignPersonId] = (acc[assignment.assignPersonId] ?? 0) + 1;
    }
    return acc;
  }, {});
  return deliveryPersons.map((person) => ({
    ...person,
    activeTrips: counts[person.id] ?? 0,
  }));
};

const mergeTripLabels = (current: string[], assignments: DeliveryAssignmentSchema[]): string[] => {
  const incoming = assignments
    .map((assignment) => assignment.tripNumber?.trim())
    .filter((value): value is string => Boolean(value && value.length > 0));
  return ConfigModel.normalizeTripLabels([...current, ...incoming]);
};

const generateNextTripLabel = (existing: string[]): string => {
  const pattern = /^trip\s*(\d+)$/i;
  let highest = 0;
  existing.forEach((label) => {
    const match = pattern.exec(label);
    if (match) {
      const numeric = Number.parseInt(match[1], 10);
      if (Number.isFinite(numeric) && numeric > highest) {
        highest = numeric;
      }
    }
  });
  return `Trip ${highest + 1}`;
};

export const useDeliveryAssignmentsStore = create<DeliveryAssignmentsState>((set, get) => ({
  assignments: [],
  deliveryPersons: [],
  loading: false,
  totalItems: null,
  assigningId: null,
  assigningGroupId: null,
  completingId: null,
  tripLabels: [],
  tripLabelsLoading: false,
  tripCreateLoading: false,
  tripUpdatingId: null,

  paginatedData: async (options) => {
    set({ loading: true });
    try {
      const { data, total } = await DeliveryAssignmentModel.searchPaginated(
        { 
          pageNumber: options.pageNumber || 1, 
          pageSize: options.pageSize || 1000 
        },
        options.search || null
      );
      set({ assignments: data, totalItems: total, loading: false });
    } catch (error) {
      useToastStore.getState().addToast('Failed to load delivery assignments: ' + (error as Error).message, 'error');
      set({ loading: false });
    }
  },

  loadAssignments: async () => {
    try {
      set({ loading: true });
      if (assignmentsUnsubscribe) {
        assignmentsUnsubscribe();
        assignmentsUnsubscribe = null;
      }

      try {
        // Iteratively paginate subscription requests for sync
        let pageNumber = 1;
        let hasMore = true;
        const allSubscriptionRequests: SubscriptionRequestSchema[] = [];

        while (hasMore) {
          const { data, total } = await SubscriptionRequestModel.searchPaginated(
            { pageNumber, pageSize: 100 },
            null,
          );
          allSubscriptionRequests.push(...data);
          const retrieved = pageNumber * 100;
          hasMore = data.length > 0 && retrieved < total;
          pageNumber += 1;
        }

        // Iteratively paginate users
        pageNumber = 1;
        hasMore = true;
        const allUsers: UserSchema[] = [];

        while (hasMore) {
          const { data, total } = await UserModel.searchPaginated(
            { pageNumber, pageSize: 100 },
            null,
          );
          allUsers.push(...data);
          const retrieved = pageNumber * 100;
          hasMore = data.length > 0 && retrieved < total;
          pageNumber += 1;
        }

        // Load all groups (UserGroupModel doesn't have searchPaginated)
        const allGroups = await UserGroupModel.findAll();

        await DeliveryAssignmentModel.syncFromSubscriptionRequests(allSubscriptionRequests, allUsers, allGroups);
      } catch (syncError) {
        console.error('Failed to sync delivery assignments from subscriptions', syncError);
      }

      assignmentsUnsubscribe = DeliveryAssignmentModel.subscribeAll(
        (records) => {
          set((state) => ({
            assignments: records,
            loading: false,
            deliveryPersons: recalculateActiveTrips(state.deliveryPersons, records),
            tripLabels: mergeTripLabels(state.tripLabels, records),
          }));
        },
        (error) => {
          useToastStore.getState().addToast('Failed to load delivery assignments', 'error');
          console.error('Failed to load delivery assignments', error);
          set({ loading: false });
        },
      );
    } catch (error) {
      console.error('Failed to initialise delivery assignments listener', error);
      useToastStore.getState().addToast('Failed to load delivery assignments', 'error');
      set({ loading: false });
    }
  },

  unloadAssignments: () => {
    if (assignmentsUnsubscribe) {
      assignmentsUnsubscribe();
      assignmentsUnsubscribe = null;
    }
    set({ assignments: [], loading: false });
  },

  loadDeliveryPersons: async () => {
    try {
      // Iteratively paginate users and roles for delivery person calculation
      let pageNumber = 1;
      let hasMore = true;
      const allUsers: UserSchema[] = [];

      while (hasMore) {
        const { data, total } = await UserModel.searchPaginated(
          { pageNumber, pageSize: 100 },
          null,
        );
        allUsers.push(...data);
        const retrieved = pageNumber * 100;
        hasMore = data.length > 0 && retrieved < total;
        pageNumber += 1;
      }

      // Similarly paginate roles
      pageNumber = 1;
      hasMore = true;
      const allRoles: RoleSchema[] = [];

      while (hasMore) {
        const { data, total } = await RoleModel.searchPaginated(
          { pageNumber, pageSize: 100 },
          null,
        );
        allRoles.push(...data);
        const retrieved = pageNumber * 100;
        hasMore = data.length > 0 && retrieved < total;
        pageNumber += 1;
      }

      const deliveryRoleId = allRoles.find((role) => role.name.toLowerCase() === 'delivery')?.id;
      const assignments = get().assignments;

      const deliveryPersons = allUsers
        .filter((user) => {
          if (!user.id) {
            return false;
          }
          if (user.roleType && user.roleType.toLowerCase() === 'delivery') {
            return true;
          }
          if (!deliveryRoleId) {
            return false;
          }
          const rolesList = user.roles ?? [];
          return rolesList.includes(deliveryRoleId);
        })
        .map<DeliveryPersonSummary>((user) => {
          const displayName = user.fullName
            || [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
            || user.email
            || user.phone
            || 'Delivery Partner';
          const contactNumber = user.phone || user.contactNumber || undefined;
          const activeTrips = assignments.filter((assignment) => assignment.assignPersonId === user.id).length;
          return {
            id: user.id!,
            name: displayName,
            contactNumber,
            activeTrips,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

      set({ deliveryPersons });
    } catch (error) {
      console.error('Failed to load delivery partners', error);
      useToastStore.getState().addToast('Failed to load delivery partners: ' + (error as Error).message, 'error');
    }
  },

  loadTripLabels: async () => {
    if (get().tripLabelsLoading) {
      return;
    }
    set({ tripLabelsLoading: true });
    try {
      const labels = await ConfigModel.getDeliveryTripLabels();
      set((state) => ({
        tripLabels: mergeTripLabels(labels, state.assignments),
        tripLabelsLoading: false,
      }));
    } catch (error) {
      console.error('Failed to load trip labels', error);
      useToastStore.getState().addToast('Failed to load trips. Please retry.', 'error');
      set({ tripLabelsLoading: false });
    }
  },

  createTripLabel: async (input?: string) => {
    const existing = get().tripLabels;
    const raw = typeof input === 'string' ? input.trim() : '';
    const label = raw.length > 0 ? raw : generateNextTripLabel(existing);
    const normalizedList = ConfigModel.normalizeTripLabels([label]);
    const normalizedLabel = normalizedList[0] ?? null;
    if (!normalizedLabel) {
      useToastStore.getState().addToast('Provide a valid trip name.', 'warning');
      return null;
    }
    if (existing.some((value) => value.toLowerCase() === normalizedLabel.toLowerCase())) {
      useToastStore.getState().addToast('Trip already exists.', 'info');
      return normalizedLabel;
    }
    set({ tripCreateLoading: true });
    try {
      const merged = ConfigModel.normalizeTripLabels([...existing, normalizedLabel]);
      await ConfigModel.setDeliveryTripLabels(merged);
      set({ tripLabels: merged, tripCreateLoading: false });
      useToastStore.getState().addToast(`Trip ${normalizedLabel} created.`, 'success');
      return normalizedLabel;
    } catch (error) {
      console.error('Failed to create trip', error);
      useToastStore.getState().addToast('Failed to create trip. Please retry.', 'error');
      set({ tripCreateLoading: false });
      return null;
    }
  },

  assignTrip: async (assignmentId, tripLabel) => {
    set({ tripUpdatingId: assignmentId });
    try {
      await DeliveryAssignmentModel.updateTripNumber(assignmentId, tripLabel);
      if (tripLabel) {
        set((state) => ({
          tripLabels: ConfigModel.normalizeTripLabels([...state.tripLabels, tripLabel]),
        }));
      }
      set((state) => ({
        assignments: state.assignments.map((assignment) =>
          assignment.id === assignmentId ? { ...assignment, tripNumber: tripLabel ?? '' } : assignment,
        ),
      }));
      useToastStore.getState().addToast('Trip updated successfully.', 'success');
    } catch (error) {
      console.error('Failed to update trip', error);
      useToastStore.getState().addToast('Failed to update trip. Please retry.', 'error');
    } finally {
      set({ tripUpdatingId: null });
    }
  },

  assignDelivery: async (assignmentId, deliveryPersonId) => {
    if (!deliveryPersonId) {
      useToastStore.getState().addToast('Select a delivery partner before assigning.', 'warning');
      return;
    }

    const person = get().deliveryPersons.find((item) => item.id === deliveryPersonId);
    if (!person) {
      useToastStore.getState().addToast('Delivery partner not found. Refresh the list and try again.', 'error');
      return;
    }

    set({ assigningId: assignmentId });
    try {
      await DeliveryAssignmentModel.assignToPerson(
        assignmentId,
        {
          id: person.id,
          name: person.name,
        },
        'assigned',
      );
      useToastStore.getState().addToast(`Assigned to ${person.name}`, 'success');
    } catch (error) {
      console.error('Failed to assign delivery', error);
      useToastStore.getState().addToast('Failed to assign delivery. Please retry.', 'error');
    } finally {
      set({ assigningId: null });
    }
  },

  assignGroupDelivery: async (groupId, deliveryPersonId) => {
    if (!deliveryPersonId) {
      useToastStore.getState().addToast('Select a delivery partner before assigning.', 'warning');
      return;
    }

    const person = get().deliveryPersons.find((item) => item.id === deliveryPersonId);
    if (!person) {
      useToastStore.getState().addToast('Delivery partner not found. Refresh the list and try again.', 'error');
      return;
    }

    set({ assigningGroupId: groupId });
    try {
      const count = await DeliveryAssignmentModel.assignGroupToPerson(
        groupId,
        {
          id: person.id,
          name: person.name,
        },
        'assigned',
      );
      if (count > 0) {
        useToastStore.getState().addToast(`Assigned ${count} deliveries to ${person.name}`, 'success');
      } else {
        useToastStore.getState().addToast('No deliveries found for this group', 'warning');
      }
    } catch (error) {
      console.error('Failed to assign group delivery', error);
      useToastStore.getState().addToast('Failed to assign group. Please retry.', 'error');
    } finally {
      set({ assigningGroupId: null });
    }
  },

  clearAssignment: async (assignmentId) => {
    set({ assigningId: assignmentId });
    try {
      await DeliveryAssignmentModel.clearAssignment(assignmentId);
      useToastStore.getState().addToast('Assignment cleared', 'info');
    } catch (error) {
      console.error('Failed to clear assignment', error);
      useToastStore.getState().addToast('Failed to clear assignment. Please retry.', 'error');
    } finally {
      set({ assigningId: null });
    }
  },

  markAsCompleted: async (assignmentId) => {
    set({ completingId: assignmentId });
    try {
      await DeliveryAssignmentModel.markDelivered(assignmentId);
      useToastStore.getState().addToast('Marked as delivered', 'success');
    } catch (error) {
      console.error('Failed to mark assignment as delivered', error);
      useToastStore.getState().addToast('Failed to mark as delivered. Please retry.', 'error');
    } finally {
      set({ completingId: null });
    }
  },
}));
