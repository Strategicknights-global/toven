import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ReferralModel, UserModel, WalletModel } from '../firestore';
import type { ReferralSchema } from '../schemas/ReferralSchema';
import { useToastStore } from '../stores/toastStore';
import DataTable from '../components/DataTable';
import { CheckCircle, XCircle, Eye, RefreshCw } from 'lucide-react';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';
import { getDisplayCustomerId } from '../utils/customerDisplay';
interface ReferralWithDetails extends ReferralSchema {
  referrerName?: string;
  referrerEmail?: string;
  referredUserName?: string;
  referredUserEmail?: string;
  referrerCustomerId?: string;
  referredCustomerId?: string;
}

const AdminReferralsPage: React.FC = () => {
  const [referrals, setReferrals] = useState<ReferralWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReferral, setSelectedReferral] = useState<ReferralWithDetails | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [totalItems, setTotalItems] = useState(0);
  const [searchField, setSearchField] = useState('referrerId');
  const [searchValue, setSearchValue] = useState('');
  const searchFields = useMemo(() => getSearchFieldsForCollection('referrals'), []);
  const { addToast } = useToastStore();

  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    try {
      // Build search parameters
      const searchParams = searchValue.trim() ? {
        field: searchField,
        value: searchValue.trim(),
        type: searchFields.find(f => f.name === searchField)?.type || 'text',
      } : null;

      // Get paginated referrals from server
      const { data, total } = await ReferralModel.searchPaginated(
        { pageNumber: currentPage, pageSize },
        searchParams
      );

      // Fetch referrer details for each referral
      const referralsWithDetails = await Promise.all(
        data.map(async (referral) => {
          try {
            const [referrer, referred] = await Promise.all([
              UserModel.findById(referral.referrerId),
              referral.referredUserId ? UserModel.findById(referral.referredUserId) : Promise.resolve(null),
            ]);

            const existingReferrer = (referral as Partial<ReferralWithDetails>).referrerName;
            const existingReferrerEmail = (referral as Partial<ReferralWithDetails>).referrerEmail;
            const existingReferredName = (referral as Partial<ReferralWithDetails>).referredUserName;
            const existingReferredEmail = (referral as Partial<ReferralWithDetails>).referredUserEmail;

            return {
              ...referral,
              referrerName: referrer?.fullName ?? existingReferrer ?? undefined,
              referrerEmail: referrer?.email ?? existingReferrerEmail ?? undefined,
              referrerCustomerId: referrer?.customerId ?? undefined,
              referredUserName: existingReferredName ?? referred?.fullName ?? undefined,
              referredUserEmail: existingReferredEmail ?? referred?.email ?? undefined,
              referredCustomerId: referred?.customerId ?? undefined,
            } satisfies ReferralWithDetails;
          } catch (error) {
            console.error(`Error fetching referral details for ${referral.id ?? referral.referralCode}:`, error);
            return referral;
          }
        })
      );

      setReferrals(referralsWithDetails);
      setTotalItems(total);
    } catch (error) {
      console.error('Error fetching referrals:', error);
      addToast('Failed to load referrals', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchValue, searchField, searchFields, currentPage, pageSize, addToast]);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchField, searchValue]);

  const handleApprove = async (referral: ReferralWithDetails) => {
    if (!referral.id) return;
    
    setProcessing(true);
    try {
      // Update referral status to completed
      await ReferralModel.updateById(referral.id, { status: 'completed' });
      
      // Award coins to referrer if not already awarded
      if (referral.status !== 'completed') {
        await WalletModel.addCoins(referral.referrerId, referral.coinsEarned);
      }

      addToast('Referral approved successfully', 'success');
      fetchReferrals();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error approving referral:', error);
      addToast('Failed to approve referral', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (referral: ReferralWithDetails) => {
    if (!referral.id) return;
    
    setProcessing(true);
    try {
      // Update referral status to cancelled
      await ReferralModel.updateById(referral.id, { status: 'cancelled' });
      
      // If coins were already awarded, deduct them
      if (referral.status === 'completed') {
        await WalletModel.addCoins(referral.referrerId, -referral.coinsEarned);
      }

      addToast('Referral rejected', 'success');
      fetchReferrals();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error rejecting referral:', error);
      addToast('Failed to reject referral', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const stats = {
    total: totalItems,
    pending: referrals.filter((r) => r.status === 'pending').length,
    completed: referrals.filter((r) => r.status === 'completed').length,
    cancelled: referrals.filter((r) => r.status === 'cancelled').length,
    totalCoinsAwarded: referrals
      .filter((r) => r.status === 'completed')
      .reduce((sum, r) => sum + r.coinsEarned, 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading referrals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Referral Management</h1>
              <p className="mt-2 text-gray-600">Review and manage user referrals</p>
            </div>
            <button
              onClick={fetchReferrals}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm font-medium text-gray-600">Total Referrals</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm font-medium text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm font-medium text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm font-medium text-gray-600">Cancelled</p>
            <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm font-medium text-gray-600">Coins Awarded</p>
            <p className="text-2xl font-bold text-purple-600">{stats.totalCoinsAwarded}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="text-sm text-gray-600">
            Use the search controls in the table below to filter referrals.
          </div>
        </div>

        {/* Referrals Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {referrals.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No referrals found</p>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  accessorKey: 'referralCode',
                  header: 'Referral Code',
                  cell: ({ getValue }) => (
                    <span className="font-mono text-sm font-semibold text-purple-600">{getValue() as string}</span>
                  ),
                },
                {
                  accessorKey: 'referrerName',
                  header: 'Referrer',
                  cell: ({ row }) => (
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium text-gray-900">{row.original.referrerName || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{row.original.referrerEmail || 'N/A'}</div>
                      {(() => {
                        const displayId = getDisplayCustomerId(row.original.referrerCustomerId, row.original.referrerId, { allowFallback: true });
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
                  ),
                },
                {
                  accessorKey: 'referredUserName',
                  header: 'Referred User',
                  cell: ({ row }) => (
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium text-gray-900">{row.original.referredUserName || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{row.original.referredUserEmail || 'N/A'}</div>
                      {(() => {
                        const displayId = getDisplayCustomerId(row.original.referredCustomerId, row.original.referredUserId, { allowFallback: true });
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
                  ),
                },
                {
                  accessorKey: 'coinsEarned',
                  header: 'Coins',
                  cell: ({ getValue }) => (
                    <span className="text-sm font-semibold text-yellow-600">{getValue() as number} coins</span>
                  ),
                },
                {
                  accessorKey: 'createdAt',
                  header: 'Date',
                  cell: ({ getValue }) => {
                    const value = getValue() as Date | undefined;
                    return (
                      <span className="text-sm text-gray-500">
                        {value ? new Date(value).toLocaleDateString() : 'N/A'}
                      </span>
                    );
                  },
                },
                {
                  accessorKey: 'status',
                  header: 'Status',
                  cell: ({ getValue }) => {
                    const value = getValue() as string;
                    return (
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          value === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : value === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {value}
                      </span>
                    );
                  },
                },
                {
                  id: 'actions',
                  header: 'Actions',
                  cell: ({ row }) => (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedReferral(row.original);
                          setShowDetailModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {row.original.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(row.original)}
                            className="text-green-600 hover:text-green-800"
                            title="Approve"
                            disabled={processing}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleReject(row.original)}
                            className="text-red-600 hover:text-red-800"
                            title="Reject"
                            disabled={processing}
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  ),
                },
              ]}
              data={referrals}
              pagination={{
                currentPage,
                pageSize,
                totalItems,
                onPageChange: setCurrentPage,
                onPageSizeChange: setPageSize,
              }}
              searchFields={searchFields.map(f => ({ value: f.name, label: f.label }))}
              searchField={searchField}
              searchValue={searchValue}
              onSearchFieldChange={setSearchField}
              onSearchValueChange={setSearchValue}
            />
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedReferral && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Referral Details</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Referrer</p>
                  <p className="text-base font-semibold text-gray-900">{selectedReferral.referrerName || 'N/A'}</p>
                  <p className="text-sm text-gray-600">{selectedReferral.referrerEmail || 'N/A'}</p>
                  <p className="text-xs font-mono text-gray-500 break-all">{selectedReferral.referrerId}</p>
                  {(() => {
                    const displayId = getDisplayCustomerId(
                      selectedReferral.referrerCustomerId,
                      selectedReferral.referrerId,
                      { allowFallback: true }
                    );
                    return displayId === '—' ? null : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                        CID: <span className="text-xs">{displayId}</span>
                      </span>
                    );
                  })()}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Referred User</p>
                  <p className="text-base font-semibold text-gray-900">{selectedReferral.referredUserName || 'N/A'}</p>
                  <p className="text-sm text-gray-600">{selectedReferral.referredUserEmail || 'N/A'}</p>
                  <p className="text-xs font-mono text-gray-500 break-all">{selectedReferral.referredUserId || 'N/A'}</p>
                  {(() => {
                    const displayId = getDisplayCustomerId(
                      selectedReferral.referredCustomerId,
                      selectedReferral.referredUserId,
                      { allowFallback: true }
                    );
                    return displayId === '—' ? null : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                        CID: <span className="text-xs">{displayId}</span>
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6">
                <div>
                  <p className="text-sm font-medium text-gray-600">Coins Earned</p>
                  <p className="text-xl font-bold text-yellow-600">{selectedReferral.coinsEarned} coins</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Referral Code</p>
                  <p className="text-base font-mono text-gray-700">{selectedReferral.referralCode}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <p className="text-base font-semibold text-gray-900 capitalize">{selectedReferral.status}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Date Created</p>
                  <p className="text-base text-gray-900">
                    {selectedReferral.createdAt
                      ? new Date(selectedReferral.createdAt).toLocaleString()
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {selectedReferral.status === 'pending' && (
                <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0 pt-4 border-t">
                  <button
                    onClick={() => handleApprove(selectedReferral)}
                    disabled={processing}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span>{processing ? 'Processing...' : 'Approve Referral'}</span>
                  </button>
                  <button
                    onClick={() => handleReject(selectedReferral)}
                    disabled={processing}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <XCircle className="h-5 w-5" />
                    <span>{processing ? 'Processing...' : 'Reject Referral'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReferralsPage;
