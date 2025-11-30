import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, Mail, MessageSquare, User } from 'lucide-react';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import IconButton from '../components/IconButton';
import Dialog from '../components/Dialog';
import { useCustomerInquiriesStore } from '../stores/customerInquiriesStore';
import type { CustomerInquirySchema, CustomerInquiryStatus } from '../schemas/CustomerInquirySchema';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';
import { useUsersStore } from '../stores/usersStore';
import { getDisplayCustomerId } from '../utils/customerDisplay';

const statusLabels: Record<CustomerInquiryStatus, string> = {
  new: 'New',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

const statusTone: Record<CustomerInquiryStatus, string> = {
  new: 'bg-purple-50 text-purple-700 border-purple-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const statusOptions: CustomerInquiryStatus[] = ['new', 'in_progress', 'resolved'];

const formatDateTime = (value?: Date): string => {
  if (!value) {
    return '—';
  }
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(value);
  } catch (error) {
    console.error('Failed to format inquiry date', error);
    return value.toLocaleString();
  }
};

const CustomerInquiriesPage: React.FC = () => {
  const {
    inquiries,
    loading,
    creating,
    updatingId,
    loadInquiries,
    updateInquiry,
    totalItems,
    paginatedData,
  } = useCustomerInquiriesStore();
  const users = useUsersStore((state) => state.users);
  const loadUsers = useUsersStore((state) => state.loadUsers);
  const usersLoading = useUsersStore((state) => state.loading);

  const [viewingInquiry, setViewingInquiry] = useState<CustomerInquirySchema | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('subject');
  const [searchValue, setSearchValue] = useState('');
  const searchFields = useMemo(() => getSearchFieldsForCollection('customerInquiries'), []);

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
    void loadInquiries();
  }, [loadInquiries]);

  useEffect(() => {
    if (users.length === 0 && !usersLoading) {
      void loadUsers();
    }
  }, [users.length, usersLoading, loadUsers]);

  const customerLookup = useMemo(() => {
    const map = new Map<string, { customerId?: string | null; userId?: string | null }>();
    users.forEach((user) => {
      if (user.email) {
        map.set(user.email.toLowerCase(), {
          customerId: user.customerId ?? null,
          userId: user.id ?? null,
        });
      }
    });
    return map;
  }, [users]);

  const resolveInquiryCustomerId = useCallback(
    (inquiry: CustomerInquirySchema | null): string => {
      if (!inquiry) {
        return '—';
      }

      const directDisplayId = getDisplayCustomerId(
        inquiry.customerShortId ?? undefined,
        inquiry.userId ?? undefined,
        { allowFallback: true },
      );

      if (directDisplayId !== '—') {
        return directDisplayId;
      }

      const matched = inquiry.email ? customerLookup.get(inquiry.email.toLowerCase()) : undefined;
      if (!matched) {
        return '—';
      }

      return getDisplayCustomerId(matched.customerId ?? undefined, matched.userId ?? undefined, {
        allowFallback: true,
      });
    },
    [customerLookup],
  );

  const handleStatusChange = useCallback(
    async (id: string, status: CustomerInquiryStatus) => {
      await updateInquiry(id, { status });
    },
    [updateInquiry],
  );

  const columns = useMemo<DataTableColumnDef<CustomerInquirySchema>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Customer',
        cell: ({ row }) => {
          const inquiry = row.original;
          const displayId = resolveInquiryCustomerId(inquiry);
          return (
            <div className="space-y-1 text-sm text-slate-700">
              <p className="flex items-center gap-2 font-semibold text-slate-900">
                <User size={14} className="text-purple-500" />
                {inquiry.name || 'Anonymous'}
              </p>
              <span className="flex items-center gap-2 text-xs text-slate-500">
                <Mail size={12} />
                {inquiry.email || 'No email provided'}
              </span>
              {displayId !== '—' ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                  CID: {displayId}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: 'subject',
        header: 'Subject',
        cell: ({ row }) => {
          const inquiry = row.original;
          return (
            <div className="max-w-xs text-sm text-slate-700">
              <p className="font-medium text-slate-900">{inquiry.subject || '—'}</p>
              <p className="text-xs text-slate-500 line-clamp-2">{inquiry.message}</p>
            </div>
          );
        },
      },
      {
        id: 'createdAt',
        header: 'Received',
        cell: ({ row }) => {
          const inquiry = row.original;
          return (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CalendarClock size={14} className="text-purple-400" />
              {formatDateTime(inquiry.createdAt)}
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const inquiry = row.original;
          const isUpdating = updatingId === inquiry.id || creating;
          return (
            <select
              value={inquiry.status}
              onChange={(event) => handleStatusChange(inquiry.id, event.target.value as CustomerInquiryStatus)}
              disabled={isUpdating}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:opacity-60"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const inquiry = row.original;
          return (
            <div className="flex items-center gap-2">
              <IconButton
                label="View message"
                icon={<MessageSquare size={16} />}
                onClick={() => setViewingInquiry(inquiry)}
              />
            </div>
          );
        },
      },
    ],
    [creating, handleStatusChange, resolveInquiryCustomerId, updatingId],
  );

  const sortedInquiries = useMemo(() => {
    return [...inquiries].sort((a, b) => {
      const createdA = a.createdAt?.getTime() ?? 0;
      const createdB = b.createdAt?.getTime() ?? 0;
      return createdB - createdA;
    });
  }, [inquiries]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-500">Admin • Support</p>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-900">
            <MessageSquare size={28} className="text-purple-500" /> Customer Inquiries
          </h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Review incoming messages from the public contact form, triage follow-ups, and mark conversations as resolved.
          </p>
        </div>
      </header>

      <DataTable<CustomerInquirySchema>
        data={sortedInquiries}
        columns={columns}
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
        emptyMessage="No customer inquiries yet. Once visitors reach out through the contact page, you will see them here."
        enableSorting
      />

      <Dialog
        open={!!viewingInquiry}
        onClose={() => setViewingInquiry(null)}
        title={viewingInquiry ? viewingInquiry.subject || 'Inquiry details' : 'Inquiry details'}
        description={viewingInquiry?.email}
        size="lg"
        footer={
          <div className="flex justify-between items-center w-full">
            {viewingInquiry ? (
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                  statusTone[viewingInquiry.status]
                }`}
              >
                {statusLabels[viewingInquiry.status]}
              </span>
            ) : <span />}
            <button
              type="button"
              onClick={() => setViewingInquiry(null)}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              Close
            </button>
          </div>
        }
      >
        {viewingInquiry ? (
          <div className="space-y-4">
            <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Name</p>
                <p className="mt-1 font-medium text-slate-900">{viewingInquiry.name || 'Anonymous'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</p>
                <p className="mt-1 text-slate-700">{viewingInquiry.email || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Received</p>
                <p className="mt-1 text-slate-700">{formatDateTime(viewingInquiry.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Updated</p>
                <p className="mt-1 text-slate-700">{formatDateTime(viewingInquiry.updatedAt)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Customer ID</p>
                <p className="mt-1 font-mono text-sm text-slate-700">{resolveInquiryCustomerId(viewingInquiry)}</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-slate-900">Message</h2>
              <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{viewingInquiry.message || 'No message provided.'}</p>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
};

export default CustomerInquiriesPage;
