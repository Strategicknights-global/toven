import React, { useEffect, useMemo, useState } from 'react';
import { useUsersStore } from '../stores/usersStore';
import { X } from 'lucide-react';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import type { UserSchema } from '../schemas/UserSchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';
import ConfirmDialog from '../components/ConfirmDialog';
import Tooltip from '../components/Tooltip';
import AddUserDialog from '../components/AddUserDialog';

const UsersPage: React.FC = () => {
  const {
    users,
    availableRoles,
    loading,
    totalItems,
    paginatedData,
    assignRole,
    removeRole,
    loadAvailableRoles,
    rolesLoaded,
    rolesLoading,
  } = useUsersStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('id');
  const [searchValue, setSearchValue] = useState('');
  const [pendingRemoval, setPendingRemoval] = useState<null | { userId: string; userEmail: string; roleId: string; roleName: string }>(null);
  const [removing, setRemoving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const searchFields = useMemo(() => getSearchFieldsForCollection('users'), []);

  // Sort users by creation date (newest first)
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : -Infinity;
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : -Infinity;
      return bTime - aTime;
    });
  }, [users]);

  // Load paginated data when filters change
  useEffect(() => {
    const search: SearchParams | null = searchValue
      ? {
          field: searchField,
          type: 'text',
          value: searchValue,
        }
      : null;
    void paginatedData({
      pageNumber: currentPage,
      pageSize: pageSize,
      search,
    });
  }, [currentPage, pageSize, searchField, searchValue, paginatedData]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchField, searchValue]);

  useEffect(() => {
    if (!rolesLoaded && !rolesLoading) {
      void loadAvailableRoles();
    }
  }, [loadAvailableRoles, rolesLoaded, rolesLoading]);

  const columns = useMemo<DataTableColumnDef<UserSchema>[]>(
    () => [
      {
        accessorKey: 'fullName',
        header: 'Name',
        meta: {
          cellClassName: 'whitespace-nowrap text-sm font-medium text-gray-900',
        },
      },
      {
        accessorKey: 'email',
        header: 'Email',
        meta: {
          cellClassName: 'whitespace-nowrap text-sm text-gray-500',
        },
      },
      {
        accessorKey: 'userType',
        header: 'User Type',
        meta: {
          cellClassName: 'whitespace-nowrap text-sm text-gray-500',
        },
      },
      {
        id: 'roles',
        header: 'Current Roles',
        cell: ({ row }) => {
          const user = row.original;
          return (
            <>
              {user.roles && user.roles.length > 0 ? (
                user.roles.map((roleId) => {
                  const role = availableRoles.find((r) => r.id === roleId);
                  const roleName = role ? role.name : rolesLoading ? 'Loading…' : '—';
                  return (
                    <span
                      key={roleId}
                      className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium mr-1"
                    >
                      {roleName}
                      {user.id && (
                        <Tooltip label="Remove role">
                          <button
                            type="button"
                            aria-label={`Remove role ${roleName}`}
                            onClick={() => setPendingRemoval({ userId: user.id!, userEmail: user.email, roleId, roleName })}
                            className="ml-1 w-4 h-4 flex items-center justify-center rounded-full text-blue-700 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          >
                            <X size={10} />
                          </button>
                        </Tooltip>
                      )}
                    </span>
                  );
                })
              ) : (
                'None'
              )}
            </>
          );
        },
        meta: {
          cellClassName: 'text-sm text-gray-500',
        },
      },
      {
        id: 'assignRole',
        header: 'Assign Role',
        cell: ({ row }) => {
          const user = row.original;
          return (
            <select
              onChange={(event) => {
                const select = event.currentTarget;
                const roleId = select.value;
                if (!roleId || !user.id) {
                  select.selectedIndex = 0;
                  return;
                }
                const roleName = availableRoles.find((r) => r.id === roleId)?.name || '';
                void assignRole(user.id, user.email, roleId, roleName)
                  .catch(() => {
                    // error handled in store toast
                  })
                  .finally(() => {
                    select.selectedIndex = 0;
                  });
              }}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              defaultValue=""
            >
              <option value="">Select Role to Assign</option>
              {availableRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          );
        },
        meta: {
          cellClassName: 'text-sm',
        },
      },
    ],
    [availableRoles, assignRole, rolesLoading]
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold">Manage Users</h1>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <span className="text-lg leading-none">+</span> Add User
        </button>
      </div>
      <DataTable<UserSchema>
        columns={columns}
        data={sortedUsers}
        loading={loading}
        emptyMessage="No users found."
        pagination={{
          currentPage: currentPage,
          pageSize: pageSize,
          totalItems: totalItems || 0,
          onPageChange: setCurrentPage,
          onPageSizeChange: setPageSize,
        }}
        searchFields={searchFields.map((f) => ({ value: f.name, label: f.label }))}
        searchField={searchField}
        searchValue={searchValue}
        onSearchFieldChange={setSearchField}
        onSearchValueChange={setSearchValue}
      />

      <ConfirmDialog
        open={!!pendingRemoval}
        title="Remove Role"
        variant="danger"
        description={<span>Remove role <strong>{pendingRemoval?.roleName}</strong> from <strong>{pendingRemoval?.userEmail}</strong>?</span>}
        confirmLabel="Remove"
        loading={removing}
        onCancel={() => !removing && setPendingRemoval(null)}
        onConfirm={async () => {
          if (!pendingRemoval) return;
          setRemoving(true);
          try {
            await removeRole(pendingRemoval.userId, pendingRemoval.userEmail, pendingRemoval.roleId, pendingRemoval.roleName);
          } finally {
            setRemoving(false);
            setPendingRemoval(null);
          }
        }}
      />
      <AddUserDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
};

export default UsersPage;
