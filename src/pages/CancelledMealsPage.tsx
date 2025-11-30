import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Ban,
  CalendarClock,
  ClipboardX,
  IndianRupee,
  RefreshCcw,
  UserCircle2,
} from 'lucide-react';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import { useCancelledMealsStore } from '../stores/cancelledMealsStore';
import { useSubscriptionRequestsStore } from '../stores/subscriptionRequestsStore';
import { useUsersStore } from '../stores/usersStore';
import type { CancelledMealSchema } from '../schemas/CancelledMealSchema';
import type { SubscriptionRequestSchema } from '../schemas/SubscriptionRequestSchema';
import { getDisplayCustomerId } from '../utils/customerDisplay';

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

const formatDateTime = (value?: Date | null): string => {
  if (!value) {
    return '—';
  }
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(value);
  } catch (error) {
    console.error('Failed to format date time', error);
    return value.toLocaleString();
  }
};

const formatCurrency = (value?: number | null, currency: string = 'INR'): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch (error) {
    console.error('Failed to format currency', error);
    return `₹${value.toFixed(2)}`;
  }
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

const CancelledMealsPage: React.FC = () => {
  const loading = useCancelledMealsStore((state) => state.loading);
  const refresh = useCancelledMealsStore((state) => state.refresh);

  const subscriptionRequests = useSubscriptionRequestsStore((state) => state.requests);
  const loadSubscriptionRequests = useSubscriptionRequestsStore((state) => state.loadRequests);
  const loadingSubscriptions = useSubscriptionRequestsStore((state) => state.loading);
  const refreshSubscriptions = useSubscriptionRequestsStore((state) => state.refresh);

  const { users, loadUsers } = useUsersStore();

  useEffect(() => {
    void loadSubscriptionRequests();
    void loadUsers();
  }, [loadSubscriptionRequests, loadUsers]);

  const handleRefresh = useCallback(async () => {
    await Promise.allSettled([refresh(), refreshSubscriptions()]);
  }, [refresh, refreshSubscriptions]);

  const subscriptionMap = useMemo(() => {
    const map = new Map<string, SubscriptionRequestSchema>();
    subscriptionRequests.forEach((request) => {
      if (request.id) {
        map.set(request.id, request);
      }
    });
    return map;
  }, [subscriptionRequests]);

  const usersMap = useMemo(() => {
    const map = new Map<string, { customerId?: string | null }>();
    users.forEach((user) => {
      if (user.id) {
        map.set(user.id, { customerId: user.customerId });
      }
    });
    return map;
  }, [users]);

  const cancelledSubscriptionRecords = useMemo<CancelledMealSchema[]>(() => {
    return subscriptionRequests
      .filter((request) => request.status === 'cancelled' && request.id)
      .map((request) => {
        const packageNames = request.selections.map((selection) => selection.packageName).filter(Boolean);

        return {
          id: `subscription-${request.id}`,
          subscriptionId: request.id ?? null,
          customerId: request.userId,
          customerShortId: request.customerShortId ?? null,
          customerName: request.userName,
          customerPhone: request.userPhone ?? null,
          customerEmail: request.userEmail ?? null,
          packageId: null,
          packageName: packageNames.length > 0 ? packageNames.join(', ') : request.categoryName,
          mealType: null,
          mealDate: null,
          cancelledAt: request.cancelledAt ?? request.updatedAt ?? request.reviewedAt ?? null,
          price: request.refundInfo?.amount ?? null,
          currency: 'INR',
          reason: request.statusNote ?? 'Subscription cancelled',
          recordedById: request.reviewedBy ?? null,
          recordedByName: request.reviewedByName ?? null,
        } satisfies CancelledMealSchema;
      });
  }, [subscriptionRequests]);

  const combinedData = useMemo<CancelledMealSchema[]>(() => {
    return cancelledSubscriptionRecords.sort((a, b) => {
      const aTime = a.cancelledAt instanceof Date ? a.cancelledAt.getTime() : -Infinity;
      const bTime = b.cancelledAt instanceof Date ? b.cancelledAt.getTime() : -Infinity;
      return bTime - aTime;
    });
  }, [cancelledSubscriptionRecords]);

  const metrics = useMemo(() => {
    const uniqueCustomers = new Set<string>();
    let totalRevenueImpact = 0;
    let recentCancellations = 0;
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    combinedData.forEach((record) => {
      if (record.customerId) {
        uniqueCustomers.add(record.customerId);
      }
      if (typeof record.price === 'number') {
        totalRevenueImpact += record.price;
      }
      const cancelledAtTime = record.cancelledAt instanceof Date ? record.cancelledAt.getTime() : null;
      if (cancelledAtTime && cancelledAtTime >= sevenDaysAgo) {
        recentCancellations += 1;
      }
    });

    return {
      count: combinedData.length,
      uniqueCustomers: uniqueCustomers.size,
      totalRevenueImpact,
      recentCancellations,
      cancelledSubscriptions: combinedData.length,
    };
  }, [combinedData]);

  const columns = useMemo<DataTableColumnDef<CancelledMealSchema>[]>(() => [
    {
      id: 'subscription',
      header: 'Subscription',
      meta: { cellClassName: 'align-top text-sm text-slate-600' },
      cell: ({ row }) => {
        const subscriptionId = row.original.subscriptionId;
        if (!subscriptionId) {
          return (
            <span className="text-xs text-slate-500">—</span>
          );
        }
        const subscription = subscriptionMap.get(subscriptionId);
        return (
          <div className="space-y-1">
            <div className="font-mono text-sm text-slate-700">{subscriptionId}</div>
            {subscription ? (
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                  {subscription.categoryName}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-medium capitalize ${
                    subscription.status === 'cancelled'
                      ? 'bg-rose-100 text-rose-600'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {subscription.status}
                </span>
              </div>
            ) : (
              <span className="text-[11px] italic text-slate-400">Subscription not found</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'customer-id',
      header: 'Customer ID',
      meta: { cellClassName: 'align-top text-xs text-slate-500' },
      cell: ({ row }) => {
        const customerId = row.original.customerId;
        const candidateShortId = row.original.customerShortId ?? usersMap.get(customerId)?.customerId ?? undefined;
        const displayId = getDisplayCustomerId(candidateShortId, customerId, { allowFallback: true });
        return (
          <div className="space-y-1">
            <p className="font-mono text-sm font-semibold text-slate-900">{displayId}</p>
          </div>
        );
      },
    },
    {
      id: 'customer',
      header: 'Customer',
      meta: { cellClassName: 'align-top' },
      cell: ({ row }) => {
        const meal = row.original;
        return (
          <div className="space-y-1 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">{meal.customerName || '—'}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {meal.customerPhone ? (
                <span>{meal.customerPhone}</span>
              ) : null}
              {meal.customerEmail ? (
                <span className="text-slate-400">{meal.customerEmail}</span>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      id: 'package',
      header: 'Package',
      meta: { cellClassName: 'align-top' },
      cell: ({ row }) => {
        const meal = row.original;
        return (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-800">{meal.packageName || '—'}</p>
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
              {meal.mealType ? (
                <span className="rounded-full bg-purple-50 px-2 py-0.5 font-medium text-purple-600">{meal.mealType}</span>
              ) : null}
              {meal.reason ? (
                <span className="italic text-slate-400">{meal.reason}</span>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      id: 'cancelled-at',
      header: 'Cancellation Date & Time',
      meta: { cellClassName: 'align-top text-sm text-slate-600' },
      cell: ({ row }) => (
        <span>{formatDateTime(row.original.cancelledAt)}</span>
      ),
    },
    {
      id: 'meal-date',
      header: 'Meal Date',
      meta: { cellClassName: 'align-top text-sm text-slate-600' },
      cell: ({ row }) => {
        const subscription = row.original.subscriptionId ? subscriptionMap.get(row.original.subscriptionId) : undefined;
        const mealDateLabel = formatDate(row.original.mealDate);
        const rangeLabel = subscription ? formatDateRange(subscription.startDate, subscription.endDate) : '—';

        if (mealDateLabel !== '—' && rangeLabel !== '—' && mealDateLabel !== rangeLabel) {
          return (
            <div className="space-y-1">
              <span>{mealDateLabel}</span>
              <span className="text-xs text-slate-500">{rangeLabel}</span>
            </div>
          );
        }

        const label = rangeLabel !== '—' ? rangeLabel : mealDateLabel;
        return <span>{label}</span>;
      },
    },
    {
      id: 'price',
      header: 'Price',
      meta: { cellClassName: 'align-top text-sm font-semibold text-slate-700' },
      cell: ({ row }) => (
        <span className="text-emerald-600">{formatCurrency(row.original.price, row.original.currency ?? 'INR')}</span>
      ),
    },
  ], [subscriptionMap, usersMap]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-purple-600">Admin • Subscriptions</p>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
            <Ban className="h-8 w-8 text-purple-500" />
            Cancelled Subscriptions
          </h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Monitor cancelled subscriptions, understand their impact on revenue, and follow up with affected customers to reduce churn.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleRefresh()}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-purple-400 hover:text-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            disabled={loading || loadingSubscriptions}
          >
            <RefreshCcw className={`h-4 w-4 ${loading || loadingSubscriptions ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <div className="rounded-xl border border-purple-200 bg-purple-50/80 p-4">
          <div className="flex items-center justify-between text-sm text-purple-600">
            <span>Total cancellations</span>
            <Ban className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-purple-700">{metrics.count}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
          <div className="flex items-center justify-between text-sm text-emerald-600">
            <span>Revenue impact</span>
            <IndianRupee className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{formatCurrency(metrics.totalRevenueImpact)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Affected customers</span>
            <UserCircle2 className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-800">{metrics.uniqueCustomers}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4">
          <div className="flex items-center justify-between text-sm text-amber-600">
            <span>Past 7 days</span>
            <CalendarClock className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-700">{metrics.recentCancellations}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4">
          <div className="flex items-center justify-between text-sm text-rose-600">
            <span>Cancelled subscriptions</span>
            <ClipboardX className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-700">{metrics.cancelledSubscriptions}</p>
        </div>
      </section>

      <DataTable
        columns={columns}
        data={combinedData}
        loading={loading || loadingSubscriptions}
        emptyMessage="No cancelled subscriptions recorded yet."
      />
    </div>
  );
};

export default CancelledMealsPage;
