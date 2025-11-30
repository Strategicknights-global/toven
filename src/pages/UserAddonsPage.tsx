import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAddonRequestsStore } from '../stores/addonRequestsStore';
import { auth } from '../firebase';
import { Calendar, ShoppingBag, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { AddonRequestModel } from '../firestore';
import { useToastStore } from '../stores/toastStore';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import type { AddonRequestSchema, AddonRequestStatus } from '../schemas/AddonRequestSchema';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';

const STATUS_BADGE_CLASSES: Record<AddonRequestStatus, string> = {
  confirmed: 'border-green-200 bg-green-50 text-green-700',
  pending: 'border-blue-200 bg-blue-50 text-blue-700',
  cancelled: 'border-gray-200 bg-gray-50 text-gray-600',
};

const STATUS_LABELS: Record<AddonRequestStatus, string> = {
  confirmed: 'Confirmed',
  pending: 'Pending',
  cancelled: 'Cancelled',
};

const getStatusIcon = (status: AddonRequestStatus) => {
  switch (status) {
    case 'confirmed':
      return <CheckCircle className="h-3.5 w-3.5" />;
    case 'pending':
      return <Clock className="h-3.5 w-3.5" />;
    case 'cancelled':
      return <XCircle className="h-3.5 w-3.5" />;
    default:
      return <AlertCircle className="h-3.5 w-3.5" />;
  }
};

const UserAddonsPage: React.FC = () => {
  const { requests, loading, loadRequests, totalItems, paginatedData } = useAddonRequestsStore();
  const { addToast } = useToastStore();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('id');
  const [searchValue, setSearchValue] = useState('');
  const searchFields = useMemo(() => getSearchFieldsForCollection('addonRequests'), []);

  const initialLoadRef = useRef(false);
  useEffect(() => {
    if (initialLoadRef.current) {
      return;
    }
    initialLoadRef.current = true;
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    const search = searchValue ? { field: searchField, type: 'text' as const, value: searchValue } : null;
    void paginatedData({ pageNumber: currentPage, pageSize, search });
  }, [currentPage, pageSize, searchField, searchValue, paginatedData]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchField, searchValue]);

  // Get user's addon requests
  const userAddons = useMemo(() => {
    if (!auth.currentUser) return [];
    return requests
      .filter(req => req.userId === auth.currentUser?.uid)
      .sort((a, b) => {
        // Sort by deliveryDate descending (newest first)
        const dateA = a.deliveryDate instanceof Date ? a.deliveryDate.getTime() : 0;
        const dateB = b.deliveryDate instanceof Date ? b.deliveryDate.getTime() : 0;
        return dateB - dateA;
      });
  }, [requests]);

  // Get confirmed addons
  const confirmedAddons = useMemo(() => {
    return userAddons.filter(req => req.status === 'confirmed');
  }, [userAddons]);

  // Get pending addons
  const pendingAddons = useMemo(() => {
    return userAddons.filter(req => req.status === 'pending');
  }, [userAddons]);

  // Get cancelled addons
  const cancelledAddons = useMemo(() => {
    return userAddons.filter(req => req.status === 'cancelled');
  }, [userAddons]);

  const formatDate = (date?: Date | null) => {
    if (!date) {
      return '—';
    }
    try {
      return new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date);
    } catch (error) {
      console.error('Failed to format date', error);
      return date instanceof Date ? date.toLocaleDateString() : '—';
    }
  };

  const formatDateTime = (date?: Date | null) => {
    if (!date) {
      return '—';
    }
    try {
      return new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);
    } catch (error) {
      console.error('Failed to format date time', error);
      return date instanceof Date ? date.toLocaleString() : '—';
    }
  };

  const handleCancelAddon = useCallback(async (addonId: string) => {
    if (!confirm('Are you sure you want to cancel this add-on order?')) {
      return;
    }

    setActionLoading(addonId);
    try {
      await AddonRequestModel.updateStatus(addonId, {
        status: 'cancelled',
        statusNote: 'Cancelled by user',
        reviewedBy: auth.currentUser?.uid || '',
        reviewedByName: auth.currentUser?.displayName || 'User',
      });
      addToast('Add-on order cancelled successfully', 'success');
      await loadRequests();
    } catch (error) {
      console.error('Error cancelling addon:', error);
      addToast('Failed to cancel add-on order', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [addToast, loadRequests]);

  const columns = useMemo<DataTableColumnDef<AddonRequestSchema>[]>(() => [
    {
      id: 'order',
      header: 'Order',
      meta: { cellClassName: 'align-top' },
      cell: ({ row }) => {
        const addon = row.original;
        const status = addon.status as AddonRequestStatus;
        const statusLabel = STATUS_LABELS[status];
        const badgeClass = STATUS_BADGE_CLASSES[status];

        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-slate-800">
                {addon.id || '—'}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}>
                {getStatusIcon(status)}
                {statusLabel}
              </span>
            </div>
            {addon.statusNote ? (
              <p className="text-xs text-slate-500">Note: {addon.statusNote}</p>
            ) : null}
          </div>
        );
      },
    },
    {
      id: 'schedule',
      header: 'Schedule',
      meta: { cellClassName: 'align-top text-sm text-slate-600' },
      cell: ({ row }) => (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>{formatDate(row.original.deliveryDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>Requested {formatDateTime(row.original.createdAt)}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'items',
      header: 'Items',
      meta: { cellClassName: 'align-top text-sm text-slate-700' },
      cell: ({ row }) => {
        const items = row.original.items ?? [];
        const visibleItems = items.slice(0, 3);

        return (
          <div className="space-y-2">
            {visibleItems.map((item) => (
              <div key={`${row.original.id}-${item.addonId}`} className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-800">{item.addonName}</p>
                  <p className="text-xs text-slate-500">{item.category} • {item.mealType}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">Qty {item.quantity}</p>
                  <p>{item.totalDiscountCoins} coins</p>
                </div>
              </div>
            ))}
            {items.length > visibleItems.length ? (
              <p className="text-xs text-slate-500">
                +{items.length - visibleItems.length} more item{items.length - visibleItems.length > 1 ? 's' : ''}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      id: 'summary',
      header: 'Totals',
      meta: { cellClassName: 'align-top text-sm text-slate-600' },
      cell: ({ row }) => {
        const summary = row.original.summary;
        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span>Total Qty</span>
              <span className="font-semibold text-slate-900">{summary.totalQuantity}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total Coins</span>
              <span className="font-semibold text-slate-900">{summary.totalCoins}</span>
            </div>
            <div className="flex items-center justify-between text-purple-600">
              <span>Discount Coins</span>
              <span className="font-semibold">{summary.totalDiscountCoins}</span>
            </div>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      meta: { cellClassName: 'align-top' },
      cell: ({ row }) => {
        const addon = row.original;
        const canCancel = addon.status === 'pending';
        const isActionInProgress = actionLoading === addon.id;

        if (!canCancel) {
          return <span className="text-xs text-slate-400">No actions</span>;
        }

        return (
          <button
            type="button"
            onClick={() => handleCancelAddon(addon.id)}
            disabled={isActionInProgress}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            {isActionInProgress ? 'Cancelling…' : 'Cancel Order'}
          </button>
        );
      },
    },
  ], [actionLoading, handleCancelAddon]);

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">My Add-ons</h1>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading add-ons...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-800">My Add-ons</h1>
        <Link
          to="/addons"
          className="inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          Browse Add-ons
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-800">Confirmed</h3>
          </div>
          <p className="text-3xl font-bold text-green-600">{confirmedAddons.length}</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-800">Pending</h3>
          </div>
          <p className="text-3xl font-bold text-blue-600">{pendingAddons.length}</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-800">Cancelled</h3>
          </div>
          <p className="text-3xl font-bold text-gray-600">{cancelledAddons.length}</p>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-purple-800">Total</h3>
          </div>
          <p className="text-3xl font-bold text-purple-600">{userAddons.length}</p>
        </div>
      </div>

      {userAddons.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Add-ons Yet</h3>
          <p className="text-gray-600 mb-6">You haven't ordered any add-ons yet.</p>
          <Link
            to="/addons"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Browse Add-ons
          </Link>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={userAddons}
          loading={loading}
          emptyMessage="No add-on orders found."
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
          tableOptions={{
            getRowId: (row) => row.id,
          }}
        />
      )}
    </div>
  );
};

export default UserAddonsPage;
