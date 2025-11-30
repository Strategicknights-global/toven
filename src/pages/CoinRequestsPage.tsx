import React, { useEffect, useMemo, useState } from 'react';
import { Coins, CheckCircle, XCircle, Clock, Eye, DollarSign, Users, TrendingUp } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useCoinRequestsStore } from '../stores/coinRequestsStore';
import { getDisplayCustomerId } from '../utils/customerDisplay';
import { useUserRoleStore } from '../stores/userRoleStore';
import { WalletModel } from '../firestore';
import type { CoinRequestSchema } from '../schemas/CoinRequestSchema';
import DataTable from '../components/DataTable';
import Dialog from '../components/Dialog';
import { useToastStore } from '../stores/toastStore';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

const CoinRequestsPage: React.FC = () => {
  const user = useUserRoleStore((state) => state.user);
  const { requests, loading, updatingId, updateStatus, totalItems, paginatedData } = useCoinRequestsStore();
  const addToast = useToastStore((state) => state.addToast);

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedRequest, setSelectedRequest] = useState<CoinRequestSchema | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('id');
  const [searchValue, setSearchValue] = useState('');
  const searchFields = useMemo(() => getSearchFieldsForCollection('coinRequests'), []);

  useEffect(() => {
    const search = searchValue ? { field: searchField, type: 'text' as const, value: searchValue } : null;
    void paginatedData({ pageNumber: currentPage, pageSize, search });
  }, [currentPage, pageSize, searchField, searchValue, paginatedData]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchField, searchValue]);

  const filteredRequests = requests.filter((request) => {
    if (filterStatus === 'all') return true;
    return request.status === filterStatus;
  });

  const metrics = {
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
    totalCoins: requests.filter((r) => r.status === 'approved').reduce((sum, r) => sum + r.coinsRequested, 0),
  };

  const handleApprove = async () => {
    if (!selectedRequest || !selectedRequest.id || !user) return;

    try {
      await updateStatus(selectedRequest.id, {
        status: 'approved',
        statusNote: statusNote.trim() || undefined,
        reviewedBy: user.uid,
        reviewedByName: user.displayName || user.email || 'Admin',
      });

      // Credit user's wallet
      try {
        await WalletModel.addCoins(selectedRequest.userId, selectedRequest.coinsRequested);
        addToast(
          `Approved ${selectedRequest.coinsRequested} coins for ${selectedRequest.userName}`,
          'success'
        );
      } catch (walletError) {
        console.error('Failed to credit wallet', walletError);
        addToast('Approved but failed to credit wallet. Please credit manually.', 'error');
      }

      setShowApproveDialog(false);
      setSelectedRequest(null);
      setStatusNote('');
    } catch {
      // Error handling in store
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !selectedRequest.id || !user) return;

    if (!statusNote.trim()) {
      addToast('Please provide a rejection reason', 'error');
      return;
    }

    try {
      await updateStatus(selectedRequest.id, {
        status: 'rejected',
        statusNote: statusNote.trim(),
        reviewedBy: user.uid,
        reviewedByName: user.displayName || user.email || 'Admin',
      });

      addToast(`Rejected coin request for ${selectedRequest.userName}`, 'success');
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setStatusNote('');
    } catch {
      // Error handling in store
    }
  };

  const toDate = (value: unknown): Date | null => {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return value;
    }
    if (value instanceof Timestamp) {
      return value.toDate();
    }
    if (typeof value === 'number') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value === 'string') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value === 'object') {
      const maybeTimestamp = value as { seconds?: number; nanoseconds?: number };
      if (typeof maybeTimestamp.seconds === 'number') {
        const millis = maybeTimestamp.seconds * 1000 + Math.floor((maybeTimestamp.nanoseconds ?? 0) / 1_000_000);
        const date = new Date(millis);
        return Number.isNaN(date.getTime()) ? null : date;
      }
    }
    return null;
  };

  const formatDate = (value: unknown) => {
    const dateObj = toDate(value);
    if (!dateObj) {
      return 'N/A';
    }
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
            <Clock size={12} />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            <CheckCircle size={12} />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
            <XCircle size={12} />
            Rejected
          </span>
        );
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Wallet Coin Requests</h1>
        <p className="text-sm text-slate-500">Review and approve customer coin top-up requests.</p>
      </div>

      {/* Metrics Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-slate-900">{metrics.pending}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <CheckCircle size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Approved</p>
              <p className="text-2xl font-bold text-slate-900">{metrics.approved}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <XCircle size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Rejected</p>
              <p className="text-2xl font-bold text-slate-900">{metrics.rejected}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Approved Coins</p>
              <p className="text-2xl font-bold text-slate-900">{metrics.totalCoins.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 border-b border-slate-200">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              filterStatus === status
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && (
              <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                {requests.filter((r) => r.status === status).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <DataTable
          data={filteredRequests}
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
          columns={[
            {
              id: 'customer',
              header: 'Customer',
              cell: ({ row }) => {
                const request = row.original;
                const displayId = getDisplayCustomerId(undefined, request.userId, { allowFallback: true });
                return (
                  <div className="space-y-0.5">
                    <p className="font-medium text-slate-900">{request.userName}</p>
                    <p className="text-xs text-slate-500">{request.userEmail}</p>
                    {request.userPhone && (
                      <p className="text-xs text-slate-500">{request.userPhone}</p>
                    )}
                    {displayId !== '—' && (
                      <p className="text-[11px] text-slate-500">
                        CID: <span className="font-mono text-xs">{displayId}</span>
                      </p>
                    )}
                  </div>
                );
              },
            },
            {
              id: 'coins',
              header: 'Coins',
              cell: ({ row }) => {
                const request = row.original;
                return (
                  <div className="flex items-center gap-2">
                    <Coins className="text-purple-600" size={16} />
                    <span className="font-semibold text-slate-900">
                      {request.coinsRequested.toLocaleString()}
                    </span>
                  </div>
                );
              },
            },
            {
              id: 'amount',
              header: 'Amount Paid',
              cell: ({ row }) => {
                const request = row.original;
                return (
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="text-green-600" size={14} />
                    <span className="font-medium text-slate-900">
                      ₹{request.amountPaid.toLocaleString()}
                    </span>
                  </div>
                );
              },
            },
            {
              id: 'status',
              header: 'Status',
              cell: ({ row }) => {
                const request = row.original;
                return getStatusBadge(request.status);
              },
            },
            {
              id: 'date',
              header: 'Requested',
              cell: ({ row }) => {
                const request = row.original;
                return (
                  <span className="text-sm text-slate-600">{formatDate(request.createdAt)}</span>
                );
              },
            },
            {
              id: 'actions',
              header: 'Actions',
              cell: ({ row }) => {
                const request = row.original;
                return (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowDetailsDialog(true);
                      }}
                      className="rounded-md border border-slate-300 p-2 text-slate-600 transition-colors hover:bg-slate-50"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>

                    {request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowApproveDialog(true);
                          }}
                          disabled={updatingId === request.id}
                          className="rounded-md border border-green-300 bg-green-50 p-2 text-green-600 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Approve"
                        >
                          <CheckCircle size={16} />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowRejectDialog(true);
                          }}
                          disabled={updatingId === request.id}
                          className="rounded-md border border-red-300 bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Reject"
                        >
                          <XCircle size={16} />
                        </button>
                      </>
                    )}
                  </div>
                );
              },
            },
          ]}
          emptyMessage="No coin requests found"
        />
      </div>

      {/* Details Dialog */}
      <Dialog
        open={showDetailsDialog}
        onClose={() => {
          setShowDetailsDialog(false);
          setSelectedRequest(null);
        }}
        title="Coin Request Details"
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-5">
            {/* Customer Info */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Users className="text-slate-600" size={18} />
                <h3 className="font-semibold text-slate-900">Customer Information</h3>
              </div>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium text-slate-700">Name:</span> {selectedRequest.userName}</p>
                <p><span className="font-medium text-slate-700">Email:</span> {selectedRequest.userEmail}</p>
                {selectedRequest.userPhone && (
                  <p><span className="font-medium text-slate-700">Phone:</span> {selectedRequest.userPhone}</p>
                )}
              </div>
            </div>

            {/* Request Details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                <p className="mb-1 text-xs font-medium text-purple-700">Coins Requested</p>
                <p className="flex items-center gap-2 text-2xl font-bold text-purple-900">
                  <Coins size={24} />
                  {selectedRequest.coinsRequested.toLocaleString()}
                </p>
              </div>

              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="mb-1 text-xs font-medium text-green-700">Amount Paid</p>
                <p className="flex items-center gap-2 text-2xl font-bold text-green-900">
                  <DollarSign size={24} />
                  ₹{selectedRequest.amountPaid.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Invoice Image */}
            {selectedRequest.invoiceImage && (
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Payment Invoice:</p>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <img
                    src={selectedRequest.invoiceImage}
                    alt="Payment invoice"
                    className="w-full bg-slate-50"
                  />
                </div>
              </div>
            )}

            {/* Status Info */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Status</h3>
                {getStatusBadge(selectedRequest.status)}
              </div>

              <div className="space-y-2 text-sm">
                <p><span className="font-medium text-slate-700">Requested on:</span> {formatDate(selectedRequest.createdAt)}</p>
                
                {selectedRequest.reviewedAt && (
                  <>
                    <p><span className="font-medium text-slate-700">Reviewed on:</span> {formatDate(selectedRequest.reviewedAt)}</p>
                    {selectedRequest.reviewedByName && (
                      <p><span className="font-medium text-slate-700">Reviewed by:</span> {selectedRequest.reviewedByName}</p>
                    )}
                  </>
                )}

                {selectedRequest.statusNote && (
                  <div className="mt-3 rounded-md bg-white p-3">
                    <p className="mb-1 text-xs font-semibold text-slate-700">Note:</p>
                    <p className="text-slate-600">{selectedRequest.statusNote}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* Approve Dialog */}
      <Dialog
        open={showApproveDialog}
        onClose={() => {
          setShowApproveDialog(false);
          setSelectedRequest(null);
          setStatusNote('');
        }}
        title="Approve Coin Request"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              You are about to approve <strong>{selectedRequest.coinsRequested.toLocaleString()} coins</strong> for{' '}
              <strong>{selectedRequest.userName}</strong>. The coins will be credited to their wallet immediately.
            </p>

            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-medium text-green-900">
                ₹{selectedRequest.amountPaid.toLocaleString()} → {selectedRequest.coinsRequested.toLocaleString()} coins
              </p>
            </div>

            <div>
              <label htmlFor="approveNote" className="mb-1.5 block text-sm font-medium text-slate-700">
                Note (optional)
              </label>
              <textarea
                id="approveNote"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Add any additional notes..."
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowApproveDialog(false);
                  setSelectedRequest(null);
                  setStatusNote('');
                }}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={updatingId === selectedRequest.id}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle size={18} />
                {updatingId === selectedRequest.id ? 'Approving…' : 'Approve & Credit'}
              </button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={showRejectDialog}
        onClose={() => {
          setShowRejectDialog(false);
          setSelectedRequest(null);
          setStatusNote('');
        }}
        title="Reject Coin Request"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              You are about to reject the coin request from <strong>{selectedRequest.userName}</strong>. Please provide a reason for rejection.
            </p>

            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-900">
                Request: {selectedRequest.coinsRequested.toLocaleString()} coins for ₹{selectedRequest.amountPaid.toLocaleString()}
              </p>
            </div>

            <div>
              <label htmlFor="rejectNote" className="mb-1.5 block text-sm font-medium text-slate-700">
                Rejection Reason *
              </label>
              <textarea
                id="rejectNote"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Explain why this request is being rejected..."
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowRejectDialog(false);
                  setSelectedRequest(null);
                  setStatusNote('');
                }}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={updatingId === selectedRequest.id || !statusNote.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <XCircle size={18} />
                {updatingId === selectedRequest.id ? 'Rejecting…' : 'Reject Request'}
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default CoinRequestsPage;
