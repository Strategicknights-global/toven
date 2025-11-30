import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ShoppingBasket,
  User,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import Dialog from '../components/Dialog';
import IconButton from '../components/IconButton';
import ToggleSwitch from '../components/ToggleSwitch';
import { useAddonRequestsStore } from '../stores/addonRequestsStore';
import type { AddonRequestSchema, AddonRequestStatus } from '../schemas/AddonRequestSchema';
import { auth } from '../firebase';
import { UserModel } from '../firestore';
import { ROUTES } from '../AppRoutes';
import { useConfigStore } from '../stores/configStore';
import { resolveCutoffHour } from '../utils/timeWindow';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';
import { useUsersStore } from '../stores/usersStore';
import { getDisplayCustomerId } from '../utils/customerDisplay';

const statusMeta: Record<AddonRequestStatus, { label: string; badge: string; accent: string }> = {
  pending: {
    label: 'Pending review',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    accent: 'text-amber-600',
  },
  confirmed: {
    label: 'Confirmed',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    accent: 'text-emerald-600',
  },
  cancelled: {
    label: 'Cancelled',
    badge: 'bg-rose-50 text-rose-600 border-rose-200',
    accent: 'text-rose-600',
  },
};

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
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(value);
  } catch (error) {
    console.error('Failed to format datetime', error);
    return value.toLocaleString();
  }
};

const formatNumber = (value: number): string => value.toLocaleString('en-IN');

