import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  ClipboardList,
  Mail,
  Phone,
  ShoppingBasket,
  UserCheck,
} from 'lucide-react';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import Dialog from '../components/Dialog';
import IconButton from '../components/IconButton';
import { useAddonRequestsStore } from '../stores/addonRequestsStore';
import type { AddonRequestSchema } from '../schemas/AddonRequestSchema';
import type { Timestamp } from 'firebase/firestore';
import { useUsersStore } from '../stores/usersStore';
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

const formatDateTime = (value?: Date | null): string => {
  if (!value) {
    return '—';
  }
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(value);
  } catch (error) {
    console.error('Failed to format datetime', error);
    return value.toLocaleString();
  }
};

const formatNumber = (value: number): string => value.toLocaleString('en-IN');

type ApprovedAddonRow = {
  userId: string;
  customerShortId?: string | null;
  userName: string;
  userEmail?: string | null;
  userPhone?: string | null;
  createdAt?: Date | Timestamp | null;
  confirmedRequests: AddonRequestSchema[];
  upcomingOrders: AddonRequestSchema[];
  totalCoins: number;
  totalQuantity: number;
};

const ApprovedAddonsPage: React.FC = () => {
  const {
    requests,
    loading: requestsLoading,
    loadRequests,
  } = useAddonRequestsStore();
  const users = useUsersStore((state) => state.users);
  const usersLoading = useUsersStore((state) => state.loading);
  const refreshUsers = useUsersStore((state) => state.refreshUsers);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!usersLoading && users.length === 0) {
      void refreshUsers();
    }
  }, [usersLoading, users.length, refreshUsers]);

  const userIdToCustomerId = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((user) => {
      if (user.id && user.customerId) {
        const trimmed = user.customerId.trim();
        if (trimmed.length > 0) {
          map.set(user.id, trimmed);
        }
      }
    });
    return map;
  }, [users]);

  const requestsByUser = useMemo(() => {
    const map = new Map<string, AddonRequestSchema[]>();
    const sorted = [...requests]
      .filter((request) => request.status === 'confirmed')
      .sort((a, b) => {
        const aTime = a.deliveryDate?.getTime() ?? 0;
        const bTime = b.deliveryDate?.getTime() ?? 0;
        return bTime - aTime;
      });

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

  const rows: ApprovedAddonRow[] = useMemo(() => {
    const now = Date.now();
    const userRows: ApprovedAddonRow[] = [];

    requestsByUser.forEach((userRequests, userId) => {
      const firstRequest = userRequests[0];
      if (!firstRequest) return;

      const confirmedRequests = userRequests.filter((request) => request.status === 'confirmed');
      
      const upcomingOrders = confirmedRequests.filter((request) => {
        const deliveryTime = request.deliveryDate instanceof Date ? request.deliveryDate.getTime() : 0;
        return deliveryTime >= now;
      });

      const totalCoins = confirmedRequests.reduce((sum, request) => sum + (request.summary?.totalCoins ?? 0), 0);
      const totalQuantity = confirmedRequests.reduce((sum, request) => sum + (request.summary?.totalQuantity ?? 0), 0);

      userRows.push({
        userId,
        customerShortId: userIdToCustomerId.get(userId) ?? null,
        userName: firstRequest.userName,
        userEmail: firstRequest.userEmail,
        userPhone: firstRequest.userPhone,
        createdAt: firstRequest.createdAt,
        confirmedRequests,
        upcomingOrders,
        totalCoins,
        totalQuantity,
      });
    });

    return userRows.sort((a, b) => b.upcomingOrders.length - a.upcomingOrders.length || b.totalCoins - a.totalCoins);
  }, [requestsByUser]);

  const [selectedCustomer, setSelectedCustomer] = useState<ApprovedAddonRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedCustomer(null);
  };

  const metrics = useMemo(() => {
    const now = Date.now();
    let activeCustomers = 0;
    let totalUpcomingCoins = 0;
    let totalUpcomingQuantity = 0;
    let deliveriesThisWeek = 0;

    rows.forEach((row) => {
      if (row.upcomingOrders.length > 0) {
        activeCustomers += 1;
      }

      row.upcomingOrders.forEach((request) => {
        totalUpcomingCoins += request.summary?.totalCoins ?? 0;
        totalUpcomingQuantity += request.summary?.totalQuantity ?? 0;

        const deliveryTime = request.deliveryDate instanceof Date ? request.deliveryDate.getTime() : 0;
        if (deliveryTime >= now && deliveryTime - now <= 7 * 24 * 60 * 60 * 1000) {
          deliveriesThisWeek += 1;
        }
      });
    });

    const pendingRequests = requests.filter((request) => request.status === 'pending').length;

    return {
      activeCustomers,
      totalUpcomingCoins,
      totalUpcomingQuantity,
      deliveriesThisWeek,
      pendingRequests,
    };
  }, [requests, rows]);

  const columns = useMemo<DataTableColumnDef<ApprovedAddonRow>[]>(() => [
    {
      id: 'customer',
      header: 'Customer',
      meta: { cellClassName: 'align-top' },
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div className="space-y-1 text-sm text-slate-700">
            <p className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <UserCheck size={18} className="text-purple-500" />
              {customer.userName}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Mail size={12} />
                {customer.userEmail}
              </span>
              {(() => {
                const displayId = getDisplayCustomerId(customer.customerShortId, customer.userId, { allowFallback: true });
                if (displayId === '—') {
                  return null;
                }
                return (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                    CID: <span className="text-xs">{displayId}</span>
                  </span>
                );
              })()}
            </div>
            <p className="text-xs text-slate-400">
              Joined {formatDate(customer.createdAt ?? null)}
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
        const customer = row.original;
        return (
          <div className="space-y-1 text-xs text-slate-600">
            {customer.userPhone ? (
              <p className="flex items-center gap-2">
                <Phone size={12} className="text-slate-400" />
                <span className="font-medium text-slate-700">{customer.userPhone}</span>
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      id: 'addon-orders',
      header: 'Add-on Orders',
      meta: { cellClassName: 'align-top' },
      cell: ({ row }) => {
        const { upcomingOrders, confirmedRequests } = row.original;

        if (upcomingOrders.length === 0) {
          if (confirmedRequests.length > 0) {
            const latest = confirmedRequests[0];
            return (
              <div className="space-y-1 text-xs text-slate-500">
                <p className="text-sm font-semibold text-slate-700">
                  {latest.summary.totalQuantity} item{latest.summary.totalQuantity > 1 ? 's' : ''}
                </p>
                <p className="flex items-center gap-2 text-slate-400">
                  <CalendarClock size={12} />
                  Last order: {formatDate(latest.deliveryDate)}
                </p>
                <p className="text-[11px] text-slate-400">All orders delivered</p>
              </div>
            );
          }
          return <span className="text-xs text-slate-400">No confirmed orders</span>;
        }

        return (
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-400">
              <span>{upcomingOrders.length} upcoming order{upcomingOrders.length > 1 ? 's' : ''}</span>
              <span className="font-semibold text-purple-600">{formatNumber(upcomingOrders.reduce((sum, req) => sum + req.summary.totalCoins, 0))} coins</span>
            </div>
            {upcomingOrders.slice(0, 3).map((request, index) => (
              <div
                key={request.id ?? `upcoming-${index}`}
                className="space-y-2 rounded-lg border border-purple-200 bg-purple-50/80 p-3 shadow-sm"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-purple-800">
                    {request.summary.totalQuantity} item{request.summary.totalQuantity > 1 ? 's' : ''}
                  </p>
                  <span className="text-[11px] font-semibold text-purple-700">
                    {formatNumber(request.summary.totalCoins)} coins
                  </span>
                </div>
                <p className="flex items-center gap-2 text-[11px] text-purple-700">
                  <CalendarClock size={12} />
                  Delivery: {formatDate(request.deliveryDate)}
                </p>
                {request.items.length > 0 ? (
                  <ul className="flex flex-wrap gap-1 text-[10px]">
                    {request.items.slice(0, 3).map((item, itemIndex) => (
                      <li
                        key={`${request.id ?? `upcoming-${index}`}-item-${itemIndex}`}
                        className="rounded-full bg-white px-2 py-0.5 text-purple-700 shadow-inner"
                      >
                        {item.addonName} × {item.quantity}
                      </li>
                    ))}
                    {request.items.length > 3 && (
                      <li className="rounded-full bg-white px-2 py-0.5 text-purple-700/60 shadow-inner">
                        +{request.items.length - 3} more
                      </li>
                    )}
                  </ul>
                ) : null}
              </div>
            ))}
            {upcomingOrders.length > 3 && (
              <p className="text-center text-[11px] text-slate-400">
                +{upcomingOrders.length - 3} more upcoming order{upcomingOrders.length - 3 > 1 ? 's' : ''}
              </p>
            )}
          </div>
        );
      },
    },
    {
      id: 'totals',
      header: 'Total Stats',
      meta: { cellClassName: 'align-top' },
      cell: ({ row }) => {
        const { totalCoins, totalQuantity, confirmedRequests } = row.original;
        return (
          <div className="space-y-1 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span>All-time orders</span>
              <span className="font-semibold text-slate-900">{confirmedRequests.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total items</span>
              <span className="font-semibold text-slate-900">{formatNumber(totalQuantity)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total coins</span>
              <span className="font-semibold text-purple-700">{formatNumber(totalCoins)}</span>
            </div>
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
            label="View order details"
            icon={<ClipboardList size={16} />}
            onClick={() => {
              setSelectedCustomer(row.original);
              setDialogOpen(true);
            }}
          />
        </div>
      ),
    },
  ], []);

  const loading = requestsLoading;
  const selectedRequests = selectedCustomer?.userId ? requestsByUser.get(selectedCustomer.userId) ?? [] : [];
  const dialogIsOpen = dialogOpen && Boolean(selectedCustomer);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700">
              <ShoppingBasket size={14} />
              Approved add-ons
            </div>
            <h1 className="text-3xl font-bold text-slate-900">
              Approved add-on orders
            </h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Track confirmed add-on orders, monitor upcoming deliveries, and view customer order history.
            </p>
          </div>
        </div>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">Active customers</p>
            <p className="mt-2 text-2xl font-bold text-purple-700">{metrics.activeCustomers}</p>
            <p className="text-xs text-purple-700/80">Customers with upcoming orders</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Upcoming coins</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{formatNumber(metrics.totalUpcomingCoins)}</p>
            <p className="text-xs text-emerald-700/80">Total coins for pending deliveries</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">This week</p>
            <p className="mt-2 text-2xl font-bold text-amber-700">{metrics.deliveriesThisWeek}</p>
            <p className="text-xs text-amber-700/80">Orders delivering in next 7 days</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Pending review</p>
            <p className="mt-2 text-2xl font-bold text-slate-800">{metrics.pendingRequests}</p>
            <p className="text-xs text-slate-600/80">Requests awaiting confirmation</p>
          </div>
        </section>
      </header>

      <DataTable<ApprovedAddonRow>
        data={rows}
        columns={columns}
        loading={loading}
        emptyMessage="No confirmed add-on orders yet. Approved requests will appear here."
        pagination={{
          currentPage: 1,
          pageSize: rows.length,
          totalItems: rows.length,
          onPageChange: () => {},
          onPageSizeChange: () => {},
        }}
      />

      <Dialog
        open={dialogIsOpen}
        onClose={handleCloseDialog}
        title="Add-on order history"
        description={selectedCustomer ? `All confirmed orders for ${selectedCustomer.userName}` : undefined}
        size="xl"
      >
        {selectedCustomer && selectedRequests.length > 0 ? (
          <div className="space-y-4">
            {(() => {
              const displayId = getDisplayCustomerId(selectedCustomer.customerShortId, selectedCustomer.userId, { allowFallback: true });
              if (displayId === '—') {
                return null;
              }
              return (
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
                  <span className="uppercase tracking-wide">Customer ID</span>
                  <span className="font-mono text-sm text-slate-800">{displayId}</span>
                </div>
              );
            })()}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total orders</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{selectedRequests.length}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total items</p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {formatNumber(selectedRequests.reduce((sum, req) => sum + req.summary.totalQuantity, 0))}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total coins</p>
                <p className="mt-1 text-xl font-bold text-purple-700">
                  {formatNumber(selectedRequests.reduce((sum, req) => sum + req.summary.totalCoins, 0))}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Order history</h3>
              <ul className="space-y-3">
                {selectedRequests.map((request, index) => (
                  <li
                    key={request.id ?? `order-${index}`}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {request.summary.totalQuantity} item{request.summary.totalQuantity > 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-slate-500">
                            <CalendarClock size={12} className="mr-1 inline" />
                            Delivery: {formatDate(request.deliveryDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-purple-700">
                            {formatNumber(request.summary.totalCoins)} coins
                          </p>
                          <p className="text-xs text-emerald-600">
                            +{formatNumber(request.summary.totalDiscountCoins)} bonus
                          </p>
                        </div>
                      </div>
                      {request.items.length > 0 && (
                        <ul className="space-y-2 border-t border-slate-200 pt-3">
                          {request.items.map((item, itemIndex) => (
                            <li
                              key={`${request.id ?? `order-${index}`}-item-${itemIndex}`}
                              className="flex items-center justify-between text-xs text-slate-600"
                            >
                              <span>
                                <span className="font-medium text-slate-900">{item.addonName}</span>
                                <span className="ml-2 text-slate-400">({item.mealType})</span>
                              </span>
                              <span>
                                {item.quantity} × {item.coinsPerUnit} = <span className="font-semibold text-slate-900">{formatNumber(item.totalCoins)}</span> coins
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-xs text-slate-500">
                        <span>Requested: {formatDateTime(request.createdAt)}</span>
                        {request.reviewedByName && (
                          <span>Confirmed by {request.reviewedByName}</span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600">No orders found for this customer.</p>
        )}
      </Dialog>
    </div>
  );
};

export default ApprovedAddonsPage;
