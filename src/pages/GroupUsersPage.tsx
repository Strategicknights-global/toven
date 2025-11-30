import React, { useEffect, useMemo, useState } from 'react';
import { Users, UserPlus, Layers } from 'lucide-react';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import Dialog from '../components/Dialog';
import GroupCoverageEditor from '../components/GroupCoverageEditor';
import { useUserGroupsStore } from '../stores/userGroupsStore';
import type { GroupPolygon, UserGroupSchema } from '../schemas/UserGroupSchema';
import type { UserSchema } from '../schemas/UserSchema';
import { clonePolygons } from '../utils/geo';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';

interface UserRow extends UserSchema {
  groupName: string;
}

const GroupUsersPage: React.FC = () => {
  const {
    groups,
    users,
    loading,
    creatingGroup,
    userAssignmentStatus,
    usersLoading,
    loadGroups,
    loadUsersList,
    createGroup,
    assignUserToGroup,
    removeUserFromGroup,
    coverageUpdateStatus,
    updateGroupCoverage,
  } = useUserGroupsStore();

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupCoverage, setNewGroupCoverage] = useState<GroupPolygon[]>([]);
  const [coverageDialogOpen, setCoverageDialogOpen] = useState(false);
  const [coverageDraft, setCoverageDraft] = useState<GroupPolygon[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeGroupName, setActiveGroupName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('fullName');
  const [searchValue, setSearchValue] = useState('');
  const searchFields = useMemo(() => getSearchFieldsForCollection('users'), []);

  const coverageDialogSaving = activeGroupId ? Boolean(coverageUpdateStatus[activeGroupId]) : false;

  useEffect(() => {
    void loadGroups();
    void loadUsersList();
  }, [loadGroups, loadUsersList]);

  const groupsWithCounts = useMemo(() => {
    return groups.map(group => ({
      ...group,
      memberCount: users.filter(user => (user.groupId || '') === (group.id || '')).length,
    }));
  }, [groups, users]);

  const groupOptions = useMemo(() => {
    return groups.map(group => ({ value: group.id ?? '', label: group.name }));
  }, [groups]);

  const groupNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    groups.forEach(group => {
      if (group.id) {
        map[group.id] = group.name;
      }
    });
    return map;
  }, [groups]);

  const tableData = useMemo<UserRow[]>(() => {
    return users
      .map(user => ({
        ...user,
        groupName: user.groupId ? groupNameMap[user.groupId] ?? '—' : '—',
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [users, groupNameMap]);

  const columns = useMemo<DataTableColumnDef<UserRow>[]>(() => [
    {
      accessorKey: 'fullName',
      header: 'Name',
      meta: { cellClassName: 'text-sm font-semibold text-slate-800 whitespace-nowrap' },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      meta: { cellClassName: 'text-sm text-slate-600 whitespace-nowrap' },
    },
    {
      id: 'phone',
      header: 'Phone',
      cell: ({ row }) => row.original.phone || row.original.contactNumber || '—',
      meta: { cellClassName: 'text-sm text-slate-500 whitespace-nowrap' },
    },
    {
      accessorKey: 'groupName',
      header: 'Current Group',
      meta: { cellClassName: 'text-sm text-purple-700 whitespace-nowrap' },
    },
    {
      id: 'assign',
      header: 'Assign',
      cell: ({ row }) => {
        const user = row.original;
        const userId = user.id ?? '';
        const assignmentInProgress = !!userAssignmentStatus[userId];
        const currentValue = user.groupId || '';

        return (
          <div className="flex items-center gap-2">
            <select
              className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={currentValue}
              disabled={assignmentInProgress || !user.id}
              onChange={(event) => {
                const value = event.target.value;
                if (!user.id) {
                  return;
                }
                if (!value) {
                  void removeUserFromGroup(user.id);
                  return;
                }
                void assignUserToGroup(user.id, value);
              }}
            >
              <option value="">No Group</option>
              {groupOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {assignmentInProgress ? (
              <span className="text-xs text-slate-500">Saving…</span>
            ) : null}
          </div>
        );
      },
      meta: { cellClassName: 'text-sm text-slate-600 whitespace-nowrap' },
    },
  ], [assignUserToGroup, groupOptions, removeUserFromGroup, userAssignmentStatus]);

  const handleCreateGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    const created = await createGroup({
      name: newGroupName,
      description: newGroupDescription,
      coveragePolygons: newGroupCoverage,
    });
    if (created) {
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupCoverage([]);
    }
  };

  const handleOpenCoverageDialog = (group: UserGroupSchema) => {
    if (!group.id) {
      return;
    }
    setActiveGroupId(group.id);
    setActiveGroupName(group.name);
    setCoverageDraft(clonePolygons(group.coveragePolygons ?? []));
    setCoverageDialogOpen(true);
  };

  const handleCloseCoverageDialog = () => {
    setCoverageDialogOpen(false);
    setActiveGroupId(null);
    setActiveGroupName('');
    setCoverageDraft([]);
  };

  const handleSaveCoverage = async () => {
    if (!activeGroupId) {
      return;
    }
    const success = await updateGroupCoverage(activeGroupId, coverageDraft);
    if (success) {
      handleCloseCoverageDialog();
    }
  };

  const totalAssigned = useMemo(() => users.filter(u => u.groupId).length, [users]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-3 shadow-lg">
            <Layers className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Group Users</h1>
            <p className="text-sm text-slate-600">
              Organize individual users into delivery groups. Each user can belong to only one group at a time.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 pt-2">
          <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
            <Users className="h-6 w-6 text-purple-600" />
            <div>
              <p className="text-xs text-slate-500">Total Users</p>
              <p className="text-lg font-semibold text-slate-800">{users.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
            <Layers className="h-6 w-6 text-purple-600" />
            <div>
              <p className="text-xs text-slate-500">Groups</p>
              <p className="text-lg font-semibold text-slate-800">{groups.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
            <UserPlus className="h-6 w-6 text-purple-600" />
            <div>
              <p className="text-xs text-slate-500">Assigned Users</p>
              <p className="text-lg font-semibold text-slate-800">{totalAssigned}</p>
            </div>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
          <UserPlus className="h-5 w-5 text-purple-600" /> Create a new group
        </h2>
        <form className="space-y-6" onSubmit={handleCreateGroup}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="group-name">
                Group Name
              </label>
              <input
                id="group-name"
                type="text"
                required
                value={newGroupName}
                onChange={(event) => setNewGroupName(event.target.value)}
                placeholder="e.g., North Route"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/70"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="group-description">
                Description (optional)
              </label>
              <input
                id="group-description"
                type="text"
                value={newGroupDescription}
                onChange={(event) => setNewGroupDescription(event.target.value)}
                placeholder="Short note about this group"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/70"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Coverage Areas</h3>
            <GroupCoverageEditor
              polygons={newGroupCoverage}
              onPolygonsChange={setNewGroupCoverage}
              disabled={creatingGroup}
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={creatingGroup}
              className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {creatingGroup ? 'Creating…' : 'Create Group'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Existing Groups</h2>
        {groupsWithCounts.length === 0 ? (
          <p className="text-sm text-slate-500">No groups have been created yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groupsWithCounts.map(group => (
              <div key={group.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-base font-semibold text-slate-800">{group.name}</h3>
                {group.description ? (
                  <p className="mt-1 text-sm text-slate-600">{group.description}</p>
                ) : null}
                <div className="mt-3 space-y-1 text-sm text-slate-500">
                  <p>{group.memberCount} member{group.memberCount === 1 ? '' : 's'}</p>
                  <p>
                    {group.coveragePolygons && group.coveragePolygons.length > 0
                      ? `${group.coveragePolygons.length} coverage area${group.coveragePolygons.length === 1 ? '' : 's'}`
                      : 'No coverage areas defined'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenCoverageDialog(group)}
                  disabled={!group.id || Boolean(group.id && coverageUpdateStatus[group.id])}
                  className="mt-4 inline-flex items-center justify-center rounded-md border border-purple-200 px-4 py-2 text-sm font-medium text-purple-700 transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Manage Coverage
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Assign users to groups</h2>
          <span className="text-xs uppercase tracking-wide text-slate-500">Users can be in one group at a time</span>
        </div>
        <DataTable<UserRow>
          columns={columns}
          data={tableData}
          loading={loading || usersLoading}
          pagination={{
            currentPage,
            pageSize,
            totalItems: tableData.length,
            onPageChange: setCurrentPage,
            onPageSizeChange: setPageSize,
          }}
          searchFields={searchFields.map((f) => ({ value: f.name, label: f.label }))}
          searchField={searchField}
          searchValue={searchValue}
          onSearchFieldChange={setSearchField}
          onSearchValueChange={setSearchValue}
          emptyMessage="No users available."
        />
      </section>

      <Dialog
        open={coverageDialogOpen}
        onClose={handleCloseCoverageDialog}
  title={activeGroupName ? `Manage Coverage - ${activeGroupName}` : 'Manage Coverage'}
        size="xxl"
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            Draw or adjust polygon areas for this group. Users whose default delivery location falls inside any polygon will
            be assigned automatically.
          </p>
          <GroupCoverageEditor
            polygons={coverageDraft}
            onPolygonsChange={setCoverageDraft}
            disabled={coverageDialogSaving}
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCloseCoverageDialog}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              disabled={coverageDialogSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSaveCoverage()}
              disabled={coverageDialogSaving}
              className="inline-flex items-center justify-center rounded-md bg-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {coverageDialogSaving ? 'Saving…' : 'Save Coverage'}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default GroupUsersPage;
