import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import PackageDialog, {
  type PackageDialogMode,
  type PackageDialogSubmitPayload,
} from '../components/PackageDialog';
import IconButton from '../components/IconButton';
import ViewPackageDialog from '../components/ViewPackageDialog';
import { usePackagesStore } from '../stores/packagesStore';
import { useCategoriesStore } from '../stores/categoriesStore';
import type {
  PackageCreateInput,
  PackageSchema,
  PackageStatus,
  PackageUpdateInput,
} from '../schemas/PackageSchema';
import type { MealType } from '../schemas/FoodItemSchema';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';

type MealFilter = 'All' | MealType;
type StatusFilter = 'All' | PackageStatus;

const MEAL_FILTERS: MealFilter[] = ['All', 'Breakfast', 'Lunch', 'Dinner'];
const STATUS_FILTERS: StatusFilter[] = ['All', 'Available', 'Unavailable'];

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/64x64?text=Pkg';

const PackagesPage: React.FC = () => {
  const {
    packages,
    loading,
    creating,
    updatingId,
    deletingId,
    createPackage,
    updatePackage,
    deletePackage,
    totalItems,
    paginatedData,
  } = usePackagesStore();

  const { categoryOptions, loadCategoryOptions, optionsLoaded } = useCategoriesStore();

  const [mealFilter, setMealFilter] = useState<MealFilter>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('name');
  const [searchValue, setSearchValue] = useState('');
  const searchFields = useMemo(() => getSearchFieldsForCollection('packages'), []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<PackageDialogMode>('create');
  const [selectedPackage, setSelectedPackage] = useState<PackageSchema | null>(null);
  const [viewingPackage, setViewingPackage] = useState<PackageSchema | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [packagePendingDelete, setPackagePendingDelete] = useState<PackageSchema | null>(null);

  useEffect(() => {
    const search = searchValue ? { field: searchField, type: 'text' as const, value: searchValue } : null;
    void paginatedData({ pageNumber: currentPage, pageSize, search });
  }, [currentPage, pageSize, searchField, searchValue, paginatedData]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchField, searchValue]);

  useEffect(() => {
    if (!optionsLoaded) {
      void loadCategoryOptions();
    }
  }, [loadCategoryOptions, optionsLoaded]);

  const openCreateDialog = useCallback(() => {
    setDialogMode('create');
    setSelectedPackage(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((pkg: PackageSchema) => {
    setDialogMode('edit');
    setSelectedPackage(pkg);
    setDialogOpen(true);
  }, []);

  const handleView = useCallback((pkg: PackageSchema) => {
    setViewingPackage(pkg);
  }, []);

  const handleDelete = useCallback((pkg: PackageSchema) => {
    setPackagePendingDelete(pkg);
    setConfirmOpen(true);
  }, []);

  const filteredPackages = useMemo(() => {
    // Filter by meal type and status (client-side for quick UI response)
    return packages.filter((pkg) => {
      const matchesMeal = mealFilter === 'All' || pkg.mealType === mealFilter;
      const matchesStatus = statusFilter === 'All' || pkg.status === statusFilter;
      return matchesMeal && matchesStatus;
    });
  }, [packages, mealFilter, statusFilter]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categoryOptions.forEach((category) => {
      map.set(category.id, category.name);
    });
    return map;
  }, [categoryOptions]);

  const columns = useMemo<DataTableColumnDef<PackageSchema>[]>(
    () => [
      {
        id: 'image',
        header: 'Image',
        cell: ({ row }) => {
          const imageSrc = row.original.imageBase64 || PLACEHOLDER_IMAGE;
          return (
            <div className="h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <img
                src={imageSrc}
                alt={row.original.name}
                className="h-full w-full object-cover"
                onError={(event) => {
                  (event.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                }}
              />
            </div>
          );
        },
        meta: {
          cellClassName: 'align-middle',
        },
      },
      {
        accessorKey: 'name',
        header: 'Package Name',
        meta: {
          cellClassName: 'text-sm font-semibold text-slate-900',
        },
      },
      {
        accessorKey: 'categoryId',
        header: 'Category',
        cell: ({ row }) => (
          <span className="text-sm text-slate-600">
            {categoryMap.get(row.original.categoryId) ?? '—'}
          </span>
        ),
        meta: {
          cellClassName: 'text-sm text-slate-600',
        },
      },
      {
        accessorKey: 'mealType',
        header: 'Meal Type',
        meta: {
          cellClassName: 'text-sm text-slate-600',
        },
      },
      {
        accessorKey: 'price',
        header: 'Price',
        cell: ({ row }) => <span className="text-sm font-semibold text-purple-600">₹{row.original.price}</span>,
        meta: {
          cellClassName: 'text-sm font-semibold text-purple-600',
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const isAvailable = row.original.status === 'Available';
          return (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
                isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {row.original.status}
            </span>
          );
        },
        meta: {
          cellClassName: 'text-sm',
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const pkg = row.original;
          const isUpdating = updatingId === pkg.id;
          const isDeleting = deletingId === pkg.id;
          return (
            <div className="flex items-center gap-2">
              <IconButton
                label="View package"
                icon={<Eye size={16} />}
                onClick={() => handleView(pkg)}
                disabled={isUpdating || isDeleting}
              />
              <IconButton
                label={isUpdating ? 'Saving package…' : 'Edit package'}
                icon={<Pencil size={16} />}
                variant="primary"
                disabled={isUpdating || isDeleting}
                onClick={() => handleEdit(pkg)}
              />
              <IconButton
                label={isDeleting ? 'Deleting package…' : 'Delete package'}
                icon={<Trash2 size={16} />}
                variant="danger"
                disabled={isDeleting || isUpdating}
                onClick={() => handleDelete(pkg)}
              />
            </div>
          );
        },
        meta: {
          cellClassName: 'align-middle',
        },
      },
    ],
    [updatingId, deletingId, handleView, handleEdit, handleDelete, categoryMap],
  );

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedPackage(null);
  };

  const handleDialogSubmit = async (payload: PackageDialogSubmitPayload) => {
    if (dialogMode === 'create') {
      const createPayload: PackageCreateInput = {
        name: payload.name,
        categoryId: payload.categoryId,
        mealType: payload.mealType,
        price: payload.price,
        status: payload.status,
        dateMenus: payload.dateMenus,
      };
      if (payload.menuDescription) {
        createPayload.menuDescription = payload.menuDescription;
      }
      if (payload.imageBase64) {
        createPayload.imageBase64 = payload.imageBase64;
      }
      const result = await createPackage(createPayload);
      if (result) {
        closeDialog();
      }
      return;
    }

    if (dialogMode === 'edit' && selectedPackage) {
      const updatePayload: PackageUpdateInput = {
        name: payload.name,
        categoryId: payload.categoryId,
        mealType: payload.mealType,
        price: payload.price,
        status: payload.status,
        dateMenus: payload.dateMenus,
      };
      if (payload.menuDescription !== undefined) {
        updatePayload.menuDescription = payload.menuDescription ?? null;
      }
      if (payload.imageBase64 !== undefined) {
        updatePayload.imageBase64 = payload.imageBase64;
      }
      const success = await updatePackage(selectedPackage.id, updatePayload);
      if (success) {
        closeDialog();
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!packagePendingDelete) return;
    const { id, name } = packagePendingDelete;
    const deleted = await deletePackage(id, name);
    if (deleted) {
      setConfirmOpen(false);
      setPackagePendingDelete(null);
    }
  };

  const dialogSubmitting = dialogMode === 'create'
    ? creating
    : selectedPackage != null && updatingId === selectedPackage.id;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Packages</h1>
          <p className="text-sm text-slate-500">Review curated meal packages and manage their availability.</p>
        </div>
        <button
          type="button"
          onClick={openCreateDialog}
          className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <Plus size={16} />
          Add Package
        </button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Meal Type
            <div className="flex flex-wrap gap-2">
              {MEAL_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setMealFilter(filter)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    mealFilter === filter
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Status
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStatusFilter(filter)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    statusFilter === filter
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Search
            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search packages"
                className="w-full text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </label>
        </div>
      </section>

      <DataTable<PackageSchema>
        columns={columns}
        data={filteredPackages}
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
        emptyMessage="No packages match your filters yet."
      />

      <PackageDialog
        open={dialogOpen}
        mode={dialogMode}
        initialPackage={selectedPackage ?? undefined}
  categories={categoryOptions}
        submitting={dialogSubmitting}
        onClose={closeDialog}
        onSubmit={handleDialogSubmit}
      />

      <ViewPackageDialog
        open={Boolean(viewingPackage)}
        pkg={viewingPackage}
        categoryName={viewingPackage ? categoryMap.get(viewingPackage.categoryId) : undefined}
        onClose={() => setViewingPackage(null)}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete package?"
        description={
          <span>
            This action will permanently remove the package <strong>{packagePendingDelete?.name}</strong>.
          </span>
        }
        confirmLabel="Delete"
        variant="danger"
        loading={packagePendingDelete != null && deletingId === packagePendingDelete.id}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (packagePendingDelete && deletingId === packagePendingDelete.id) {
            return;
          }
          setConfirmOpen(false);
          setPackagePendingDelete(null);
        }}
      />
    </div>
  );
};

export default PackagesPage;