const AddonRequestsPage: React.FC = () => {
  const requests = useAddonRequestsStore((state) => state.requests);
  const loading = useAddonRequestsStore((state) => state.loading);
  const updatingId = useAddonRequestsStore((state) => state.updatingId);
  const loadRequests = useAddonRequestsStore((state) => state.loadRequests);
  const updateStatus = useAddonRequestsStore((state) => state.updateStatus);
  const totalItems = useAddonRequestsStore((state) => state.totalItems);
  const paginatedData = useAddonRequestsStore((state) => state.paginatedData);
  const users = useUsersStore((state) => state.users);
  const usersLoading = useUsersStore((state) => state.loading);
  const refreshUsers = useUsersStore((state) => state.refreshUsers);

  const config = useConfigStore((state) => state.config);
  const configLoading = useConfigStore((state) => state.loading);
  const configLoaded = useConfigStore((state) => state.loaded);
  const loadConfig = useConfigStore((state) => state.loadConfig);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('id');
  const [searchValue, setSearchValue] = useState('');
  const searchFields = useMemo(() => getSearchFieldsForCollection('addonRequests'), []);

  useEffect(() => {
    if (!configLoaded && !configLoading) {
      void loadConfig();
    }
  }, [configLoaded, configLoading, loadConfig]);

  const addonCutoffHour = useMemo(
    () => resolveCutoffHour(config?.addonOrderCutoffHour),
    [config?.addonOrderCutoffHour],
  );

  const addonCutoffTimeLabel = useMemo(() => {
    const period = addonCutoffHour >= 12 ? 'PM' : 'AM';
    const displayHour = addonCutoffHour % 12 === 0 ? 12 : addonCutoffHour % 12;
    return `${displayHour}:00 ${period}`;
  }, [addonCutoffHour]);

  const navigate = useNavigate();

  const [viewingRequest, setViewingRequest] = useState<AddonRequestSchema | null>(null);
  const [decisionRequest, setDecisionRequest] = useState<AddonRequestSchema | null>(null);
  const [decisionAction, setDecisionAction] = useState<'confirm' | 'cancel'>('confirm');
  const [decisionNote, setDecisionNote] = useState('');
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [reviewer, setReviewer] = useState<{ id: string; name: string } | null>(null);

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

  useEffect(() => {
    const current = auth.currentUser;
    if (!current) {
      return;
    }

    let active = true;
    (async () => {
      let resolvedName = current.displayName?.trim() ?? '';
      try {
        const record = await UserModel.findById(current.uid);
        if (record?.fullName && record.fullName.trim().length > 0) {
          resolvedName = record.fullName.trim();
        }
      } catch (error) {
        console.error('Failed to resolve reviewer name', error);
      }
      if (!resolvedName) {
        resolvedName = current.email?.split('@')[0] ?? 'Admin';
      }
      if (active) {
        setReviewer({ id: current.uid, name: resolvedName });
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      const statusOrder: Record<AddonRequestStatus, number> = {
        pending: 0,
        confirmed: 1,
        cancelled: 2,
      };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) {
        return statusDiff;
      }
      const aTime = a.createdAt?.getTime() ?? 0;
      const bTime = b.createdAt?.getTime() ?? 0;
      return bTime - aTime;
    });
  }, [requests]);

  const metrics = useMemo(() => {
    const pending = requests.filter((item) => item.status === 'pending').length;
    const confirmed = requests.filter((item) => item.status === 'confirmed').length;
    const cancelled = requests.filter((item) => item.status === 'cancelled').length;
    const totalQuantity = requests.reduce((sum, item) => sum + item.summary.totalQuantity, 0);
    return { pending, confirmed, cancelled, totalQuantity };
  }, [requests]);

  const openDecisionModal = useCallback((request: AddonRequestSchema, action: 'confirm' | 'cancel') => {
    setDecisionRequest(request);
    setDecisionAction(action);
    setDecisionNote('');
    setDecisionError(null);
  }, []);

  const handleCloseDecision = useCallback(() => {
    if (decisionLoading) {
      return;
    }
    setDecisionRequest(null);
    setDecisionNote('');
    setDecisionError(null);
  }, [decisionLoading]);

  const handleDecisionConfirm = useCallback(async () => {
    if (!decisionRequest || !reviewer) {
      return;
    }
    if (decisionAction === 'cancel' && decisionNote.trim().length === 0) {
      setDecisionError('Please add a brief note for cancellation.');
      return;
    }

    setDecisionLoading(true);
    try {
      const updated = await updateStatus(decisionRequest.id!, {
        status: decisionAction === 'confirm' ? 'confirmed' : 'cancelled',
        statusNote: decisionNote.trim().length > 0 ? decisionNote.trim() : null,
        reviewedBy: reviewer.id,
        reviewedByName: reviewer.name,
      });
      if (updated?.status === 'confirmed') {
        navigate(ROUTES.ADMIN_ADDON_APPROVED);
      }
      setDecisionRequest(null);
      setDecisionNote('');
      setDecisionError(null);
    } catch (error) {
      console.error('Failed to update addon request status', error);
    } finally {
      setDecisionLoading(false);
    }
  }, [decisionAction, decisionNote, decisionRequest, navigate, reviewer, updateStatus]);

  const columns = useMemo<DataTableColumnDef<AddonRequestSchema>[]>(() => [
    {
      id: 'customer',
      header: 'Customer',
      meta: { cellClassName: 'align-top' },
      cell: ({ row }) => {
        const request = row.original;
        const displayId = getDisplayCustomerId(userIdToCustomerId.get(request.userId), request.userId, { allowFallback: true });
        return (
          <div className="space-y-1 text-sm text-slate-700">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <User size={16} className="text-purple-500" />
              {request.userName}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {request.userEmail ? (
                <span className="inline-flex items-center gap-1">
                  <span className="font-medium text-slate-600">Email:</span> {request.userEmail}
                </span>
              ) : null}
              {request.userPhone ? (
                <span className="inline-flex items-center gap-1">
                  <span className="font-medium text-slate-600">Phone:</span> {request.userPhone}
                </span>
              ) : null}
              {displayId !== '—' ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                  CID: <span className="text-xs">{displayId}</span>
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-400">Requested on {formatDateTime(request.createdAt)}</p>
          </div>
        );
      },
    },
    {
      id: 'delivery',
      header: 'Delivery',
      meta: { cellClassName: 'align-top' },
      cell: ({ row }) => {
        const request = row.original;
        return (
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-purple-600">
              <CalendarClock size={14} />
              {formatDate(request.deliveryDate)}
            </div>
            <p className="text-xs text-slate-500">
              Delivery slot key: <span className="font-semibold text-slate-700">{request.deliveryDateKey}</span>
            </p>
            <p className="text-[11px] text-slate-400">Last updated {formatDateTime(request.updatedAt)}</p>
          </div>
        );
      },
    },
    {
      id: 'items',
      header: 'Items',
      meta: { cellClassName: 'align-top' },
      cell: ({ row }) => {
        const request = row.original;
        return (
          <ul className="space-y-1 text-xs text-slate-600">
            {request.items.map((item) => (
              <li key={`${item.addonId}-${item.mealType}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/70 bg-white px-3 py-2 shadow-sm">
                <span className="flex items-center gap-2 font-medium text-slate-700">
                  <UtensilsCrossed size={14} className="text-purple-500" />
                  {item.addonName}
                </span>
                <div className="text-right text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">Qty: {item.quantity}</p>
                  <p className="text-[11px] text-slate-400">Meal: {item.mealType}</p>
                </div>
              </li>
            ))}
          </ul>
        );
      },
    },
    {
      id: 'summary',
      header: 'Summary',
      meta: { cellClassName: 'align-top' },
      cell: ({ row }) => {
        const request = row.original;
        return (
          <div className="space-y-1 text-sm text-slate-600">
            <div className="flex items-center justify-between text-xs">
              <span>Total items</span>
              <span className="font-semibold text-slate-900">{formatNumber(request.summary.totalQuantity)}</span>
            </div>
          </div>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      meta: { cellClassName: 'align-top' },
      cell: ({ row }) => {
        const request = row.original;
        const meta = statusMeta[request.status];
        return (
          <div className="space-y-2 text-xs text-slate-500">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${meta.badge}`}>
              <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
              {meta.label}
            </span>
            {request.statusNote ? (
              <p className="text-xs text-slate-500">
                <span className="font-semibold text-slate-600">Note:</span> {request.statusNote}
              </p>
            ) : null}
            {request.reviewedByName ? (
              <p className="text-[11px] text-slate-400">By {request.reviewedByName} on {formatDateTime(request.reviewedAt)}</p>
            ) : null}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      meta: { cellClassName: 'align-top' },
      cell: ({ row }) => {
        const request = row.original;
        const isPending = request.status === 'pending';
        const isUpdating = updatingId === request.id || decisionLoading;

        return (
          <div className="flex flex-wrap items-center gap-2">
            <IconButton
              label="Confirm request"
              icon={<CheckCircle2 size={16} />}
              variant="primary"
              disabled={!isPending || isUpdating}
              onClick={() => openDecisionModal(request, 'confirm')}
            />
            <IconButton
              label="Cancel request"
              icon={<XCircle size={16} />}
              variant="danger"
              disabled={!isPending || isUpdating}
              onClick={() => openDecisionModal(request, 'cancel')}
            />
            <IconButton
              label="View details"
              icon={<ClipboardList size={16} />}
              onClick={() => setViewingRequest(request)}
            />
          </div>
        );
      },
    },
  ], [decisionLoading, openDecisionModal, setViewingRequest, updatingId, userIdToCustomerId]);

  const activeDecisionTitle = decisionAction === 'confirm' ? 'Confirm add-on request' : 'Cancel add-on request';
  const activeDecisionDescription = decisionAction === 'confirm'
    ? 'Once confirmed, the add-on order will be forwarded to the kitchen team.'
    : 'Cancelled requests are archived and the customer will be notified.';

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700">
            <ShoppingBasket size={14} />
            Add-on order requests
          </div>
          <h1 className="text-3xl font-semibold text-slate-900">Manage add-on requests</h1>
          <p className="text-sm text-slate-500">
            Review newly submitted add-on orders, confirm fulfilment, or leave a note for cancellations. Pending requests lock at {addonCutoffTimeLabel} daily.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Pending review</p>
            <p className="mt-2 text-3xl font-semibold text-amber-700">{metrics.pending}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Confirmed today</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-700">{metrics.confirmed}</p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Cancelled</p>
            <p className="mt-2 text-3xl font-semibold text-rose-700">{metrics.cancelled}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <p>Total items requested: <span className="font-semibold text-slate-900">{formatNumber(metrics.totalQuantity)}</span></p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-900">Auto-approve add-on requests</p>
              <p className="text-xs text-blue-700">New requests will be automatically confirmed without review.</p>
            </div>
            <ToggleSwitch
              checked={config?.autoApproveAddonRequests ?? false}
              onChange={(checked: boolean) => {
                void useConfigStore.getState().saveConfig({ autoApproveAddonRequests: checked });
              }}
              disabled={configLoading}
            />
          </div>
        </div>
      </header>

      <DataTable
        columns={columns}
        data={sortedRequests}
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
        wrapperClassName="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        headerBaseClassName="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500"
        cellBaseClassName="px-6 py-4 text-sm text-slate-700 align-top"
      />

      <Dialog
        open={Boolean(viewingRequest)}
        onClose={() => setViewingRequest(null)}
        title="Add-on request details"
        size="xl"
      >
        {viewingRequest ? (
          <div className="space-y-6 text-sm text-slate-700">
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</h3>
              <p className="text-base font-semibold text-slate-900">{viewingRequest.userName}</p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                {viewingRequest.userEmail ? <span>Email: {viewingRequest.userEmail}</span> : null}
                {viewingRequest.userPhone ? <span>Phone: {viewingRequest.userPhone}</span> : null}
                {(() => {
                  const displayId = getDisplayCustomerId(userIdToCustomerId.get(viewingRequest.userId), viewingRequest.userId, { allowFallback: true });
                  if (displayId === '—') {
                    return null;
                  }
                  return <span>CID: <span className="font-mono font-semibold text-slate-700">{displayId}</span></span>;
                })()}
              </div>
            </section>
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery</h3>
              <p>{formatDate(viewingRequest.deliveryDate)} ({viewingRequest.deliveryDateKey})</p>
            </section>
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Items</h3>
              <ul className="space-y-2">
                {viewingRequest.items.map((item) => (
                  <li key={`${item.addonId}-${item.mealType}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">{item.addonName}</span>
                      <span className="text-xs text-slate-500">Meal: {item.mealType} · Category: {item.category}</span>
                    </div>
                    <div className="text-right text-sm text-slate-600">
                      <p className="font-semibold">Quantity: {item.quantity}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</h3>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Total items</span>
                  <span className="font-semibold text-slate-900">{formatNumber(viewingRequest.summary.totalQuantity)}</span>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(decisionRequest)}
        onClose={handleCloseDecision}
        title={activeDecisionTitle}
        description={activeDecisionDescription}
        size="md"
        footer={(
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleCloseDecision}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              disabled={decisionLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDecisionConfirm}
              disabled={decisionLoading || !reviewer}
              className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white transition ${decisionAction === 'confirm' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
            >
              {decisionAction === 'confirm' ? 'Confirm request' : 'Cancel request'}
            </button>
          </div>
        )}
      >
        {decisionAction === 'cancel' ? (
          <div className="space-y-2 text-sm text-slate-600">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="decision-note">
              Cancellation note
            </label>
            <textarea
              id="decision-note"
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              placeholder="Let the customer know why this request was cancelled."
            />
            {decisionError ? <p className="text-xs text-rose-600">{decisionError}</p> : null}
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            Confirming this request notifies the kitchen to include the add-ons in the next delivery batch. You can add a note after confirmation if needed.
          </p>
        )}
      </Dialog>
    </div>
  );
};

export default AddonRequestsPage;
