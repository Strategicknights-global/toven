import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Percent, Plus, Trash2, Pencil } from 'lucide-react';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import CreateDayDiscountDialog, { type CreateDayDiscountPayload } from '../components/CreateDayDiscountDialog';
import { useDayDiscountsStore } from '../stores/dayDiscountsStore';
import { usePackagesStore } from '../stores/packagesStore';
import type { DayDiscountSchema } from '../schemas/DayDiscountSchema';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';

const summarizeList = (items: string[], max = 2): string => {
  if (items.length === 0) return '—';
  if (items.length <= max) return items.join(', ');
  return `${items.slice(0, max).join(', ')} +${items.length - max} more`;
};

const DaysAndDiscountsPage: React.FC = () => {
  const {
    discounts,
    loading,
    creating,
    updatingId,
    deletingId,
    loadDiscounts,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    totalItems,
    paginatedData,
  } = useDayDiscountsStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('name');
  const [searchValue, setSearchValue] = useState('');
  const searchFields = useMemo(() => getSearchFieldsForCollection('dayDiscounts'), []);

  const {
    packages,
    loading: packagesLoading,
    loadPackages,
  } = usePackagesStore();

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DayDiscountSchema | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<DayDiscountSchema | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const packagesLoadedRef = useRef(false);

  useEffect(() => {
    const search = searchValue ? { field: searchField, type: 'text' as const, value: searchValue } : null;
    void paginatedData({ pageNumber: currentPage, pageSize, search });
  }, [currentPage, pageSize, searchField, searchValue, paginatedData]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchField, searchValue]);

  const initialDiscountsLoadRef = useRef(false);
  useEffect(() => {
    if (initialDiscountsLoadRef.current) {
      return;
    }
    initialDiscountsLoadRef.current = true;
    void loadDiscounts();
  }, [loadDiscounts]);

  useEffect(() => {
    if (!packagesLoadedRef.current) {
      packagesLoadedRef.current = true;
      void loadPackages();
    }
  }, [loadPackages]);

  const sortedDiscounts = useMemo(() => {
    return [...discounts].sort((a, b) => {
      const countComparison = a.dayCount - b.dayCount;
      if (countComparison !== 0) {
        return countComparison;
      }
      return a.label.localeCompare(b.label);
    });
  }, [discounts]);

  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    // Extract category names from packages
    packages.forEach((pkg) => {
      if (!map.has(pkg.categoryId)) {
        map.set(pkg.categoryId, pkg.categoryId); // Use categoryId as name for now
      }
    });
    return map;
  }, [packages]);

  const packageMetaMap = useMemo(() => {
    const map = new Map<string, { name: string; categoryId: string }>();
    packages.forEach((pkg) => {
      map.set(pkg.id, { name: pkg.name, categoryId: pkg.categoryId });
    });
    return map;
  }, [packages]);

  const formatDiscountValue = useCallback((discount: DayDiscountSchema) => {
    if (discount.discountType === 'percentage') {
      const formatted = discount.discountValue.toFixed(2).replace(/\.00$/, '');
      return `${formatted}% off`;
    }
    const formatted = discount.discountValue
      .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      .replace(/\.00$/, '');
    return `₹${formatted} off`;
  }, []);

  const formatScopeLabel = useCallback((discount: DayDiscountSchema) => {
    if (discount.scope === 'all') {
      return 'All categories';
    }

    if (discount.scope === 'categories') {
      const names = (discount.categoryIds ?? []).map((id) => categoryNameMap.get(id) ?? 'Unknown category');
      if (names.length === 0) {
        return 'Categories · —';
      }
      return `Categories · ${summarizeList(names)}`;
    }

    const packagesList = (discount.packageIds ?? []).map((id) => {
      const meta = packageMetaMap.get(id);
      if (!meta) {
        return 'Unknown package';
      }
      const categoryName = categoryNameMap.get(meta.categoryId);
      return categoryName ? `${meta.name} (${categoryName})` : meta.name;
    });

    if (packagesList.length === 0) {
      return 'Packages · —';
    }

    return `Packages · ${summarizeList(packagesList)}`;
  }, [categoryNameMap, packageMetaMap]);

  const dialogPending = editingDiscount ? updatingId === editingDiscount.id : creating;

  const handleEditDiscount = useCallback((discount: DayDiscountSchema) => {
    setEditingDiscount(discount);
    setDialogOpen(true);
  }, []);

  const handleSubmitDiscount = useCallback(async (payload: CreateDayDiscountPayload) => {
    if (editingDiscount) {
      const updated = await updateDiscount(editingDiscount.id, payload);
      if (updated) {
        setDialogOpen(false);
        setEditingDiscount(null);
      }
      return;
    }

    const created = await createDiscount(payload);
    if (created) {
      setDialogOpen(false);
    }
  }, [createDiscount, editingDiscount, updateDiscount]);

  const columns = useMemo<DataTableColumnDef<DayDiscountSchema>[]>(
    () => [
      {
        id: 'dayCount',
        header: 'Duration',
        cell: ({ row }) => (
          <span className="font-medium text-slate-700">{row.original.dayCount} days</span>
        ),
      },
      {
        accessorKey: 'label',
        header: 'Discount',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-slate-900">{row.original.label}</div>
            <div className="text-xs text-slate-500">{formatDiscountValue(row.original)}</div>
          </div>
        ),
      },
      {
        id: 'appliesTo',
        header: 'Applies To',
        cell: ({ row }) => (
          <span className="text-sm text-slate-600">{formatScopeLabel(row.original)}</span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleEditDiscount(row.original)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-purple-300 hover:text-purple-600 disabled:opacity-60"
              disabled={dialogPending || updatingId === row.original.id}
            >
              <Pencil size={14} /> Edit
            </button>
            <button
              type="button"
              onClick={() => setPendingDelete(row.original)}
              className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
              disabled={deletingId === row.original.id || dialogPending}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        ),
      },
    ],
    [deletingId, dialogPending, formatDiscountValue, formatScopeLabel, handleEditDiscount, updatingId],
  );

  const handleCloseDialog = useCallback(() => {
    if (dialogPending) {
      return;
    }
    setDialogOpen(false);
    setEditingDiscount(null);
  }, [dialogPending]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-purple-600">Admin • Subscriptions</p>
          <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold text-slate-900">
            <CalendarDays size={28} className="text-purple-500" /> Manage Days & Discounts
          </h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Align discounts with subscription durations and decide whether they target entire categories or specific packages.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingDiscount(null);
            setDialogOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
          disabled={dialogPending}
        >
          <Plus size={16} /> Create Discount
        </button>
      </div>

      <DataTable<DayDiscountSchema>
        columns={columns}
        data={sortedDiscounts}
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
        emptyMessage="No discounts configured yet. Create one to kickstart subscription promos."
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete discount"
        description={(
          <span>
            Are you sure you want to remove the <strong>{pendingDelete?.label ?? 'selected'}</strong> discount?
            Customers will no longer see it during checkout.
          </span>
        )}
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
            await deleteDiscount(pendingDelete.id, pendingDelete.label);
            setPendingDelete(null);
          } finally {
            setConfirmLoading(false);
          }
        }}
      />

      <CreateDayDiscountDialog
        open={isDialogOpen}
        creating={dialogPending}
        mode={editingDiscount ? 'edit' : 'create'}
        initialValues={editingDiscount ?? undefined}
        packages={packages}
        packagesLoading={packagesLoading}
        onClose={handleCloseDialog}
        onSubmit={handleSubmitDiscount}
      />

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Percent size={18} className="text-purple-500" />
          How these apply during checkout
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Customers see these savings when selecting the matching duration in checkout. Combine category- or package-level
          targeting with coins or refunds to craft compelling offers.
        </p>
      </div>
    </div>
  );
};

export default DaysAndDiscountsPage;
