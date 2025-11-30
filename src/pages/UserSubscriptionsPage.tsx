import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSubscriptionRequestsStore } from '../stores/subscriptionRequestsStore';
import { auth } from '../firebase';
import { CheckCircle, XCircle, Calendar, Clock, Package2, AlertCircle, Info } from 'lucide-react';
import { SubscriptionRequestModel } from '../firestore';
import { useToastStore } from '../stores/toastStore';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import type { SubscriptionRefundInfo, SubscriptionRequestSchema, SubscriptionRequestStatus } from '../schemas/SubscriptionRequestSchema';
import {
  isPauseWindowClosed,
  getEarliestPauseDateLabel,
  getMinutesUntilPauseCutoff,
  getPauseCutoffTimeLabel,
} from '../utils/subscriptionPause';
import ManagePausingDialog from '../components/ManagePausingDialog';
import { useUserDeliveryLocationsStore } from '../stores/userDeliveryLocationsStore';
import { resolveCutoffHour } from '../utils/timeWindow';
import { useConfigStore } from '../stores/configStore';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';

const statusMeta: Record<SubscriptionRequestStatus, { label: string; badge: string; accent: string }> = {
  pending: {
    label: 'Pending',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    accent: 'text-amber-600',
  },
  approved: {
    label: 'Approved',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    accent: 'text-emerald-600',
  },
  rejected: {
    label: 'Rejected',
    badge: 'bg-red-50 text-red-600 border-red-200',
    accent: 'text-red-600',
  },
  cancelled: {
    label: 'Cancelled',
    badge: 'bg-gray-50 text-gray-600 border-gray-200',
    accent: 'text-gray-600',
  },
};

const formatCurrency = (value: number): string => {
  const rounded = Math.round(value);
  return `₹${rounded.toLocaleString('en-IN')}`;
};

