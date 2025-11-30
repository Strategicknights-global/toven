import React, { useEffect, useState } from 'react';
import { CheckCircle, Eye, Loader2, RefreshCcw, Star, Trash2, XCircle } from 'lucide-react';
import { useRatingsStore } from '../stores/ratingsStore';
import { useToastStore } from '../stores/toastStore';
import StarRating from '../components/StarRating';
import ConfirmDialog from '../components/ConfirmDialog';
import type { RatingSchema } from '../schemas/RatingSchema';

const RatingsPage: React.FC = () => {
  const { ratings, loading, loadRatings, updateStatus, deleteRating } = useRatingsStore();
  const addToast = useToastStore((state) => state.addToast);
  
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedRating, setSelectedRating] = useState<RatingSchema | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [ratingToDelete, setRatingToDelete] = useState<string | null>(null);

  useEffect(() => {
    void loadRatings();
  }, [loadRatings]);

  const filteredRatings = ratings.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const stats = {
    total: ratings.length,
    pending: ratings.filter((r) => r.status === 'pending').length,
    approved: ratings.filter((r) => r.status === 'approved').length,
    rejected: ratings.filter((r) => r.status === 'rejected').length,
    averageRating:
      ratings.filter((r) => r.status === 'approved').length > 0
        ? ratings
            .filter((r) => r.status === 'approved')
            .reduce((acc, r) => acc + r.rating, 0) / ratings.filter((r) => r.status === 'approved').length
        : 0,
  };

  const handleApprove = async (id: string) => {
    const success = await updateStatus(id, 'approved');
    if (success) {
      addToast('Rating approved successfully', 'success');
    } else {
      addToast('Failed to approve rating', 'error');
    }
  };

  const handleReject = async (id: string) => {
    const success = await updateStatus(id, 'rejected');
    if (success) {
      addToast('Rating rejected successfully', 'success');
    } else {
      addToast('Failed to reject rating', 'error');
    }
  };

  const handleDelete = async () => {
    if (!ratingToDelete) return;
    
    const success = await deleteRating(ratingToDelete);
    if (success) {
      addToast('Rating deleted successfully', 'success');
      setShowDeleteDialog(false);
      setRatingToDelete(null);
    } else {
      addToast('Failed to delete rating', 'error');
    }
  };

  const handleView = (rating: RatingSchema) => {
    setSelectedRating(rating);
    setShowViewDialog(true);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
            <CheckCircle className="h-3 w-3" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
            <XCircle className="h-3 w-3" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            <Loader2 className="h-3 w-3" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Ratings & Feedback</h1>
            <p className="mt-1 text-sm text-slate-600">Manage customer ratings and reviews</p>
          </div>
          <button
            type="button"
            onClick={() => void loadRatings()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2">
                <Star className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Total Ratings</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2">
                <Loader2 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Pending</p>
                <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Approved</p>
                <p className="text-2xl font-bold text-slate-900">{stats.approved}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 p-2">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Rejected</p>
                <p className="text-2xl font-bold text-slate-900">{stats.rejected}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Avg Rating</p>
                <p className="text-2xl font-bold text-slate-900">{stats.averageRating.toFixed(1)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto rounded-lg bg-white p-1 shadow-sm">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-semibold capitalize transition ${
                filter === tab
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Ratings List */}
        {loading && ratings.length === 0 ? (
          <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : filteredRatings.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <Star className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-lg font-semibold text-slate-900">No ratings found</p>
            <p className="mt-1 text-sm text-slate-600">
              {filter === 'all'
                ? 'No ratings have been submitted yet'
                : `No ${filter} ratings found`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRatings.map((rating) => (
              <div
                key={rating.id}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  {/* Left Section */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-slate-900">{rating.userName}</h3>
                          {getStatusBadge(rating.status)}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{rating.userEmail}</p>
                        <div className="mt-2">
                          <StarRating rating={rating.rating} readonly size="sm" />
                        </div>
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-slate-700">
                      {rating.feedback}
                    </p>

                    <p className="mt-3 text-xs text-slate-500">
                      Submitted on {formatDate(rating.createdAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 lg:flex-col">
                    <button
                      type="button"
                      onClick={() => handleView(rating)}
                      className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>

                    {rating.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={() => void handleApprove(rating.id!)}
                        className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                    )}

                    {rating.status !== 'rejected' && (
                      <button
                        type="button"
                        onClick={() => void handleReject(rating.id!)}
                        className="flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setRatingToDelete(rating.id!);
                        setShowDeleteDialog(true);
                      }}
                      className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Dialog */}
      {showViewDialog && selectedRating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-xl font-bold text-slate-900">Rating Details</h2>
              <button
                type="button"
                onClick={() => setShowViewDialog(false)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Customer</label>
                  <p className="mt-1 text-slate-900">{selectedRating.userName}</p>
                  <p className="text-sm text-slate-600">{selectedRating.userEmail}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Rating</label>
                  <div className="mt-2">
                    <StarRating rating={selectedRating.rating} readonly size="lg" showCount />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Feedback</label>
                  <p className="mt-2 rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                    {selectedRating.feedback}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Status</label>
                  <div className="mt-2">{getStatusBadge(selectedRating.status)}</div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Submitted</label>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatDate(selectedRating.createdAt)}
                    </p>
                  </div>

                  {selectedRating.updatedAt && (
                    <div>
                      <label className="text-sm font-semibold text-slate-700">Last Updated</label>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatDate(selectedRating.updatedAt)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowViewDialog(false)}
                  className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete Rating"
        description="Are you sure you want to delete this rating? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          setShowDeleteDialog(false);
          setRatingToDelete(null);
        }}
      />
    </div>
  );
};

export default RatingsPage;
