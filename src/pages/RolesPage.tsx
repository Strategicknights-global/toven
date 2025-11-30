import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { useRolesStore } from '../stores/rolesStore';
import { ALL_PERMISSIONS } from '../permissions';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import type { RoleSchema } from '../schemas/RoleSchema';
import { Pencil, Trash2, MoreVertical, ShieldCheck, Truck, Utensils, Crown, Plus, UserRound, UserCog, Users } from 'lucide-react';
import Tooltip from '../components/Tooltip';
import ConfirmDialog from '../components/ConfirmDialog';
import FloatingMenu, { type FloatingMenuItem } from '../components/FloatingMenu';
import CreateRoleDialog from '../components/CreateRoleDialog';
import EditRoleDialog from '../components/EditRoleDialog';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';

const toTitleCase = (value: string) =>
  value
    .split(/[-_\s]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const formatPermissionLabel = (permission: string) => {
  const [resource, action] = permission.split(':');
  if (!resource) return permission;
  const resourceLabel = toTitleCase(resource);
  if (!action) return resourceLabel;
  const actionLabel = toTitleCase(action);
  return `${resourceLabel} • ${actionLabel}`;
};

const formatPermissionChipLabel = (permission: string) =>
  permission
    .split(':')
    .map((segment) => segment.trim().toUpperCase())
    .join(':');

const RolesPage: React.FC = () => {
  const {
    roles,
    loading,
    creating,
    updating,
    createRole,
    updateRole,
    deleteRole,
    defaultRoleId,
    defaultDeliveryRoleId,
    defaultChefRoleId,
    defaultAdminRoleId,
    defaultSubscriberRoleId,
    defaultSupervisorRoleId,
    defaultHelpersRoleId,
    setDefaultRole,
    clearDefaultRole,
    setPerRoleDefault,
    clearPerRoleDefault,
    editingRoleId,
    editName,
    editPermissions,
    // Form actions
    setEditingRole,
    setEditName,
    setEditPermissions,
    cancelEdit,
    totalItems,
    paginatedData,
  } = useRolesStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('name');
  const [searchValue, setSearchValue] = useState('');
  const searchFields = useMemo(() => getSearchFieldsForCollection('roles'), []);

  useEffect(() => {
    const search = searchValue ? { field: searchField, type: 'text' as const, value: searchValue } : null;
    void paginatedData({ pageNumber: currentPage, pageSize, search });
  }, [currentPage, pageSize, searchField, searchValue, paginatedData]);

  const permissionOptions = useMemo(() => ALL_PERMISSIONS, []);

  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);

  const handleOpenCreateDialog = useCallback(() => {
    setCreateDialogOpen(true);
  }, []);

  const handleCloseCreateDialog = useCallback(() => {
    setCreateDialogOpen(false);
  }, []);

  const handleCloseEditDialog = useCallback(() => {
    setEditDialogOpen(false);
    cancelEdit();
  }, [cancelEdit]);

  const handleCreateRoleSubmit = useCallback(
    async (name: string, permissions: string[]) => {
      try {
        await createRole(name, permissions);
        setCreateDialogOpen(false);
      } catch (error) {
        console.error('Failed to create role', error);
      }
    },
    [createRole],
  );

  const handleEditRole = useCallback((role: RoleSchema) => {
    setEditingRole(role.id ?? null, role.name, role.permissions);
    setEditDialogOpen(true);
  }, [setEditingRole]);

  const handleUpdateRole = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!editingRoleId || !editName || editPermissions.length === 0) return;

    try {
      await updateRole(editingRoleId, editName, editPermissions);
      setEditDialogOpen(false);
    } catch {
      // Error handling is done in the store
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    try {
      await deleteRole(roleId, roleName);
    } catch {
      // Error handling is done in the store
    }
  };

  const handleSetDefault = useCallback(async (roleId: string) => {
    await setDefaultRole(roleId);
  }, [setDefaultRole]);

  // Confirmation dialog state
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [pendingDefault, setPendingDefault] = useState<{ id: string; name: string } | null>(null);
  const [pendingClearDefault, setPendingClearDefault] = useState<boolean>(false);
  const [pendingPerRoleDefault, setPendingPerRoleDefault] = useState<{ id: string; name: string; roleType: 'Delivery' | 'Chef' | 'Admin' | 'Subscriber' | 'Supervisor' | 'Helpers' } | null>(null);
  const [pendingClearPerRoleDefault, setPendingClearPerRoleDefault] = useState<{ roleType: 'Delivery' | 'Chef' | 'Admin' | 'Subscriber' | 'Supervisor' | 'Helpers' } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const columns = useMemo<DataTableColumnDef<RoleSchema>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        meta: {
          cellClassName: 'whitespace-nowrap text-sm font-medium text-gray-900',
        },
      },
      {
        id: 'permissions',
        header: 'Permissions',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            {row.original.permissions.map((permission) => (
              <span
                key={permission}
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700"
              >
                {formatPermissionChipLabel(permission)}
              </span>
            ))}
          </div>
        ),
        meta: {
          cellClassName: 'align-top',
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const roleId = row.original.id;
          const isDefault = roleId === defaultRoleId;
          const isDeliveryDefault = roleId === defaultDeliveryRoleId;
          const isChefDefault = roleId === defaultChefRoleId;
          const isAdminDefault = roleId === defaultAdminRoleId;
          const isSubscriberDefault = roleId === defaultSubscriberRoleId;
          const isSupervisorDefault = roleId === defaultSupervisorRoleId;
          const isHelpersDefault = roleId === defaultHelpersRoleId;
          const perRoleDefaultLabel = (() => {
            if (isDeliveryDefault) return 'DELIVERY DEFAULT';
            if (isChefDefault) return 'CHEF DEFAULT';
            if (isAdminDefault) return 'ADMIN DEFAULT';
            if (isSubscriberDefault) return 'SUBSCRIBER DEFAULT';
            if (isSupervisorDefault) return 'SUPERVISOR DEFAULT';
            if (isHelpersDefault) return 'HELPERS DEFAULT';
            return '';
          })();
          return (
            <div className="relative flex flex-wrap items-center gap-2 text-sm font-medium">
              {isDefault && (
                <span className="max-w-full rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold leading-tight tracking-wide text-emerald-700">
                  DEFAULT
                </span>
              )}
              {!isDefault && perRoleDefaultLabel && (
                <span className="max-w-full rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold leading-tight tracking-wide text-indigo-700">
                  {perRoleDefaultLabel}
                </span>
              )}
              <Tooltip label="Edit role">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditRole(row.original);
                  }}
                  className="rounded-full p-2 text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label={`Edit ${row.original.name}`}
                >
                  <Pencil size={16} />
                </button>
              </Tooltip>
              <Tooltip label="Delete role">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (roleId) {
                      setPendingDelete({ id: roleId, name: row.original.name });
                    }
                  }}
                  className="rounded-full p-2 text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                  aria-label={`Delete ${row.original.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </Tooltip>
              {roleId && (
                <FloatingMenu
                  trigger={({ toggle, ref }) => (
                    <Tooltip label="More actions">
                      <button
                        ref={ref as React.RefObject<HTMLButtonElement>}
                        type="button"
                        onClick={toggle}
                        className="rounded-full p-2 text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
                        aria-haspopup="menu"
                        aria-label={`More actions for ${row.original.name}`}
                      >
                        <MoreVertical size={16} />
                      </button>
                    </Tooltip>
                  )}
                  items={(() => {
                    const menuActions: FloatingMenuItem[] = [];
                    if (!isDefault) {
                      menuActions.push({
                        id: 'set-default',
                        label: (
                          <div className="flex items-center gap-2"><ShieldCheck size={14} /> <span>Set global default</span></div>
                        ),
                        onSelect: () => setPendingDefault({ id: roleId, name: row.original.name }),
                      });
                    } else {
                      menuActions.push({
                        id: 'clear-default',
                        label: (
                          <div className="flex items-center gap-2"><ShieldCheck size={14} /> <span>Clear global default</span></div>
                        ),
                        onSelect: () => setPendingClearDefault(true),
                      });
                    }
                    if (!isDeliveryDefault) {
                      menuActions.push({
                        id: 'set-delivery-default',
                        label: (
                          <div className="flex items-center gap-2"><Truck size={14} /> <span>Set Delivery default</span></div>
                        ),
                        onSelect: () => setPendingPerRoleDefault({ id: roleId, name: row.original.name, roleType: 'Delivery' }),
                      });
                    } else {
                      menuActions.push({
                        id: 'clear-delivery-default',
                        label: (
                          <div className="flex items-center gap-2"><Truck size={14} /> <span>Clear Delivery default</span></div>
                        ),
                        onSelect: () => setPendingClearPerRoleDefault({ roleType: 'Delivery' }),
                      });
                    }
                    if (!isChefDefault) {
                      menuActions.push({
                        id: 'set-chef-default',
                        label: (
                          <div className="flex items-center gap-2"><Utensils size={14} /> <span>Set Chef default</span></div>
                        ),
                        onSelect: () => setPendingPerRoleDefault({ id: roleId, name: row.original.name, roleType: 'Chef' }),
                      });
                    } else {
                      menuActions.push({
                        id: 'clear-chef-default',
                        label: (
                          <div className="flex items-center gap-2"><Utensils size={14} /> <span>Clear Chef default</span></div>
                        ),
                        onSelect: () => setPendingClearPerRoleDefault({ roleType: 'Chef' }),
                      });
                    }
                    if (!isAdminDefault) {
                      menuActions.push({
                        id: 'set-admin-default',
                        label: (
                          <div className="flex items-center gap-2"><Crown size={14} /> <span>Set Admin default</span></div>
                        ),
                        onSelect: () => setPendingPerRoleDefault({ id: roleId, name: row.original.name, roleType: 'Admin' }),
                      });
                    } else {
                      menuActions.push({
                        id: 'clear-admin-default',
                        label: (
                          <div className="flex items-center gap-2"><Crown size={14} /> <span>Clear Admin default</span></div>
                        ),
                        onSelect: () => setPendingClearPerRoleDefault({ roleType: 'Admin' }),
                      });
                    }
                    if (!isSubscriberDefault) {
                      menuActions.push({
                        id: 'set-subscriber-default',
                        label: (
                          <div className="flex items-center gap-2"><UserRound size={14} /> <span>Set Subscriber default</span></div>
                        ),
                        onSelect: () => setPendingPerRoleDefault({ id: roleId, name: row.original.name, roleType: 'Subscriber' }),
                      });
                    } else {
                      menuActions.push({
                        id: 'clear-subscriber-default',
                        label: (
                          <div className="flex items-center gap-2"><UserRound size={14} /> <span>Clear Subscriber default</span></div>
                        ),
                        onSelect: () => setPendingClearPerRoleDefault({ roleType: 'Subscriber' }),
                      });
                    }
                    if (!isSupervisorDefault) {
                      menuActions.push({
                        id: 'set-supervisor-default',
                        label: (
                          <div className="flex items-center gap-2"><UserCog size={14} /> <span>Set Supervisor default</span></div>
                        ),
                        onSelect: () => setPendingPerRoleDefault({ id: roleId, name: row.original.name, roleType: 'Supervisor' }),
                      });
                    } else {
                      menuActions.push({
                        id: 'clear-supervisor-default',
                        label: (
                          <div className="flex items-center gap-2"><UserCog size={14} /> <span>Clear Supervisor default</span></div>
                        ),
                        onSelect: () => setPendingClearPerRoleDefault({ roleType: 'Supervisor' }),
                      });
                    }
                    if (!isHelpersDefault) {
                      menuActions.push({
                        id: 'set-helpers-default',
                        label: (
                          <div className="flex items-center gap-2"><Users size={14} /> <span>Set Helpers default</span></div>
                        ),
                        onSelect: () => setPendingPerRoleDefault({ id: roleId, name: row.original.name, roleType: 'Helpers' }),
                      });
                    } else {
                      menuActions.push({
                        id: 'clear-helpers-default',
                        label: (
                          <div className="flex items-center gap-2"><Users size={14} /> <span>Clear Helpers default</span></div>
                        ),
                        onSelect: () => setPendingClearPerRoleDefault({ roleType: 'Helpers' }),
                      });
                    }
                    return menuActions;
                  })()}
                />
              )}
            </div>
          );
        },
        meta: {
          cellClassName: 'text-sm font-medium align-middle',
        },
      },
    ],
    [defaultRoleId, defaultDeliveryRoleId, defaultChefRoleId, defaultAdminRoleId, defaultSubscriberRoleId, defaultSupervisorRoleId, defaultHelpersRoleId, handleEditRole, setPendingDelete, setPendingDefault, setPendingClearDefault, setPendingPerRoleDefault, setPendingClearPerRoleDefault]
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Manage Roles</h1>
          <div className="space-y-1 text-sm text-slate-600">
            {defaultRoleId && (
              <p>
                Global default:{' '}
                <span className="font-semibold">{roles.find((r) => r.id === defaultRoleId)?.name || defaultRoleId}</span>
              </p>
            )}
            {defaultDeliveryRoleId && (
              <p>
                Delivery default:{' '}
                <span className="font-semibold">{roles.find((r) => r.id === defaultDeliveryRoleId)?.name || defaultDeliveryRoleId}</span>
              </p>
            )}
            {defaultChefRoleId && (
              <p>
                Chef default:{' '}
                <span className="font-semibold">{roles.find((r) => r.id === defaultChefRoleId)?.name || defaultChefRoleId}</span>
              </p>
            )}
            {defaultAdminRoleId && (
              <p>
                Admin default:{' '}
                <span className="font-semibold">{roles.find((r) => r.id === defaultAdminRoleId)?.name || defaultAdminRoleId}</span>
              </p>
            )}
            {defaultSubscriberRoleId && (
              <p>
                Subscriber default:{' '}
                <span className="font-semibold">{roles.find((r) => r.id === defaultSubscriberRoleId)?.name || defaultSubscriberRoleId}</span>
              </p>
            )}
            {defaultSupervisorRoleId && (
              <p>
                Supervisor default:{' '}
                <span className="font-semibold">{roles.find((r) => r.id === defaultSupervisorRoleId)?.name || defaultSupervisorRoleId}</span>
              </p>
            )}
            {defaultHelpersRoleId && (
              <p>
                Helpers default:{' '}
                <span className="font-semibold">{roles.find((r) => r.id === defaultHelpersRoleId)?.name || defaultHelpersRoleId}</span>
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleOpenCreateDialog}
          disabled={creating}
          className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
        >
          <Plus size={16} />
          New Role
        </button>
      </div>

      {/* Roles List */}
      <DataTable<RoleSchema>
        columns={columns}
        data={roles}
        loading={loading}
        pagination={{
          currentPage,
          pageSize,
          totalItems: totalItems ?? 0,
          onPageChange: setCurrentPage,
          onPageSizeChange: setPageSize,
        }}
        searchFields={searchFields.map((f) => ({ value: f.name, label: f.label }))}
        searchField={searchField}
        searchValue={searchValue}
        onSearchFieldChange={setSearchField}
        onSearchValueChange={setSearchValue}
        emptyMessage="No roles found. Create one above."
      />

      <CreateRoleDialog
        open={isCreateDialogOpen}
        creating={creating}
        permissionOptions={permissionOptions}
        formatPermissionLabel={formatPermissionLabel}
        onClose={handleCloseCreateDialog}
        onSubmit={handleCreateRoleSubmit}
      />

      <EditRoleDialog
        open={isEditDialogOpen}
        updating={updating}
        roleName={editName}
        selectedPermissions={editPermissions}
        permissionOptions={permissionOptions}
        formatPermissionLabel={formatPermissionLabel}
        onRoleNameChange={setEditName}
        onPermissionsChange={setEditPermissions}
        onClose={handleCloseEditDialog}
        onSubmit={handleUpdateRole}
      />

      {/* Delete Role Confirmation */}
      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete Role"
        description={
          <span>
            Are you sure you want to delete role <strong>{pendingDelete?.name}</strong>? This action cannot be undone.
          </span>
        }
        confirmLabel="Delete"
        variant="danger"
        loading={confirmLoading}
        onCancel={() => { if (!confirmLoading) setPendingDelete(null); }}
        onConfirm={async () => {
          if (!pendingDelete) return;
          setConfirmLoading(true);
            try {
              await handleDeleteRole(pendingDelete.id, pendingDelete.name);
            } finally {
              setConfirmLoading(false);
              setPendingDelete(null);
            }
        }}
      />

      {/* Set Default Role Confirmation */}
      <ConfirmDialog
        open={!!pendingDefault}
        title="Set Default Role"
        description={
          <span>
            Set <strong>{pendingDefault?.name}</strong> as the new default role? New signups will be assigned this role automatically.
          </span>
        }
        confirmLabel="Set Default"
        loading={confirmLoading}
        onCancel={() => { if (!confirmLoading) setPendingDefault(null); }}
        onConfirm={async () => {
          if (!pendingDefault) return;
          setConfirmLoading(true);
          try {
            await handleSetDefault(pendingDefault.id);
          } finally {
            setConfirmLoading(false);
            setPendingDefault(null);
          }
        }}
      />

      {/* Per-Role Default Confirmation */}
      <ConfirmDialog
        open={!!pendingPerRoleDefault}
        title="Set Role Default"
        description={
          <span>
            Set <strong>{pendingPerRoleDefault?.name}</strong> as the default for <strong>{pendingPerRoleDefault?.roleType}</strong> users? They will receive this role automatically when created.
          </span>
        }
        confirmLabel="Confirm"
        loading={confirmLoading}
        onCancel={() => { if (!confirmLoading) setPendingPerRoleDefault(null); }}
        onConfirm={async () => {
          if (!pendingPerRoleDefault) return;
          setConfirmLoading(true);
          try {
            await setPerRoleDefault(pendingPerRoleDefault.roleType, pendingPerRoleDefault.id);
          } finally {
            setConfirmLoading(false);
            setPendingPerRoleDefault(null);
          }
        }}
      />

      {/* Clear Default Role Confirmation */}
      <ConfirmDialog
        open={pendingClearDefault}
        title="Clear Default Role"
        description="Remove the global default role? No default will be assigned to new signups."
        confirmLabel="Clear Default"
        loading={confirmLoading}
        onCancel={() => { if (!confirmLoading) setPendingClearDefault(false); }}
        onConfirm={async () => {
          setConfirmLoading(true);
          try {
            await clearDefaultRole();
          } finally {
            setConfirmLoading(false);
            setPendingClearDefault(false);
          }
        }}
      />

      {/* Clear Per-Role Default Confirmation */}
      <ConfirmDialog
        open={!!pendingClearPerRoleDefault}
        title="Clear Role Default"
        description={
          <span>
            Remove the default role for <strong>{pendingClearPerRoleDefault?.roleType}</strong> users? They will no longer receive a default role automatically when created.
          </span>
        }
        confirmLabel="Clear Default"
        loading={confirmLoading}
        onCancel={() => { if (!confirmLoading) setPendingClearPerRoleDefault(null); }}
        onConfirm={async () => {
          if (!pendingClearPerRoleDefault) return;
          setConfirmLoading(true);
          try {
            await clearPerRoleDefault(pendingClearPerRoleDefault.roleType);
          } finally {
            setConfirmLoading(false);
            setPendingClearPerRoleDefault(null);
          }
        }}
      />
    </div>
  );
};

export default RolesPage;
