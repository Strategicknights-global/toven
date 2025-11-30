import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Ban,
  CalendarClock,
  ClipboardList,
  PauseCircle,
  RefreshCcw,
  Users,
} from 'lucide-react';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import { useSubscriptionRequestsStore } from '../stores/subscriptionRequestsStore';
import type { MealType } from '../schemas/FoodItemSchema';
import type { SubscriptionRequestSchema } from '../schemas/SubscriptionRequestSchema';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';
import { getDisplayCustomerId } from '../utils/customerDisplay';

interface PausedMealRow {
  id: string;
  subscriptionId: string;
  customerId: string;
  customerShortId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  categoryName: string;
  mealType: MealType;
  pausedDate: Date | null;
  pausedDateLabel: string;
  status: SubscriptionRequestSchema['status'];
  dietPreference: SubscriptionRequestSchema['dietPreference'];
  startDate?: Date;
  endDate?: Date;
}

const formatDate = (value?: Date | null): string => {
  if (!value) {
    return '—';
  }
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(value);
  } catch (error) {
    console.error('Failed to format date', error);
    return value.toLocaleDateString();
  }
};

const parsePausedDate = (input: string): Date | null => {
  if (!input) {
    return null;
  }
  const parsed = new Date(`${input}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateRange = (from?: Date | null, to?: Date | null): string => {
  const startLabel = formatDate(from);
  const endLabel = formatDate(to);
  const hasStart = startLabel !== '—';
  const hasEnd = endLabel !== '—';

  if (!hasStart && !hasEnd) {
    return '—';
  }
  if (hasStart && hasEnd) {
    return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
  }
  if (hasStart) {
    return `From ${startLabel}`;
  }
  return `Until ${endLabel}`;
};

const PausedMealsPage: React.FC = () => {
  const subscriptions = useSubscriptionRequestsStore((state) => state.requests);
  const loadSubscriptions = useSubscriptionRequestsStore((state) => state.loadRequests);
  const refreshSubscriptions = useSubscriptionRequestsStore((state) => state.refresh);
  const loading = useSubscriptionRequestsStore((state) => state.loading);
  const totalItems = useSubscriptionRequestsStore((state) => state.totalItems);
  const paginatedData = useSubscriptionRequestsStore((state) => state.paginatedData);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('id');
  const [searchValue, setSearchValue] = useState('');
  const searchFields = useMemo(() => getSearchFieldsForCollection('subscriptionRequests'), []);

  useEffect(() => {
    const search = searchValue ? { field: searchField, type: 'text' as const, value: searchValue } : null;
    void paginatedData({ pageNumber: currentPage, pageSize, search });
  }, [currentPage, pageSize, searchField, searchValue, paginatedData]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchField, searchValue]);

  const initialLoadRef = useRef(false);
  useEffect(() => {
    if (initialLoadRef.current) {
      return;
    }
    initialLoadRef.current = true;
    void loadSubscriptions();
  }, [loadSubscriptions]);

  const handleRefresh = useCallback(async () => {
    await refreshSubscriptions();
  }, [refreshSubscriptions]);

  const pausedRows = useMemo<PausedMealRow[]>(() => {
    const rows: PausedMealRow[] = [];

    subscriptions.forEach((subscription) => {
      if (!subscription.id || !subscription.pausedMeals || subscription.pausedMeals.length === 0) {
        return;
      }

      subscription.pausedMeals.forEach((paused) => {
        const pausedDate = parsePausedDate(paused.date);
        rows.push({
          id: `${subscription.id}-${paused.date}-${paused.mealType}`,
          subscriptionId: subscription.id ?? '',
          customerId: subscription.userId,
          customerShortId: subscription.customerShortId ?? null,
          customerName: subscription.userName,
          customerEmail: subscription.userEmail ?? null,
          customerPhone: subscription.userPhone ?? null,
          categoryName: subscription.categoryName,
          mealType: paused.mealType,
          pausedDate,
          pausedDateLabel: paused.date,
          status: subscription.status,
          dietPreference: subscription.dietPreference,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
        });
      });
    });

    return rows.sort((a, b) => {
      const aTime = a.pausedDate?.getTime() ?? Number.POSITIVE_INFINITY;
      const bTime = b.pausedDate?.getTime() ?? Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });
  }, [subscriptions]);

  const metrics = useMemo(() => {
    const uniqueSubscriptions = new Set<string>();
    const uniqueCustomers = new Set<string>();
    let upcomingWithinWeek = 0;
    let totalPaused = 0;

    const now = Date.now();
    const sevenDaysAhead = now + 7 * 24 * 60 * 60 * 1000;

    pausedRows.forEach((row) => {
      totalPaused += 1;
      uniqueSubscriptions.add(row.subscriptionId);
      uniqueCustomers.add(row.customerId);

      const timestamp = row.pausedDate?.getTime();
      if (timestamp && timestamp >= now && timestamp <= sevenDaysAhead) {
        upcomingWithinWeek += 1;
      }
    });

    return {
      totalPaused,
      uniqueSubscriptions: uniqueSubscriptions.size,
      uniqueCustomers: uniqueCustomers.size,
      upcomingWithinWeek,
    };
  }, [pausedRows]);

  const columns = useMemo<DataTableColumnDef<PausedMealRow>[]>(() => [
    {
      id: 'subscription',
      header: 'Subscription',
      meta: { cellClassName: 'align-top text-sm text-slate-600' },
      cell: ({ row }) => {
        const subscription = subscriptions.find((item) => item.id === row.original.subscriptionId);
        return (
          <div className="space-y-1">
            <div className="font-mono text-sm text-slate-700">{row.original.subscriptionId}</div>
            {subscription ? (
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                  {subscription.categoryName}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium capitalize text-slate-600">
                  {subscription.status}
                </span>
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      id: 'customer',
      header: 'Customer',
      meta: { cellClassName: 'align-top text-sm text-slate-600' },
      cell: ({ row }) => {
        const { customerName, customerEmail, customerPhone } = row.original;
        const displayId = getDisplayCustomerId(row.original.customerShortId, row.original.customerId, {
          allowFallback: true,
        });
        return (
          <div className="space-y-1">
            <p className="font-semibold text-slate-900">{customerName}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {displayId !== '—' ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                  CID: {displayId}
                </span>
              ) : null}
              {customerPhone ? <span>{customerPhone}</span> : null}
              {customerEmail ? <span className="text-slate-400">{customerEmail}</span> : null}
            </div>
          </div>
        );
      },
    },
    {
      id: 'meal-date',
      header: 'Paused Date',
      meta: { cellClassName: 'align-top text-sm text-slate-600' },
      cell: ({ row }) => {
        const subscription = subscriptions.find((item) => item.id === row.original.subscriptionId);
        const primaryLabel = formatDate(row.original.pausedDate);
        const rangeLabel = subscription ? formatDateRange(subscription.startDate, subscription.endDate) : '—';

        if (rangeLabel !== '—' && primaryLabel !== '—' && rangeLabel !== primaryLabel) {
          return (
            <div className="space-y-1">
              <span>{primaryLabel}</span>
              <span className="text-xs text-slate-500">{rangeLabel}</span>
            </div>
          );
        }

        const label = primaryLabel !== '—' ? primaryLabel : rangeLabel;
        return <span>{label}</span>;
      },
    },
    {
      id: 'meal-type',
      header: 'Meal Window',
      meta: { cellClassName: 'align-top text-sm text-slate-600' },
      cell: ({ row }) => <span className="font-medium text-slate-700">{row.original.mealType}</span>,
    },
    {
      id: 'diet-preference',
      header: 'Diet Preference',
      meta: { cellClassName: 'align-top text-sm text-slate-600' },
      cell: ({ row }) => <span className="capitalize text-slate-600">{row.original.dietPreference.replace('-', ' ')}</span>,
    },
  ], [subscriptions]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-purple-600">Admin • Subscriptions</p>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
            <PauseCircle className="h-8 w-8 text-purple-500" />
            Paused Meals
          </h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Track upcoming paused meals to reduce waste and keep the kitchen informed of subscription adjustments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleRefresh()}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-purple-400 hover:text-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            disabled={loading}
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <div className="rounded-xl border border-purple-200 bg-purple-50/80 p-4">
          <div className="flex items-center justify-between text-sm text-purple-600">
            <span>Total paused meals</span>
            <PauseCircle className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-purple-700">{metrics.totalPaused}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
          <div className="flex items-center justify-between text-sm text-emerald-600">
            <span>Upcoming 7 days</span>
            <CalendarClock className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{metrics.upcomingWithinWeek}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Unique subscriptions</span>
            <ClipboardList className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-800">{metrics.uniqueSubscriptions}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4">
          <div className="flex items-center justify-between text-sm text-amber-600">
            <span>Affected customers</span>
            <Users className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-700">{metrics.uniqueCustomers}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4">
          <div className="flex items-center justify-between text-sm text-rose-600">
            <span>Cancelled subscriptions</span>
            <Ban className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-700">{subscriptions.filter((item) => item.status === 'cancelled').length}</p>
        </div>
      </section>

      <DataTable
        columns={columns}
        data={pausedRows}
        loading={loading}
        emptyMessage="No paused meals recorded yet."
        pagination={{
          currentPage,
          pageSize,
          totalItems: totalItems ?? 0,
          onPageChange: setCurrentPage,
          onPageSizeChange: setPageSize,
        }}
        searchFields={searchFields.map(f => ({ value: f.name, label: f.label }))}
        searchField={searchField}
        searchValue={searchValue}
        onSearchFieldChange={setSearchField}
        onSearchValueChange={setSearchValue}
      />
    </div>
  );
};

export default PausedMealsPage;
