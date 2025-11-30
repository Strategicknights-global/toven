import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import CreateVerificationLocationDialog from '../components/CreateVerificationLocationDialog';
import { useVerificationLocationsStore } from '../stores/verificationLocationsStore';
import type { VerificationLocationSchema } from '../schemas/VerificationLocationSchema';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';

const formatDateTime = (value?: Date) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(value);
  } catch (error) {
    console.error('Failed to format date', error);
    return value?.toString() ?? '';
  }
};

const VerificationLocationsPage: React.FC = () => {
  const {
    locations,
    loading,
    creating,
    deleting,
    createLocation,
    deleteLocation,
    totalItems,
    paginatedData,
  } = useVerificationLocationsStore();

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<VerificationLocationSchema | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('name');
  const [searchValue, setSearchValue] = useState('');
  const searchFields = useMemo(() => getSearchFieldsForCollection('verificationLocations'), []);

  useEffect(() => {
    const search = searchValue ? { field: searchField, type: 'text' as const, value: searchValue } : null;
    void paginatedData({ pageNumber: currentPage, pageSize, search });
  }, [currentPage, pageSize, searchField, searchValue, paginatedData]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchField, searchValue]);

  const sortedLocations = useMemo(
    () => [...locations].sort((a, b) => a.name.localeCompare(b.name)),
    [locations],
  );

  const columns = useMemo<DataTableColumnDef<VerificationLocationSchema>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        meta: {
          cellClassName: 'font-semibold text-slate-900',
        },
      },
      {
        id: 'createdAt',
        header: 'Created',
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setPendingDelete(row.original)}
            className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
            disabled={deleting}
          >
            <Trash2 size={14} /> Delete
          </button>
        ),
      },
    ],
    [deleting],
  );

  const handleCreateLocation = async (value: string) => {
    try {
      await createLocation({ name: value });
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to create verification location', error);
      throw error;
    }
  };

  return (
    <div className="p-6 mx-auto max-w-5xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-purple-600">Admin • Verification Locations</p>
          <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold text-slate-900">
            <MapPin size={28} className="text-purple-500" /> Manage Verification Locations
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Define the verification locations your team can assign to customers, couriers, and subscriptions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
          disabled={creating}
        >
          <Plus size={16} />
          New Verification Location
        </button>
      </div>

      <DataTable<VerificationLocationSchema>
        columns={columns}
        data={sortedLocations}
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
        emptyMessage="No verification locations found. Create one above."
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete Verification Location"
        description={
          <span>
            Are you sure you want to delete{' '}
            <strong>{pendingDelete?.name ?? 'this verification location'}</strong>? This action cannot be undone.
          </span>
        }
        confirmLabel="Delete"
        variant="danger"
        loading={confirmLoading}
        onCancel={() => {
          if (!confirmLoading) {
            setPendingDelete(null);
          }
        }}
        onConfirm={async () => {
          if (!pendingDelete) return;
          setConfirmLoading(true);
          try {
            await deleteLocation(pendingDelete.id, pendingDelete.name);
            setPendingDelete(null);
          } catch (error) {
            console.error('Failed to delete verification location', error);
          } finally {
            setConfirmLoading(false);
          }
        }}
      />

      <CreateVerificationLocationDialog
        open={isDialogOpen}
        creating={creating}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreateLocation}
      />
    </div>
  );
};

export default VerificationLocationsPage;
