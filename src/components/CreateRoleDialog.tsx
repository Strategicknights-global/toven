import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Dialog from './Dialog';

export interface CreateRoleDialogProps {
  open: boolean;
  creating: boolean;
  permissionOptions: string[];
  formatPermissionLabel: (permission: string) => string;
  onClose: () => void;
  onSubmit: (name: string, permissions: string[]) => Promise<void> | void;
}

const CreateRoleDialog: React.FC<CreateRoleDialogProps> = ({
  open,
  creating,
  permissionOptions,
  formatPermissionLabel,
  onClose,
  onSubmit,
}) => {
  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setRoleName('');
      setSelectedPermissions([]);
      setSelectAll(false);
    }
  }, [open]);

  const handleTogglePermission = useCallback((permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((item) => item !== permission)
        : [...prev, permission],
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    if (selectedPermissions.length === permissionOptions.length && permissionOptions.length > 0) {
      setSelectAll(true);
    } else if (selectAll && selectedPermissions.length !== permissionOptions.length) {
      setSelectAll(false);
    }
  }, [open, permissionOptions.length, selectAll, selectedPermissions.length]);

  const groupedPermissions = useMemo(() => {
    return permissionOptions.reduce<Record<string, string[]>>((acc, permission) => {
      const [resource] = permission.split(':');
      const key = resource || 'general';
      if (!acc[key]) acc[key] = [];
      acc[key].push(permission);
      return acc;
    }, {});
  }, [permissionOptions]);

  const handleToggleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedPermissions([]);
      setSelectAll(false);
    } else {
      setSelectedPermissions(permissionOptions);
      setSelectAll(true);
    }
  }, [permissionOptions, selectAll]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedName = roleName.trim();
      if (!trimmedName || selectedPermissions.length === 0) return;
      await onSubmit(trimmedName, selectedPermissions);
    },
    [onSubmit, roleName, selectedPermissions],
  );

  const isSubmitDisabled = !roleName.trim() || selectedPermissions.length === 0 || creating;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create New Role"
      description="Assign a name and choose the permissions this role should grant."
      size="xl"
      initialFocus={firstFieldRef as React.RefObject<HTMLElement>}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {selectedPermissions.length}/{permissionOptions.length} permissions selected
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-role-form"
              disabled={isSubmitDisabled}
              className="inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
            >
              {creating ? 'Creating…' : 'Create Role'}
            </button>
          </div>
        </div>
      }
    >
      <form id="create-role-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="new-role-name" className="block text-sm font-medium text-slate-700">
            Role name
          </label>
          <input
            id="new-role-name"
            ref={firstFieldRef}
            type="text"
            value={roleName}
            onChange={(event) => setRoleName(event.target.value)}
            placeholder="e.g. Operations Manager"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Permissions</span>
            {permissionOptions.length > 0 && (
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="text-xs font-semibold uppercase tracking-wide text-purple-600 hover:text-purple-700"
              >
                {selectAll ? 'Clear all' : 'Select all'}
              </button>
            )}
          </div>

          <div className="space-y-4">
            {Object.entries(groupedPermissions).map(([resource, options]) => (
              <fieldset key={resource} className="space-y-2">
                <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {resource === 'general' ? 'General' : resource.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
                </legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {options.map((permission) => (
                    <label
                      key={permission}
                      className="flex items-center gap-2 rounded-md border border-transparent px-2 py-1 text-sm hover:border-purple-200 hover:bg-purple-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(permission)}
                        onChange={() => handleTogglePermission(permission)}
                        className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span>{formatPermissionLabel(permission)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </div>
      </form>
    </Dialog>
  );
};

export default CreateRoleDialog;
