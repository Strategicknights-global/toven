import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  ClipboardList,
  Mail,
  MapPin,
  Phone,
  PlusCircle,
  UserCheck,
} from 'lucide-react';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import { useUsersStore } from '../stores/usersStore';
import { useConfigStore } from '../stores/configStore';
import { useSubscriptionRequestsStore } from '../stores/subscriptionRequestsStore';
import type { UserSchema } from '../schemas/UserSchema';
import type { SubscriptionRequestSchema } from '../schemas/SubscriptionRequestSchema';
import IconButton from '../components/IconButton';
import ViewSubscriberDialog from '../components/ViewSubscriberDialog';
import AddSubscriptionDialog from '../components/AddSubscriptionDialog';
import type { Timestamp } from 'firebase/firestore';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';
import { getDisplayCustomerId } from '../utils/customerDisplay';

const toDate = (value: unknown): Date | null => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate();
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value?: Date | Timestamp | null): string => {
  const normalized = toDate(value ?? null);
  if (!normalized) {
    return '—';
  }
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(normalized);
  } catch (error) {
    console.error('Failed to format date', error);
    return normalized.toLocaleDateString();
  }
};

const formatCurrency = (value: number): string => {
  const rounded = Math.round(value);
  return `₹${rounded.toLocaleString('en-IN')}`;
};

type SubscriberRow = UserSchema & {
  latestRequest: SubscriptionRequestSchema | null;
  approvedRequests: SubscriptionRequestSchema[];
  activeRequests: SubscriptionRequestSchema[];
  totalActiveValue: number;
  primaryDeliveryAddress: string | null;
};

