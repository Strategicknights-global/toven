import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import IconButton from '../components/IconButton';
import AddonCategoryDialog, {
  type AddonCategoryDialogMode,
  type AddonCategoryDialogSubmitPayload,
} from '../components/AddonCategoryDialog';
import { useAddonCategoriesStore } from '../stores/addonCategoriesStore';
import { useFoodItemsStore } from '../stores/foodItemsStore';
import type { AddonCategorySchema } from '../schemas/AddonCategorySchema';
import type { FoodItemSchema } from '../schemas/FoodItemSchema';
import Dialog from '../components/Dialog';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';

type AddonCategoryRow = AddonCategorySchema & {
  addons: FoodItemSchema[];
  missingAddonIds: string[];
};

const AddonCategoriesPage: React.FC = () => {
  const {
    addonCategories,
    loading,
    creating,
    updatingId,
    deletingId,
    loadAddonCategories,
    createAddonCategory,
    updateAddonCategory,
    deleteAddonCategory,
    totalItems,
    paginatedData,
  } = useAddonCategoriesStore();

  const { items, loading: foodItemsLoading, loadItems } = useFoodItemsStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('name');
  const [searchValue, setSearchValue] = useState('');
  const searchFields = useMemo(() => getSearchFieldsForCollection('addonCategories'), []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<AddonCategoryDialogMode>('create');
  const [selectedCategory, setSelectedCategory] = useState<AddonCategorySchema | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [categoryPendingDelete, setCategoryPendingDelete] = useState<AddonCategorySchema | null>(null);
  const [viewingCategory, setViewingCategory] = useState<AddonCategoryRow | null>(null);

  useEffect(() => {
    const search = searchValue ? { field: searchField, type: 'text' as const, value: searchValue } : null;
    void paginatedData({ pageNumber: currentPage, pageSize, search });
  }, [currentPage, pageSize, searchField, searchValue, paginatedData]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchField, searchValue]);

  const initialCategoriesLoadRef = useRef(false);
  useEffect(() => {
    if (initialCategoriesLoadRef.current) {
      return;
    }
    initialCategoriesLoadRef.current = true;
    void loadAddonCategories();
  }, [loadAddonCategories]);

  const initialItemsLoadRef = useRef(false);
  useEffect(() => {
    if (initialItemsLoadRef.current) {
      return;
    }
    initialItemsLoadRef.current = true;
    void loadItems();
  }, [loadItems]);

  const addonItems = useMemo(() => items.filter((item) => item.isAddon), [items]);

  const addonMap = useMemo(() => {
    const map = new Map<string, FoodItemSchema>();
    addonItems.forEach((addon) => {
      map.set(addon.id, addon);
    });
    return map;
  }, [addonItems]);

  const tableRows = useMemo<AddonCategoryRow[]>(() => {
    return addonCategories.map((category) => {
      const resolvedAddons = category.addonIds
        .map((id) => addonMap.get(id) ?? null)
        .filter((addon): addon is FoodItemSchema => addon != null);
      const missingAddonIds = category.addonIds.filter((id) => !addonMap.has(id));
      return {
        ...category,
        addons: resolvedAddons,
        missingAddonIds,
      };
    });
  }, [addonCategories, addonMap]);

  const columns = useMemo<DataTableColumnDef<AddonCategoryRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Addon Category',
        meta: {
          cellClassName: 'text-sm font-semibold text-slate-900',
        },
      },
      {
        id: 'addons',
        header: 'Linked Add-ons',
        cell: ({ row }) => {
          const addons = row.original.addons;
          const count = row.original.addonIds.length;
          if (count === 0) {
            return <span className="text-xs font-medium text-slate-500">No add-ons linked</span>;
          }

          const preview = addons.slice(0, 3);
          const remainder = count - preview.length;

          return (
            <div className="flex flex-wrap gap-2">
              {preview.map((addon) => (
                <span
                  key={addon.id}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                >
                  {addon.name}
                </span>
              ))}
              {remainder > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600">
                  +{remainder} more
                </span>
              ) : null}
            </div>
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
                label="View addon category"
                icon={<Eye size={16} />}
                onClick={() => setViewingCategory(category)}
                disabled={isUpdating || isDeleting}
              />
              <IconButton
                label={isUpdating ? 'Saving addon category…' : 'Edit addon category'}
                icon={<Pencil size={16} />}
                variant="primary"
                disabled={isUpdating || isDeleting}
                onClick={() => {
                  setDialogMode('edit');
                  setSelectedCategory(category);
                  setDialogOpen(true);
                }}
              />
              <IconButton
                label={isDeleting ? 'Deleting addon category…' : 'Delete addon category'}
                icon={<Trash2 size={16} />}
                variant="danger"
                disabled={isDeleting || isUpdating}
                onClick={() => {
                  setCategoryPendingDelete(category);
                  setConfirmOpen(true);
                }}
              />
            </div>
          );
        },
        meta: {
          cellClassName: 'align-middle',
        },
      },
    ],
    [updatingId, deletingId],
  );

  const openCreateDialog = useCallback(() => {
    setDialogMode('create');
    setSelectedCategory(null);
    setDialogOpen(true);
  }, []);

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedCategory(null);
  };

  const handleDialogSubmit = async (payload: AddonCategoryDialogSubmitPayload) => {
    if (dialogMode === 'create') {
      const created = await createAddonCategory({
        name: payload.name,
        addonIds: payload.addonIds,
      });
      if (created) {
        closeDialog();
      }
      return;
    }

    if (dialogMode === 'edit' && selectedCategory) {
      const updated = await updateAddonCategory(selectedCategory.id, {
        name: payload.name,
        addonIds: payload.addonIds,
      });
      if (updated) {
        closeDialog();
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!categoryPendingDelete) {
      return;
    }
    const deleted = await deleteAddonCategory(categoryPendingDelete.id, categoryPendingDelete.name);
    if (deleted) {
      setConfirmOpen(false);
      setCategoryPendingDelete(null);
    }
  };

  const dialogSubmitting = dialogMode === 'create'
    ? creating
    : selectedCategory != null && updatingId === selectedCategory.id;

  const isLoading = loading || foodItemsLoading;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Addon Categories</h1>
          <p className="text-sm text-slate-500">
            Organise your add-on library into themed groups so campaigns and bundles stay consistent.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateDialog}
          className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          disabled={addonItems.length === 0}
          title={addonItems.length === 0 ? 'Create add-ons first to build categories.' : undefined}
        >
          <Plus size={16} />
          Add Addon Category
        </button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Search</label>
            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search by category or add-on name"
                className="w-full text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-500">Addon inventory</p>
            <p className="text-sm font-semibold text-slate-900">{addonItems.length} add-ons available</p>
            <p className="text-xs text-slate-500">
              Create add-on food items from the food library to increase your grouping options.
            </p>
          </div>
        </div>
      </section>

      <DataTable<AddonCategoryRow>
        columns={columns}
        data={tableRows}
        loading={isLoading}
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
        emptyMessage={addonCategories.length === 0 ? 'No addon categories yet. Start by creating your first group.' : 'No addon categories match your search.'}
      />

      <AddonCategoryDialog
        open={dialogOpen}
        mode={dialogMode}
        initialCategory={selectedCategory ?? undefined}
        addons={addonItems}
        submitting={dialogSubmitting}
        onClose={closeDialog}
        onSubmit={handleDialogSubmit}
      />

      <Dialog
        open={Boolean(viewingCategory)}
        onClose={() => setViewingCategory(null)}
        title={viewingCategory?.name}
        description="Review the add-ons bundled into this category."
        size="lg"
      >
        {viewingCategory ? (
          <div className="space-y-6">
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Linked add-ons</h3>
              {viewingCategory.addons.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {viewingCategory.addons.map((addon) => (
                    <li key={addon.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-sm font-semibold text-slate-900">{addon.name}</p>
                      <p className="text-xs text-slate-500">
                        {addon.mealType} · {addon.category} · {addon.coins ?? 0} coins
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-500">No add-ons linked yet.</p>
              )}
            </section>

            {viewingCategory.missingAddonIds.length > 0 ? (
              <section className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <p className="font-semibold">Missing add-ons</p>
                <p className="mt-1">
                  These entries reference add-ons that are no longer available: {viewingCategory.missingAddonIds.join(', ')}
                </p>
              </section>
            ) : null}
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete addon category?"
        description={
          <span>
            This action will permanently remove the addon category <strong>{categoryPendingDelete?.name}</strong>.
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

export default AddonCategoriesPage;
