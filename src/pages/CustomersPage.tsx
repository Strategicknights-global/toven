import React, { useEffect, useMemo, useState } from 'react';
import { useUsersStore } from '../stores/usersStore';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import type { UserSchema } from '../schemas/UserSchema';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';
import { Eye, User, MapPin, Calendar, Hash } from 'lucide-react';
import Tooltip from '../components/Tooltip';
import Dialog from '../components/Dialog';
import { getDisplayCustomerId } from '../utils/customerDisplay';
import { UserDeliveryLocationModel } from '../firestore/UserDeliveryLocationModel';
import type { UserDeliveryLocationSchema } from '../schemas/UserDeliveryLocationSchema';

const formatDateTime = (value?: Date | null): string => {
  if (!value || !(value instanceof Date) || Number.isNaN(value.getTime())) {
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

// Customers are users who have a role named 'User' (case-insensitive) or userType === 'User'.
const CustomersPage: React.FC = () => {
  const {
    users,
    availableRoles,
    loadAvailableRoles,
    rolesLoaded,
    rolesLoading,
    loading,
    totalItems,
    paginatedData,
  } = useUsersStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('fullName');
  const [searchValue, setSearchValue] = useState('');
  const searchFields = useMemo(() => getSearchFieldsForCollection('users'), []);

  const [viewingCustomer, setViewingCustomer] = useState<UserSchema | null>(null);
  const [locationCache, setLocationCache] = useState<Record<string, UserDeliveryLocationSchema | null>>({});
  const [locationLoadingId, setLocationLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const search = searchValue ? { field: searchField, type: 'text' as const, value: searchValue } : null;
    void paginatedData({ pageNumber: currentPage, pageSize, search });
  }, [currentPage, pageSize, searchField, searchValue, paginatedData]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchField, searchValue]);

  useEffect(() => {
    if (!rolesLoaded && !rolesLoading) {
      void loadAvailableRoles();
    }
  }, [loadAvailableRoles, rolesLoaded, rolesLoading]);

  useEffect(() => {
    if (!viewingCustomer?.id) {
      setLocationLoadingId(null);
      return;
    }

    if (Object.prototype.hasOwnProperty.call(locationCache, viewingCustomer.id)) {
      return;
    }

    let cancelled = false;
    setLocationLoadingId(viewingCustomer.id);

    void UserDeliveryLocationModel.getDefault(viewingCustomer.id)
      .then((location) => {
        if (!cancelled) {
          setLocationCache((prev) => ({ ...prev, [viewingCustomer.id!]: location }));
        }
      })
      .catch((error) => {
        console.error('Failed to load default delivery location', error);
        if (!cancelled) {
          setLocationCache((prev) => ({ ...prev, [viewingCustomer.id!]: null }));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLocationLoadingId((current) => (current === viewingCustomer.id ? null : current));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [viewingCustomer, locationCache]);

  const userRoleId = useMemo(() => {
    const role = availableRoles.find(r => r.name.toLowerCase() === 'user');
    return role?.id;
  }, [availableRoles]);

  const customers = useMemo(() => {
    const filtered = users.filter(u => {
      if (u.userType && u.userType.toLowerCase() === 'user') return true;
      if (!userRoleId) return false;
      return (u.roles || []).includes(userRoleId);
    });

    // Sort by creation date in descending order (newest first)
    return filtered.sort((a, b) => {
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : -Infinity;
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : -Infinity;
      return bTime - aTime;
    });
  }, [users, userRoleId]);

  const columns = useMemo<DataTableColumnDef<UserSchema>[]>(() => [
    {
      id: 'customerId',
      header: 'CUSTOMER ID',
      cell: ({ row }) => getDisplayCustomerId(row.original.customerId, row.original.id, { allowFallback: true }),
      meta: { cellClassName: 'text-xs font-mono text-slate-600 whitespace-nowrap font-semibold' }
    },
    {
      accessorKey: 'fullName',
      header: 'Name',
      meta: { cellClassName: 'text-sm font-medium text-slate-800 whitespace-nowrap' }
    },
    {
      accessorKey: 'email',
      header: 'Email',
      meta: { cellClassName: 'text-sm text-slate-500 whitespace-nowrap' }
    },
    {
      id: 'phone',
      header: 'Phone',
      cell: ({ row }) => row.original.phone || row.original.contactNumber || '—',
      meta: { cellClassName: 'text-sm text-slate-500 whitespace-nowrap' }
    },
    {
      id: 'role',
      header: 'Role',
      cell: () => 'User',
      meta: { cellClassName: 'text-sm text-slate-600' }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Tooltip label="View details">
            <button
              type="button"
              onClick={() => setViewingCustomer(row.original)}
              className="rounded-full p-2 text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={`View ${row.original.fullName}`}
            >
              <Eye size={16} />
            </button>
          </Tooltip>
        </div>
      ),
      meta: { cellClassName: 'text-xs' }
    }
  ], []);

  const viewingCustomerLocation = viewingCustomer?.id ? locationCache[viewingCustomer.id] : undefined;
  const viewingLocationLoading = viewingCustomer?.id ? locationLoadingId === viewingCustomer.id : false;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Customers</h1>
      <DataTable<UserSchema>
        columns={columns}
        data={customers}
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
        emptyMessage="No customers found." />

      {/* View Customer Dialog */}
      <Dialog
        open={!!viewingCustomer}
        onClose={() => setViewingCustomer(null)}
        title="Customer Details"
        size="lg"
      >
        {viewingCustomer && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <User size={16} className="text-purple-500" />
                  Personal Information
                </h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Customer ID:</strong>{' '}
                    <span className="font-mono font-semibold text-indigo-600">
                      {getDisplayCustomerId(viewingCustomer.customerId, viewingCustomer.id, { allowFallback: true })}
                    </span>
                  </p>
                  <p><strong>Name:</strong> {viewingCustomer.fullName || '—'}</p>
                  <p><strong>Email:</strong> {viewingCustomer.email || '—'}</p>
                  <p><strong>Phone:</strong> {viewingCustomer.phone || viewingCustomer.contactNumber || '—'}</p>
                  <p><strong>User Type:</strong> {viewingCustomer.userType || '—'}</p>
                </div>
              </div>

              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <MapPin size={16} className="text-purple-500" />
                  Location Details
                </h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Primary Delivery Location:</strong>{' '}
                    {viewingLocationLoading ? 'Loading delivery location…' : (viewingCustomerLocation?.address || 'Manage via delivery locations')}
                  </p>
                  {viewingCustomerLocation?.locationName ? (
                    <p><strong>Label:</strong> {viewingCustomerLocation.locationName}</p>
                  ) : null}
                  <p><strong>Verification Location:</strong> {viewingCustomer.verificationLocationName || '—'}</p>
                </div>
              </div>
            </div>

            {(viewingCustomer.referralCode || viewingCustomer.groupId || viewingCustomer.createdAt) && (
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Hash size={16} className="text-purple-500" />
                  Additional Information
                </h3>
                <div className="space-y-2 text-sm">
                  {viewingCustomer.referralCode && (
                    <p><strong>Referral Code:</strong> <span className="font-mono">{viewingCustomer.referralCode}</span></p>
                  )}
                  {viewingCustomer.groupId && (
                    <p><strong>Group ID:</strong> <span className="font-mono">{viewingCustomer.groupId}</span></p>
                  )}
                  {viewingCustomer.createdAt && (
                    <p className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-500" />
                      <strong>Joined:</strong> {formatDateTime(viewingCustomer.createdAt)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default CustomersPage;