const SubscribersPage: React.FC = () => {
  const { users, availableRoles, loading: usersLoading, totalItems, paginatedData, loadAvailableRoles, refreshUsers } = useUsersStore();
  const {
    config,
    loading: configLoading,
    loaded: configLoaded,
    loadConfig,
  } = useConfigStore();
  const {
    requests,
    loading: requestsLoading,
    loadRequests,
  } = useSubscriptionRequestsStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('fullName');
  const [searchValue, setSearchValue] = useState('');
  const searchFields = useMemo(() => getSearchFieldsForCollection('users'), []);

  useEffect(() => {
    const search = searchValue ? { field: searchField, type: 'text' as const, value: searchValue } : null;
    void paginatedData({ pageNumber: currentPage, pageSize, search });
  }, [currentPage, pageSize, searchField, searchValue, paginatedData]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchField, searchValue]);

  useEffect(() => {
    if (availableRoles.length === 0) {
      void loadAvailableRoles();
    }
  }, [availableRoles.length, loadAvailableRoles]);

  useEffect(() => {
    if (!configLoaded && !configLoading) {
      void loadConfig();
    }
  }, [configLoaded, configLoading, loadConfig]);

  useEffect(() => {
    void loadRequests();
    void refreshUsers();
  }, [loadRequests, refreshUsers]);

  const subscriberRoleId = useMemo(() => {
    if (config?.defaultSubscriberRoleId) {
      return config.defaultSubscriberRoleId;
    }
    const fallback = availableRoles.find((role) => role.name.toLowerCase() === 'subscriber');
    return fallback?.id ?? null;
  }, [availableRoles, config?.defaultSubscriberRoleId]);

  const requestsByUser = useMemo(() => {
    const resolveTimestamp = (request: SubscriptionRequestSchema): number => {
      if (request.updatedAt instanceof Date) {
        return request.updatedAt.getTime();
      }
      if (request.reviewedAt instanceof Date) {
        return request.reviewedAt.getTime();
      }
      if (request.createdAt instanceof Date) {
        return request.createdAt.getTime();
      }
      return request.startDate instanceof Date ? request.startDate.getTime() : 0;
    };

    const map = new Map<string, SubscriptionRequestSchema[]>();
    const sorted = [...requests].sort((a, b) => resolveTimestamp(b) - resolveTimestamp(a));
    sorted.forEach((request) => {
      if (!request.userId) {
        return;
      }
      const existing = map.get(request.userId);
      if (existing) {
        existing.push(request);
      } else {
        map.set(request.userId, [request]);
      }
    });
    return map;
  }, [requests]);

  const rows: SubscriberRow[] = useMemo(() => {
    if (!subscriberRoleId) {
      return [];
    }
    const now = Date.now();
    return users
      .filter((user) => Array.isArray(user.roles) && user.roles.includes(subscriberRoleId))
      .map((user) => {
        const userRequests = user.id ? requestsByUser.get(user.id) ?? [] : [];
        const approvedRequests = userRequests.filter((request) => request.status === 'approved');
        const activeRequests = approvedRequests.filter((request) => {
          const startTime = request.startDate instanceof Date ? request.startDate.getTime() : 0;
          const endTime = request.endDate instanceof Date ? request.endDate.getTime() : 0;
          if (!startTime || !endTime) {
            return false;
          }
          return startTime <= now && now <= endTime;
        });
        const latestRequest = approvedRequests[0] ?? null;
        const totalActiveValue = activeRequests.reduce((sum, request) => sum + (request.summary?.totalPayable ?? 0), 0);
        const firstActiveAddress = activeRequests.find((request) => request.deliveryLocationAddress?.trim())?.deliveryLocationAddress?.trim();
        const fallbackApprovedAddress = approvedRequests.find((request) => request.deliveryLocationAddress?.trim())?.deliveryLocationAddress?.trim();
        const primaryDeliveryAddress = firstActiveAddress
          || latestRequest?.deliveryLocationAddress?.trim()
          || fallbackApprovedAddress
          || null;

        return {
          ...user,
          latestRequest,
          approvedRequests,
          activeRequests,
          totalActiveValue,
          primaryDeliveryAddress,
        } satisfies SubscriberRow;
      })
      // Sort by creation date descending (newest first)
      .sort((a, b) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : -Infinity;
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : -Infinity;
        return bTime - aTime;
      });
  }, [requestsByUser, subscriberRoleId, users]);

  const roleNameLookup = useMemo(() => {
    return new Map(availableRoles.map((role) => [role.id, role.name] as const));
  }, [availableRoles]);

  const [selectedSubscriber, setSelectedSubscriber] = useState<SubscriberRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogTarget, setAddDialogTarget] = useState<SubscriberRow | null>(null);

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedSubscriber(null);
  };

  const handleCloseAddDialog = () => {
    setAddDialogOpen(false);
    setAddDialogTarget(null);
  };

  const metrics = useMemo(() => {
    const now = Date.now();
    let activeSubscribers = 0;
    let totalProjected = 0;
    let upcomingRenewals = 0;
    let totalSubscribers = rows.length;
    let totalApprovedRevenue = 0;

    rows.forEach((row) => {
      if (row.activeRequests.length > 0) {
        activeSubscribers += 1;
      }

      // Calculate projected revenue from all approved subscriptions
      row.approvedRequests.forEach((request) => {
        totalApprovedRevenue += request.summary?.totalPayable ?? 0;
      });

      row.activeRequests.forEach((request) => {
        totalProjected += request.summary?.totalPayable ?? 0;
        const end = request.endDate;
        const endTime = end instanceof Date ? end.getTime() : 0;
        if (endTime > now && endTime - now <= 7 * 24 * 60 * 60 * 1000) {
          upcomingRenewals += 1;
        }
      });
    });

    const pendingApprovals = requests.filter((request) => request.status === 'pending').length;

    return {
      totalSubscribers,
      totalApprovedRevenue,
      activeSubscribers,
      totalProjected,
      upcomingRenewals,
      pendingApprovals,
    };
  }, [requests, rows]);

  const columns = useMemo<DataTableColumnDef<SubscriberRow>[]>(() => [
    {
      id: 'subscriber',
      header: 'Subscriber',
      meta: { cellClassName: 'align-top' },
      cell: ({ row }) => {
        const subscriber = row.original;
        return (
          <div className="space-y-1 text-sm text-slate-700">
            <p className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <UserCheck size={18} className="text-purple-500" />
              {subscriber.fullName}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Mail size={12} />
                {subscriber.email}
              </span>
              {subscriber.userType ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-600">
                  {subscriber.userType}
                </span>
              ) : null}
            </div>
            {subscriber.customerId ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                CID:{' '}
                <span className="font-mono text-xs">
                  {getDisplayCustomerId(subscriber.customerId, subscriber.id, { allowFallback: true })}
                </span>
              </span>
            ) : null}
            <p className="text-xs text-slate-400">
              Joined {formatDate(subscriber.createdAt ?? null)}
            </p>
          </div>
        );
      },
    },
    {
      id: 'contact',
      header: 'Contact',
      meta: { cellClassName: 'align-top' },
      cell: ({ row }) => {
        const subscriber = row.original;
        return (
          <div className="space-y-1 text-xs text-slate-600">
            {subscriber.phone ? (
              <p className="flex items-center gap-2">
                <Phone size={12} className="text-slate-400" />
                <span className="font-medium text-slate-700">{subscriber.phone}</span>
              </p>
            ) : null}
            {subscriber.primaryDeliveryAddress ? (
              <p className="flex items-start gap-2">
                <MapPin size={12} className="mt-0.5 text-slate-400" />
                <span className="text-slate-500">{subscriber.primaryDeliveryAddress}</span>
              </p>
            ) : (
              <span className="text-slate-400">No delivery location on file</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'active-plans',
      header: 'Active Plans',
      meta: { cellClassName: 'align-top' },
      cell: ({ row }) => {
        const { activeRequests, approvedRequests, totalActiveValue } = row.original;

        if (activeRequests.length === 0) {
          if (approvedRequests.length > 0) {
            const latest = approvedRequests[0];
            const isExpired = latest.endDate instanceof Date && latest.endDate < new Date();
            return (
              <div className="space-y-1 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-700">{latest.categoryName}</p>
                  {isExpired && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                      Expired
                    </span>
                  )}
                </div>
                <p className="flex items-center gap-2 text-slate-400">
                  <CalendarClock size={12} />
                  {formatDate(latest.startDate)} → {formatDate(latest.endDate)} ({latest.durationDays} days)
                </p>
                <p className="text-[11px] text-slate-400">
                  {isExpired ? 'Ended on' : 'Ends on'} {formatDate(latest.endDate)}
                </p>
              </div>
            );
          }
          return <span className="text-xs text-slate-400">No approved plans yet</span>;
        }

        return (
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-400">
              <span>{activeRequests.length} active subscription{activeRequests.length > 1 ? 's' : ''}</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(totalActiveValue)}</span>
            </div>
            {activeRequests.map((request, index) => (
              <div
                key={request.id ?? `active-${index}`}
                className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 shadow-sm"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-emerald-800">{request.categoryName}</p>
                  <span className="text-[11px] font-semibold text-emerald-700">{formatCurrency(request.summary.totalPayable)}</span>
                </div>
                <p className="flex items-center gap-2 text-[11px] text-emerald-700">
                  <CalendarClock size={12} />
                  {formatDate(request.startDate)} → {formatDate(request.endDate)} ({request.durationDays} days)
                </p>
                {request.selections.length > 0 ? (
                  <ul className="flex flex-wrap gap-1 text-[10px]">
                    {request.selections.map((selection, selectionIndex) => (
                      <li
                        key={`${request.id ?? `active-${index}`}-selection-${selectionIndex}`}
                        className="rounded-full bg-white px-2 py-0.5 text-emerald-700 shadow-inner"
                      >
                        {selection.mealType} • {selection.packageName}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      meta: { cellClassName: 'align-top' },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <IconButton
            label="Add subscription"
            icon={<PlusCircle size={16} />}
            variant="primary"
            onClick={() => {
              setAddDialogTarget(row.original);
              setAddDialogOpen(true);
            }}
          />
          <IconButton
            label="View subscription details"
            icon={<ClipboardList size={16} />}
            onClick={() => {
              setSelectedSubscriber(row.original);
              setDialogOpen(true);
            }}
          />
        </div>
      ),
    },
  ], []);

  const loading = usersLoading || configLoading || requestsLoading;
  const selectedRequests = selectedSubscriber?.id ? requestsByUser.get(selectedSubscriber.id) ?? [] : [];
  const dialogIsOpen = dialogOpen && Boolean(selectedSubscriber);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-purple-600">Admin • Subscribers</p>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
              <UserCheck size={32} className="text-purple-500" /> Manage subscribers
            </h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Track active subscribers, monitor plan renewals, and review recent subscription activity in one place.
            </p>
          </div>
          <div className="flex items-start justify-end">
            <button
              type="button"
              onClick={() => {
                setAddDialogTarget(null);
                setAddDialogOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <PlusCircle size={16} className="text-white" />
              <span>Add subscription</span>
            </button>
          </div>
        </div>

        {!subscriberRoleId ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            <p className="font-semibold">Subscriber role not configured.</p>
            <p className="mt-1 text-amber-700/90">
              Set a default subscriber role from Site Settings → Defaults to populate this view.
            </p>
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total subscribers</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{metrics.totalSubscribers}</p>
            <p className="text-xs text-slate-500">All registered subscribers</p>
          </div>
          <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">Total approved revenue</p>
            <p className="mt-2 text-2xl font-bold text-purple-700">{formatCurrency(metrics.totalApprovedRevenue)}</p>
            <p className="text-xs text-purple-700/80">From all approved subscriptions</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Active subscribers</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{metrics.activeSubscribers}</p>
            <p className="text-xs text-emerald-700/80">With at least one active plan</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Active revenue</p>
            <p className="mt-2 text-2xl font-bold text-blue-700">{formatCurrency(metrics.totalProjected)}</p>
            <p className="text-xs text-blue-700/80">Sum across active plans</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Upcoming renewals</p>
            <p className="mt-2 text-2xl font-bold text-amber-700">{metrics.upcomingRenewals}</p>
            <p className="text-xs text-amber-700/80">Plans ending in 7 days</p>
          </div>
        </section>
      </header>

      <DataTable<SubscriberRow>
        data={rows}
        columns={columns}
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
        emptyMessage={subscriberRoleId ? 'No subscribers yet. Approved subscription requests will appear here.' : 'Configure a subscriber role to populate this table.'}
        enableSorting
      />

      <ViewSubscriberDialog
        open={dialogIsOpen}
        subscriber={selectedSubscriber}
        requests={selectedRequests}
        roleNameLookup={roleNameLookup}
        subscriberRoleId={subscriberRoleId}
        onClose={handleCloseDialog}
      />
      <AddSubscriptionDialog
        open={addDialogOpen}
        subscriber={addDialogTarget}
        onClose={handleCloseAddDialog}
      />
    </div>
  );
};

export default SubscribersPage;
