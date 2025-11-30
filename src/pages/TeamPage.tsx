import React, { useEffect, useMemo, useState } from 'react';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import { useUsersStore } from '../stores/usersStore';
import { useConfigStore } from '../stores/configStore';
import type { UserSchema } from '../schemas/UserSchema';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';

const ROLE_LABELS = {
  chef: 'Chef',
  delivery: 'Delivery',
  supervisor: 'Supervisor',
  helper: 'Helper',
} as const;

type TeamSegment = keyof typeof ROLE_LABELS;

type TeamMemberRow = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  segments: TeamSegment[];
  user: UserSchema;
};

const ROLE_TYPE_SEGMENT_MAP: Record<string, TeamSegment> = {
  chef: 'chef',
  delivery: 'delivery',
  supervisor: 'supervisor',
  helpers: 'helper',
  helper: 'helper',
};

const normalizeRoleName = (value: string | undefined | null): string =>
  (value ?? '').trim().toLowerCase();

const determineSegments = (
  user: UserSchema,
  roleIdToSegment: Map<string, TeamSegment>,
): TeamSegment[] => {
  const segments = new Set<TeamSegment>();

  (user.roles ?? []).forEach((roleId) => {
    const segment = roleIdToSegment.get(roleId);
    if (segment) {
      segments.add(segment);
    }
  });

  const fallbackSegment = ROLE_TYPE_SEGMENT_MAP[normalizeRoleName(user.roleType)];
  if (fallbackSegment) {
    segments.add(fallbackSegment);
  }

  return Array.from(segments);
};

const buildMemberRows = (
  users: UserSchema[],
  roleIdToSegment: Map<string, TeamSegment>,
): TeamMemberRow[] => {
  const rows: TeamMemberRow[] = [];

  users.forEach((user) => {
    const segments = determineSegments(user, roleIdToSegment);
    if (segments.length === 0) {
      return;
    }

    rows.push({
      id: user.id ?? `${user.fullName}-${segments.join('-')}`,
      name: user.fullName,
      email: user.email,
      phone: user.phone ?? user.contactNumber ?? undefined,
      segments,
      user,
    });
  });

  // Sort by creation date descending (newest first)
  return rows.sort((a, b) => {
    const aTime = a.user.createdAt instanceof Date ? a.user.createdAt.getTime() : -Infinity;
    const bTime = b.user.createdAt instanceof Date ? b.user.createdAt.getTime() : -Infinity;
    return bTime - aTime;
  });
};

const TeamPage: React.FC = () => {
  const users = useUsersStore((state) => state.users);
  const loading = useUsersStore((state) => state.loading);
  const totalItems = useUsersStore((state) => state.totalItems);
  const paginatedData = useUsersStore((state) => state.paginatedData);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('fullName');
  const [searchValue, setSearchValue] = useState('');
  const searchFields = useMemo(() => getSearchFieldsForCollection('users'), []);

  const config = useConfigStore((state) => state.config);
  const configLoading = useConfigStore((state) => state.loading);
  const configLoaded = useConfigStore((state) => state.loaded);
  const loadConfig = useConfigStore((state) => state.loadConfig);

  useEffect(() => {
    const search = searchValue ? { field: searchField, type: 'text' as const, value: searchValue } : null;
    void paginatedData({ pageNumber: currentPage, pageSize, search });
  }, [currentPage, pageSize, searchField, searchValue, paginatedData]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchField, searchValue]);

  useEffect(() => {
    if (!configLoaded && !configLoading) {
      void loadConfig();
    }
  }, [configLoaded, configLoading, loadConfig]);

  const roleIdToSegment = useMemo(() => {
    const map = new Map<string, TeamSegment>();
    if (config?.defaultChefRoleId) {
      map.set(config.defaultChefRoleId, 'chef');
    }
    if (config?.defaultDeliveryRoleId) {
      map.set(config.defaultDeliveryRoleId, 'delivery');
    }
    if (config?.defaultSupervisorRoleId) {
      map.set(config.defaultSupervisorRoleId, 'supervisor');
    }
    if (config?.defaultHelpersRoleId) {
      map.set(config.defaultHelpersRoleId, 'helper');
    }
    return map;
  }, [
    config?.defaultChefRoleId,
    config?.defaultDeliveryRoleId,
    config?.defaultSupervisorRoleId,
    config?.defaultHelpersRoleId,
  ]);

  const members = useMemo(
    () => buildMemberRows(users, roleIdToSegment),
    [users, roleIdToSegment],
  );

  const columns = useMemo<DataTableColumnDef<TeamMemberRow>[]>(
    () => [
      {
        id: 'id',
        header: 'TEAM MEMBER ID',
        cell: ({ row }) => row.original.user.id ?? row.original.id ?? '—',
        meta: { cellClassName: 'text-xs font-mono text-slate-600 whitespace-nowrap' },
      },
      {
        accessorKey: 'name',
        header: 'Name',
        meta: { cellClassName: 'text-sm font-medium text-slate-800 whitespace-nowrap' },
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => <span className="text-sm text-slate-500">{row.original.email ?? '—'}</span>,
        meta: { cellClassName: 'text-sm text-slate-500 whitespace-nowrap' },
      },
      {
        id: 'phone',
        header: 'Phone',
        cell: ({ row }) => <span className="text-sm text-slate-500">{row.original.phone ?? '—'}</span>,
        meta: { cellClassName: 'text-sm text-slate-500 whitespace-nowrap' },
      },
      {
        id: 'role',
        header: 'Role',
        cell: ({ row }) => (
          row.original.segments.length > 0
            ? row.original.segments.map((segment) => ROLE_LABELS[segment]).join(', ')
            : '—'
        ),
        meta: { cellClassName: 'text-sm text-slate-600 whitespace-nowrap' },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: () => <span className="text-xs text-slate-400">—</span>,
        meta: { cellClassName: 'text-xs text-slate-400 whitespace-nowrap' },
      },
    ],
    [],
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Team</h1>
      <DataTable<TeamMemberRow>
        columns={columns}
        data={members}
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
        emptyMessage="No team members found."
      />
    </div>
  );
};

export default TeamPage;
