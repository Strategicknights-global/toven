import { create } from 'zustand';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { Permission } from '../permissions';

export interface Role {
  id: string;
  name: string;
  permissions: string[];  // e.g., ['user-dashboard:view', 'user-profile:manage', '*']
}

interface UserRoleState {
  user: User | null;
  userType: string | null;  // Keep separate (Student, etc.)
  roles: Role[];
  permissions: string[];
  loading: boolean;
  unsubscribe?: () => void;
  userDocUnsubscribe?: () => void;
  hasPermission: (requiredPermission: Permission) => boolean;
  initialize: () => void;
}

export const useUserRoleStore = create<UserRoleState>((set, get) => ({
  user: null,
  userType: null,
  roles: [],
  permissions: [],
  loading: true,

  hasPermission: (requiredPermission: Permission): boolean => {
    const { permissions } = get();
    return permissions.some(perm =>
      perm === '*' || perm === requiredPermission || perm.startsWith(requiredPermission.split(':')[0] + ':*')
    );
  },

  initialize: () => {
    // Prevent multiple initializations
    if (get().loading === false || get().unsubscribe) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const existingUserDocUnsub = get().userDocUnsubscribe;
      if (existingUserDocUnsub) {
        existingUserDocUnsub();
      }

      set({ user: currentUser, userDocUnsubscribe: undefined });

      if (currentUser) {
        set({ loading: true });

        const userDocRef = doc(db, 'users', currentUser.uid);

        const userDocUnsubscribe = onSnapshot(
          userDocRef,
          async (userDoc) => {
            try {
              if (userDoc.exists()) {
                const data = userDoc.data();
                const userType = data.userType || null;
                const userRoles = data.roles || [];

                const rolePromises = userRoles.map(async (roleId: string) => {
                  const roleDoc = await getDoc(doc(db, 'roles', roleId));
                  if (roleDoc.exists()) {
                    return { id: roleId, ...roleDoc.data() } as Role;
                  }
                  return null;
                });

                const fetchedRoles = (await Promise.all(rolePromises)).filter(Boolean) as Role[];
                const allPermissions = fetchedRoles.flatMap((r) => r.permissions);

                set({
                  userType,
                  roles: fetchedRoles,
                  permissions: [...new Set(allPermissions)],
                  loading: false,
                });
              } else {
                set({
                  userType: 'Individual',
                  roles: [],
                  permissions: [],
                  loading: false,
                });
              }
            } catch (error) {
              console.error('Error resolving user roles from snapshot:', error);
              set({
                userType: 'Individual',
                roles: [],
                permissions: [],
                loading: false,
              });
            }
          },
          (error) => {
            console.error('Error subscribing to user role changes:', error);
            set({
              userType: 'Individual',
              roles: [],
              permissions: [],
              loading: false,
            });
          }
        );

        set({ userDocUnsubscribe });
      } else {
        set({
          userType: null,
          roles: [],
          permissions: [],
          loading: false,
        });
      }
    });

    // Store the unsubscribe function for cleanup if needed
    set({ unsubscribe });
  },
}));