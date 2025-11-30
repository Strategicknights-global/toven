import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import CategoryDialog, {
  type CategoryDialogMode,
  type CategoryDialogSubmitPayload,
} from '../components/CategoryDialog';
import IconButton from '../components/IconButton';
import ViewCategoryDialog from '../components/ViewCategoryDialog';
import { useCategoriesStore } from '../stores/categoriesStore';
import type {
  CategoryCreateInput,
  CategorySchema,
  CategoryStatus,
  CategoryUpdateInput,
} from '../schemas/CategorySchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';

type StatusFilter = 'All' | CategoryStatus;

const STATUS_FILTERS: StatusFilter[] = ['All', 'Available', 'Unavailable'];

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/64x64?text=Cat';

const CategoriesPage: React.FC = () => {
  const {
    categories,
    loading,
    creating,
    updatingId,
    deletingId,
    totalItems,
    paginatedData,
    loadCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategoriesStore();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('name');
  const [searchTerm, setSearchTerm] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<CategoryDialogMode>('create');
  const [selectedCategory, setSelectedCategory] = useState<CategorySchema | null>(null);
  const [viewingCategory, setViewingCategory] = useState<CategorySchema | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [categoryPendingDelete, setCategoryPendingDelete] = useState<CategorySchema | null>(null);

  const searchFields = useMemo(() => getSearchFieldsForCollection('categories'), []);

  // Load paginated data when filters change
  useEffect(() => {
    const search: SearchParams | null = searchTerm
      ? {
          field: searchField,
          type: 'text',
          value: searchTerm,
        }
      : null;
    void paginatedData({
      pageNumber: currentPage,
      pageSize: pageSize,
      search,
    });
  }, [currentPage, pageSize, searchField, searchTerm, paginatedData]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchField, searchTerm]);

  const initialLoadRef = useRef(false);
  useEffect(() => {
    if (initialLoadRef.current) {
      return;
    }
    initialLoadRef.current = true;
    void loadCategories();
  }, [loadCategories]);

  const openCreateDialog = useCallback(() => {
    setDialogMode('create');
    setSelectedCategory(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((category: CategorySchema) => {
    setDialogMode('edit');
    setSelectedCategory(category);
    setDialogOpen(true);
  }, []);

  const handleView = useCallback((category: CategorySchema) => {
    setViewingCategory(category);
  }, []);

  const handleDelete = useCallback((category: CategorySchema) => {
    setCategoryPendingDelete(category);
    setConfirmOpen(true);
  }, []);

  const columns = useMemo<DataTableColumnDef<CategorySchema>[]>(
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
        header: 'Name',
        meta: {
          cellClassName: 'text-sm font-semibold text-slate-900',
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
          const category = row.original;
          const isUpdating = updatingId === category.id;
          const isDeleting = deletingId === category.id;
          return (
            <div className="flex items-center gap-2">
              <IconButton
                label="View category"
                icon={<Eye size={16} />}
                onClick={() => handleView(category)}
                disabled={isUpdating || isDeleting}
              />
              <IconButton
                label={isUpdating ? 'Saving category…' : 'Edit category'}
                icon={<Pencil size={16} />}
                variant="primary"
                disabled={isUpdating || isDeleting}
                onClick={() => handleEdit(category)}
              />
              <IconButton
                label={isDeleting ? 'Deleting category…' : 'Delete category'}
                icon={<Trash2 size={16} />}
                variant="danger"
                disabled={isDeleting || isUpdating}
                onClick={() => handleDelete(category)}
              />
            </div>
          );
        },
        meta: {
          cellClassName: 'align-middle',
        },
      },
    ],
    [updatingId, deletingId, handleView, handleEdit, handleDelete],
  );

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedCategory(null);
  };

  const handleDialogSubmit = async (payload: CategoryDialogSubmitPayload) => {
    if (dialogMode === 'create') {
      const createPayload: CategoryCreateInput = {
        name: payload.name,
        price: payload.price,
        status: payload.status,
      };
      if (payload.imageBase64) {
        createPayload.imageBase64 = payload.imageBase64;
      }
      if (payload.description !== undefined) {
        createPayload.description = payload.description ?? undefined;
      }
      if (payload.accentFrom !== undefined) {
        createPayload.accentFrom = payload.accentFrom ?? undefined;
      }
      if (payload.accentTo !== undefined) {
        createPayload.accentTo = payload.accentTo ?? undefined;
      }
      const result = await createCategory(createPayload);
      if (result) {
        closeDialog();
      }
      return;
    }

    if (dialogMode === 'edit' && selectedCategory) {
      const updatePayload: CategoryUpdateInput = {
        name: payload.name,
        price: payload.price,
        status: payload.status,
        ...(payload.imageBase64 !== undefined ? { imageBase64: payload.imageBase64 } : {}),
      };
      if (payload.description !== undefined) {
        updatePayload.description = payload.description;
      }
      if (payload.accentFrom !== undefined) {
        updatePayload.accentFrom = payload.accentFrom;
      }
      if (payload.accentTo !== undefined) {
        updatePayload.accentTo = payload.accentTo;
      }
      const success = await updateCategory(selectedCategory.id, updatePayload);
      if (success) {
        closeDialog();
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!categoryPendingDelete) return;
    const { id, name } = categoryPendingDelete;
    const deleted = await deleteCategory(id, name);
    if (deleted) {
      setConfirmOpen(false);
      setCategoryPendingDelete(null);
    }
  };

  const dialogSubmitting = dialogMode === 'create'
    ? creating
    : selectedCategory != null && updatingId === selectedCategory.id;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Categories</h1>
          <p className="text-sm text-slate-500">Organise menu categories and keep their availability up to date.</p>
        </div>
        <button
          type="button"
          onClick={openCreateDialog}
          className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <Plus size={16} />
          Add Category
        </button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
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
            Search
            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search categories"
                className="w-full text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </label>
        </div>
      </section>

      <DataTable<CategorySchema>
        columns={columns}
        data={categories}
        loading={loading}
        emptyMessage="No categories match your filters yet."
        pagination={{
          currentPage: currentPage,
          pageSize: pageSize,
          totalItems: totalItems || 0,
          onPageChange: setCurrentPage,
          onPageSizeChange: setPageSize,
        }}
        searchFields={searchFields.map((f) => ({ value: f.name, label: f.label }))}
        searchField={searchField}
        searchValue={searchTerm}
        onSearchFieldChange={setSearchField}
        onSearchValueChange={setSearchTerm}
      />

      <CategoryDialog
        open={dialogOpen}
        mode={dialogMode}
        initialCategory={selectedCategory ?? undefined}
        submitting={dialogSubmitting}
        onClose={closeDialog}
        onSubmit={handleDialogSubmit}
      />

      <ViewCategoryDialog
        open={Boolean(viewingCategory)}
        category={viewingCategory}
        onClose={() => setViewingCategory(null)}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete category?"
        description={
          <span>
            This action will permanently remove the category <strong>{categoryPendingDelete?.name}</strong>.
          </span>
        }
        confirmLabel="Delete"
        variant="danger"
        loading={categoryPendingDelete != null && deletingId === categoryPendingDelete.id}
        onCancel={() => {
          if (categoryPendingDelete && deletingId === categoryPendingDelete.id) {
            return;
          }
          setConfirmOpen(false);
          setCategoryPendingDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default CategoriesPage;