const formatDate = (value?: Date | null): string => {
  if (!value) return '—';
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

const UserSubscriptionsPage: React.FC = () => {
  const { requests, loading, loadRequests, totalItems, paginatedData } = useSubscriptionRequestsStore();
  const { addToast } = useToastStore();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [locationUpdatingId, setLocationUpdatingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pausingDialogOpen, setPausingDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionRequestSchema | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<SubscriptionRequestSchema | null>(null);
  const [cancelPreview, setCancelPreview] = useState<SubscriptionRefundInfo | null>(null);
  const [cancelPreviewLoading, setCancelPreviewLoading] = useState(false);
  const [cancelPreviewError, setCancelPreviewError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('id');
  const [searchValue, setSearchValue] = useState('');
  const searchFields = useMemo(() => getSearchFieldsForCollection('subscriptionRequests'), []);

  const appConfig = useConfigStore((state) => state.config);
  const configLoaded = useConfigStore((state) => state.loaded);
  const loadConfig = useConfigStore((state) => state.loadConfig);

  const deliveryLocations = useUserDeliveryLocationsStore((state) => state.locations);
  const deliveryLocationsLoading = useUserDeliveryLocationsStore((state) => state.loading);
  const loadDeliveryLocations = useUserDeliveryLocationsStore((state) => state.loadLocations);
  const autoAssignedLocationIdsRef = useRef<Set<string>>(new Set());
  const cancelPreviewRequestRef = useRef<string | null>(null);
  const initialRequestsLoadRef = useRef(false);

  // Update time every minute to refresh pause window status
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const search = searchValue ? { field: searchField, type: 'text' as const, value: searchValue } : null;
    void paginatedData({ pageNumber: currentPage, pageSize, search });
  }, [currentPage, pageSize, searchField, searchValue, paginatedData]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchField, searchValue]);

  useEffect(() => {
    if (initialRequestsLoadRef.current) {
      return;
    }
    initialRequestsLoadRef.current = true;
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      return;
    }
    void loadDeliveryLocations(uid);
  }, [loadDeliveryLocations]);

  useEffect(() => {
    if (!configLoaded) {
      void loadConfig();
    }
  }, [configLoaded, loadConfig]);

  const pauseCutoffHour = useMemo(
    () => resolveCutoffHour(appConfig?.subscriptionPauseCutoffHour),
    [appConfig?.subscriptionPauseCutoffHour],
  );

  // Check pause window status
  const isPauseWindowClosedNow = useMemo(
    () => isPauseWindowClosed(currentTime, { cutoffHour: pauseCutoffHour }),
    [currentTime, pauseCutoffHour],
  );
  const earliestPauseDateLabel = useMemo(
    () => getEarliestPauseDateLabel(currentTime, { locale: 'en-IN', cutoffHour: pauseCutoffHour }),
    [currentTime, pauseCutoffHour],
  );
  const minutesUntilCutoff = useMemo(
    () => getMinutesUntilPauseCutoff(currentTime, { cutoffHour: pauseCutoffHour }),
    [currentTime, pauseCutoffHour],
  );
  const pauseCutoffTimeLabel = useMemo(() => getPauseCutoffTimeLabel(pauseCutoffHour), [pauseCutoffHour]);

  // Get user's subscription requests
  const userSubscriptions = useMemo(() => {
    if (!auth.currentUser) return [];
    return requests
      .filter(req => req.userId === auth.currentUser?.uid)
      .sort((a, b) => {
        // Sort by createdAt descending (newest first)
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return dateB - dateA;
      });
  }, [requests]);

  // Get active subscriptions (approved status only and not expired)
  const activeSubscriptions = useMemo(() => {
    return userSubscriptions.filter(req => {
      if (req.status !== 'approved') return false;
      if (req.endDate instanceof Date && req.endDate < new Date()) return false;
      return true;
    });
  }, [userSubscriptions]);

  // Calculate total paused meals across all active subscriptions
  const totalPausedMeals = useMemo(() => {
    return activeSubscriptions.reduce((total, subscription) => {
      const pausedCount = subscription.pausedMeals ? subscription.pausedMeals.length : 0;
      return total + pausedCount;
    }, 0);
  }, [activeSubscriptions]);

  // Get pending subscriptions
  const pendingSubscriptions = useMemo(() => {
    return userSubscriptions.filter(req => req.status === 'pending');
  }, [userSubscriptions]);

  // Get package names from selections
  const getPackageNames = (subscription: SubscriptionRequestSchema): string => {
    if (!subscription.selections || subscription.selections.length === 0) {
      return 'No packages';
    }
    return subscription.selections
      .map(sel => `${sel.packageName} (${sel.mealType})`)
      .join(', ');
  };

  // Open manage pausing dialog
  const handleOpenPausingDialog = (subscription: SubscriptionRequestSchema) => {
    setSelectedSubscription(subscription);
    setPausingDialogOpen(true);
  };

  // Handle update paused meals
  const handleUpdatePausedMeals = async (pausedMeals: import('../schemas/SubscriptionRequestSchema').PausedMeal[]) => {
    if (!selectedSubscription?.id) return;
    
    setActionLoading(selectedSubscription.id);
    try {
      await SubscriptionRequestModel.update(selectedSubscription.id, { 
        pausedMeals
      });
      addToast('Paused meals updated successfully', 'success');
      await loadRequests();
    } catch (error) {
      console.error('Error updating paused meals:', error);
      addToast('Failed to update paused meals', 'error');
      throw error;
    } finally {
      setActionLoading(null);
    }
  };

  // Handle clear all paused meals
  const handleClearAllPausedMeals = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to clear all paused meals?')) return;
    
    setActionLoading(subscriptionId);
    try {
      await SubscriptionRequestModel.update(subscriptionId, { 
        pausedMeals: []
      });
      addToast('All paused meals cleared', 'success');
      await loadRequests();
    } catch (error) {
      console.error('Error clearing paused meals:', error);
      addToast('Failed to clear paused meals', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeliveryLocationChange = useCallback(async (
    subscription: SubscriptionRequestSchema,
    locationId: string,
  ): Promise<boolean> => {
    if (!subscription.id) {
      return false;
    }

    setLocationUpdatingId(subscription.id);
    try {
      if (!locationId) {
        await SubscriptionRequestModel.update(subscription.id, {
          deliveryLocationId: null,
          deliveryLocationName: null,
          deliveryLocationAddress: null,
          deliveryLocationCoordinates: null,
          deliveryLocationLandmark: null,
          deliveryLocationContactName: null,
          deliveryLocationContactPhone: null,
        });
        addToast('Delivery location cleared for this subscription.', 'info');
      } else {
        const location = deliveryLocations.find((item) => item.id === locationId);
        if (!location) {
          addToast('Delivery location not found. Please refresh and try again.', 'error');
          return false;
        }

        await SubscriptionRequestModel.update(subscription.id, {
          deliveryLocationId: location.id ?? null,
          deliveryLocationName: location.locationName ?? null,
          deliveryLocationAddress: location.address ?? null,
          deliveryLocationCoordinates: location.coordinates ?? null,
          deliveryLocationLandmark: location.landmark ?? null,
          deliveryLocationContactName: location.contactName ?? null,
          deliveryLocationContactPhone: location.contactPhone ?? null,
        });
        addToast('Delivery location updated for this subscription.', 'success');
      }
      await loadRequests();
      return true;
    } catch (error) {
      console.error('Failed to update delivery location', error);
      addToast('Failed to update delivery location. Please try again.', 'error');
      return false;
    } finally {
      setLocationUpdatingId(null);
    }
  }, [addToast, deliveryLocations, loadRequests]);

  useEffect(() => {
    if (deliveryLocationsLoading) {
      return;
    }

    const defaultLocation = deliveryLocations.find((location) => location.isDefault)
      ?? deliveryLocations[0]
      ?? null;

    if (!defaultLocation?.id) {
      return;
    }

    const subscriptionsNeedingLocation = userSubscriptions.filter((subscription) => {
      if (!subscription.id) {
        return false;
      }
      if (subscription.status === 'cancelled') {
        return false;
      }
      if (subscription.deliveryLocationId) {
        return false;
      }
      if (autoAssignedLocationIdsRef.current.has(subscription.id)) {
        return false;
      }
      return true;
    });

    if (subscriptionsNeedingLocation.length === 0) {
      return;
    }

    const applyDefault = async () => {
      for (const subscription of subscriptionsNeedingLocation) {
        const subscriptionId = subscription.id;
        if (!subscriptionId) {
          continue;
        }

        autoAssignedLocationIdsRef.current.add(subscriptionId);
        const success = await handleDeliveryLocationChange(subscription, defaultLocation.id ?? '');
        if (!success) {
          autoAssignedLocationIdsRef.current.delete(subscriptionId);
        }
      }
    };

    void applyDefault();
  }, [
    deliveryLocations,
    deliveryLocationsLoading,
    handleDeliveryLocationChange,
    userSubscriptions,
  ]);

  // Handle cancel subscription
  const handleCancelSubscription = (subscription: SubscriptionRequestSchema) => {
    if (!subscription.id) {
      return;
    }

    setCancelTarget(subscription);
    setCancelDialogOpen(true);
    setCancelPreview(null);
    setCancelPreviewError(null);
    setCancelPreviewLoading(true);
    cancelPreviewRequestRef.current = subscription.id;

    void (async () => {
      try {
        const preview = await SubscriptionRequestModel.previewCancellation(subscription.id!);
        if (cancelPreviewRequestRef.current !== subscription.id) {
          return;
        }
        setCancelPreview(preview);
      } catch (error) {
        console.error('Error loading cancellation preview:', error);
        if (cancelPreviewRequestRef.current === subscription.id) {
          setCancelPreviewError('Could not load refund details. You can still cancel this subscription.');
        }
      } finally {
        if (cancelPreviewRequestRef.current === subscription.id) {
          setCancelPreviewLoading(false);
        }
      }
    })();
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget?.id) {
      return;
    }

    setActionLoading(cancelTarget.id);
    try {
      await SubscriptionRequestModel.update(cancelTarget.id, { status: 'cancelled' });
      addToast('Subscription cancelled successfully', 'success');
      await loadRequests();
      handleCloseCancelDialog();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      addToast('Failed to cancel subscription', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCloseCancelDialog = () => {
    cancelPreviewRequestRef.current = null;
    setCancelDialogOpen(false);
    setCancelTarget(null);
    setCancelPreview(null);
    setCancelPreviewError(null);
    setCancelPreviewLoading(false);
  };

  const renderCancelDescription = (): React.ReactNode => {
    if (!cancelTarget) {
      return (
        <div className="text-sm text-slate-600">
          Cancelling this subscription will stop future deliveries immediately.
        </div>
      );
    }

    if (cancelPreviewLoading) {
      return (
        <div className="text-sm text-slate-600">
          Calculating refund details...
        </div>
      );
    }

    if (cancelPreviewError) {
      return (
        <div className="space-y-2 text-sm">
          <p className="text-red-600">{cancelPreviewError}</p>
          <p className="text-slate-600">Cancelling will stop future meals immediately.</p>
        </div>
      );
    }

    if (!cancelPreview) {
      return (
        <div className="space-y-2 text-sm text-slate-700">
          <p>Cancelling now will stop future deliveries for this subscription.</p>
          <p className="font-medium text-red-600">No refund is available under the current policy.</p>
        </div>
      );
    }

    const refundAmount = Math.max(0, cancelPreview.amount ?? 0);
    const remainingAmount = Math.max(0, cancelPreview.remainingAmount ?? 0);
    const remainingDays = Math.max(0, cancelPreview.remainingDays ?? 0);
    const percentApplied = Math.max(0, cancelPreview.percentApplied ?? 0);
    const tierLabel = cancelPreview.tierLabel ?? 'current refund tier';
    const notes = cancelPreview.notes;
    const sourceLabel = cancelPreview.source === 'coins' ? 'wallet coins' : cancelPreview.source ?? 'wallet coins';

    if (refundAmount <= 0) {
      return (
        <div className="space-y-3 text-sm text-slate-700">
          <p>
            Cancelling <span className="font-medium">{getPackageNames(cancelTarget)}</span> today uses the{' '}
            <span className="font-medium">{tierLabel}</span> refund policy.
          </p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-900">No refund available</p>
            <p className="mt-1 text-xs text-slate-600">
              The remaining value of {formatCurrency(remainingAmount)} across {remainingDays === 1 ? '1 day' : `${remainingDays} days`} is not refundable in this tier.
            </p>
          </div>
          {notes ? <p className="text-xs text-slate-500">{notes}</p> : null}
          <p className="text-xs text-slate-500">Meals after today will be cancelled immediately.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 text-sm text-slate-700">
        <p>
          Cancelling <span className="font-medium">{getPackageNames(cancelTarget)}</span> today applies the{' '}
          <span className="font-medium">{tierLabel}</span> refund policy.
        </p>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Refund amount</span>
            <span className="text-base font-semibold text-slate-900">{formatCurrency(refundAmount)}</span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            {percentApplied}% of {formatCurrency(remainingAmount)} remaining value across {remainingDays === 1 ? '1 day' : `${remainingDays} days`}.
          </p>
          <p className="mt-1 text-xs text-slate-600">Credited instantly as {sourceLabel}.</p>
        </div>
        {notes ? <p className="text-xs text-slate-500">{notes}</p> : null}
        <p className="text-xs text-slate-500">Meals after today will be cancelled immediately.</p>
      </div>
    );
  };

  const cancelConfirmLoading = cancelTarget?.id ? actionLoading === cancelTarget.id : false;
  const cancelConfirmLabel = (() => {
    const amount = cancelPreview?.amount ?? 0;
    if (amount > 0) {
      return `Cancel & Refund ${formatCurrency(amount)}`;
    }
    return 'Cancel Subscription';
  })();

  // Table columns definition
  const columns: DataTableColumnDef<SubscriptionRequestSchema>[] = [
    {
      accessorKey: 'packages',
      header: 'Packages',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <div className="font-medium text-gray-900">
            {getPackageNames(row.original)}
          </div>
          <div className="text-xs text-gray-500">
            {row.original.categoryName} • {row.original.dietPreference === 'mixed' ? 'Mixed' : 'Pure Veg'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'duration',
      header: 'Duration',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <div className="text-sm text-gray-900">
            {formatDate(row.original.startDate)} to {formatDate(row.original.endDate)}
          </div>
          <div className="text-xs text-gray-500">
            {row.original.durationDays} days
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <div className="font-semibold text-gray-900">
            {formatCurrency(row.original.summary.totalPayable)}
          </div>
          {row.original.summary.discountAmount > 0 && (
            <div className="text-xs text-green-600">
              Saved {formatCurrency(row.original.summary.discountAmount)}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const hasPausedDates = row.original.pausedMeals && row.original.pausedMeals.length > 0;
        const isExpired = row.original.endDate instanceof Date && row.original.endDate < new Date();
        const displayStatus = isExpired ? 'expired' : row.original.status;
        const meta = statusMeta[row.original.status];
        
        return (
          <div className="flex flex-col gap-1">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isExpired 
                ? 'bg-gray-50 text-gray-700 border-gray-200'
                : meta.badge
            } w-fit`}>
              {displayStatus === 'approved' && !isExpired && <CheckCircle className="w-3 h-3" />}
              {displayStatus === 'pending' && <Clock className="w-3 h-3" />}
              {(displayStatus === 'rejected' || displayStatus === 'cancelled' || isExpired) && <XCircle className="w-3 h-3" />}
              {isExpired ? 'Expired' : meta.label}
            </span>
            {hasPausedDates && row.original.pausedMeals && !isExpired && (
              <span className="text-xs text-yellow-600 font-medium">
                {row.original.pausedMeals.length} meal{row.original.pausedMeals.length !== 1 ? 's' : ''} paused
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'deliveryLocation',
      header: 'Delivery Location',
      cell: ({ row }) => {
        const subscription = row.original;
        const currentLocationId = subscription.deliveryLocationId ?? '';
        const isSaving = locationUpdatingId === subscription.id;
        const canManage = subscription.status === 'approved';
        const isSelectDisabled = !canManage || isSaving || deliveryLocationsLoading;
        const noSavedLocations = deliveryLocations.length === 0;

        if (deliveryLocationsLoading && deliveryLocations.length === 0) {
          return <span className="text-xs text-gray-500">Loading locations…</span>;
        }

        return (
          <div className="flex flex-col gap-2">
            <select
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
              value={currentLocationId}
              disabled={isSelectDisabled}
              onChange={(event) => handleDeliveryLocationChange(subscription, event.target.value)}
            >
              <option value="">
                {noSavedLocations ? 'No saved delivery locations' : 'Select a delivery location'}
              </option>
              {deliveryLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.locationName}
                </option>
              ))}
            </select>
            <div className="text-xs text-gray-500 space-y-1">
              {subscription.deliveryLocationName ? (
                <div>
                  <p className="font-medium text-gray-700">{subscription.deliveryLocationName}</p>
                  {subscription.deliveryLocationAddress ? (
                    <p className="text-gray-500 line-clamp-2">{subscription.deliveryLocationAddress}</p>
                  ) : null}
                  {subscription.deliveryLocationContactPhone ? (
                    <p className="text-gray-400">{subscription.deliveryLocationContactPhone}</p>
                  ) : null}
                </div>
              ) : (
                <p className="text-gray-400">No delivery location set.</p>
              )}
              <Link to="/profile" className="text-purple-600 hover:underline">
                Manage delivery locations
              </Link>
              {!canManage ? (
                <p className="text-[11px] text-gray-400">Set a delivery location after the subscription is approved.</p>
              ) : null}
              {isSaving ? <p className="text-[11px] text-purple-500">Saving…</p> : null}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const isActionInProgress = actionLoading === row.original.id;
        const hasPausedMeals = row.original.pausedMeals && row.original.pausedMeals.length > 0;
        const canManage = row.original.status === 'approved';

        if (!canManage) {
          return <span className="text-xs text-gray-400">—</span>;
        }

        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenPausingDialog(row.original)}
              disabled={isActionInProgress}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Manage pausing meals"
            >
              <Calendar className="w-3 h-3" />
              Manage Pausing
            </button>
            {hasPausedMeals && (
              <button
                onClick={() => handleClearAllPausedMeals(row.original.id!)}
                disabled={isActionInProgress}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Clear all paused meals"
              >
                Clear All
              </button>
            )}
            <button
              onClick={() => handleCancelSubscription(row.original)}
              disabled={isActionInProgress}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Cancel subscription"
            >
              <XCircle className="w-3 h-3" />
              Cancel
            </button>
          </div>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">My Subscriptions</h1>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading subscriptions...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold text-gray-800">My Subscriptions</h1>
          <Link
            to="/subscription"
            className="inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            Browse Subscription Plans
          </Link>
        </div>

        {/* Pause Window Information Banner */}
        {activeSubscriptions.length > 0 && (
          <div className={`mb-6 p-4 rounded-lg border ${
            isPauseWindowClosedNow
              ? 'bg-amber-50 border-amber-200'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-start gap-3">
              {isPauseWindowClosedNow ? (
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className={`font-semibold mb-1 ${
                  isPauseWindowClosedNow ? 'text-amber-900' : 'text-blue-900'
                }`}>
                  {isPauseWindowClosedNow ? 'Pause Window Closed' : 'Pause Window Open'}
                </h3>
                <p className={`text-sm ${
                  isPauseWindowClosedNow ? 'text-amber-700' : 'text-blue-700'
                }`}>
                  {isPauseWindowClosedNow ? (
                    <>
                      The pause window for tomorrow has closed. You can pause your subscription from{' '}
                      <span className="font-medium">{earliestPauseDateLabel}</span> onwards.
                      The pause window closes daily at <span className="font-medium">{pauseCutoffTimeLabel}</span>.
                    </>
                  ) : (
                    <>
                      You can pause your subscription for <span className="font-medium">{earliestPauseDateLabel}</span>.
                      Pause window closes in <span className="font-medium">{minutesUntilCutoff} minutes</span> at{' '}
                      <span className="font-medium">{pauseCutoffTimeLabel}</span> today.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-800">Active</h3>
            </div>
            <p className="text-3xl font-bold text-green-600">{activeSubscriptions.length}</p>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-yellow-800">Total Paused Meals</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-600">{totalPausedMeals}</p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">Pending</h3>
            </div>
            <p className="text-3xl font-bold text-blue-600">{pendingSubscriptions.length}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Package2 className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-800">Total</h3>
            </div>
            <p className="text-3xl font-bold text-gray-600">{userSubscriptions.length}</p>
          </div>
        </div>

        {/* No Subscriptions Message */}
        {userSubscriptions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
            <Package2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Subscriptions Yet</h3>
            <p className="text-gray-600 mb-6">You haven't subscribed to any packages yet.</p>
            <Link
              to="/subscription"
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Browse Subscription Plans
            </Link>
          </div>
        ) : (
          <div>
            <DataTable
              columns={columns}
              data={userSubscriptions}
              emptyMessage="No subscriptions found"
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
        )}

        {/* Manage Pausing Dialog */}
        {selectedSubscription && (
          <ManagePausingDialog
            isOpen={pausingDialogOpen}
            onClose={() => {
              setPausingDialogOpen(false);
              setSelectedSubscription(null);
            }}
            subscription={selectedSubscription}
            onUpdatePausedMeals={handleUpdatePausedMeals}
            pauseCutoffHour={pauseCutoffHour}
          />
        )}
      </div>
      <ConfirmDialog
        open={cancelDialogOpen}
        onCancel={handleCloseCancelDialog}
        onConfirm={async () => { await handleConfirmCancel(); }}
        title="Cancel subscription?"
        description={renderCancelDescription()}
        confirmLabel={cancelConfirmLabel}
        cancelLabel="Keep Subscription"
        variant="danger"
        loading={cancelConfirmLoading}
      />
    </>
  );
};

export default UserSubscriptionsPage;
