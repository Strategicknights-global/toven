import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import FoodItemDialog, { type FoodItemDialogMode, type FoodItemDialogSubmitPayload } from '../components/FoodItemDialog';
import IconButton from '../components/IconButton';
import ViewFoodItemDialog from '../components/ViewFoodItemDialog';
import { useFoodItemsStore } from '../stores/foodItemsStore';
import type { FoodItemSchema } from '../schemas/FoodItemSchema';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';

type FilterCategory = 'All' | 'Veg' | 'Non-Veg';
type FilterMeal = 'All' | 'Breakfast' | 'Lunch' | 'Dinner';
type FilterAddon = 'All' | 'Add-on' | 'Standard';

const CATEGORY_FILTERS: FilterCategory[] = ['All', 'Veg', 'Non-Veg'];
const MEAL_TYPE_FILTERS: FilterMeal[] = ['All', 'Breakfast', 'Lunch', 'Dinner'];
const ADDON_FILTERS: FilterAddon[] = ['All', 'Add-on', 'Standard'];

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/48x48?text=Food';

const FoodItemsListPage: React.FC = () => {
  const {
    items,
    loading,
    creating,
    updatingId,
    deletingId,
    loadItems,
    createItem,
    updateItem,
    deleteItem,
    totalItems,
    paginatedData,
  } = useFoodItemsStore();

  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('All');
  const [mealFilter, setMealFilter] = useState<FilterMeal>('All');
  const [addonFilter, setAddonFilter] = useState<FilterAddon>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('name');
  const [searchValue, setSearchValue] = useState('');
  const searchFields = useMemo(() => getSearchFieldsForCollection('foodItems'), []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<FoodItemDialogMode>('create');
  const [selectedItem, setSelectedItem] = useState<FoodItemSchema | null>(null);
  const [viewingItem, setViewingItem] = useState<FoodItemSchema | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [itemPendingDelete, setItemPendingDelete] = useState<FoodItemSchema | null>(null);

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
    void loadItems();
  }, [loadItems]);

  const openCreateDialog = () => {
    setDialogMode('create');
    setSelectedItem(null);
    setDialogOpen(true);
  };

  const handleEdit = useCallback((item: FoodItemSchema) => {
    setDialogMode('edit');
    setSelectedItem(item);
    setDialogOpen(true);
  }, []);

  const handleView = useCallback((item: FoodItemSchema) => {
    setViewingItem(item);
  }, []);

  const handleDelete = useCallback((item: FoodItemSchema) => {
    setItemPendingDelete(item);
    setConfirmOpen(true);
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
      const matchesMeal = mealFilter === 'All' || item.mealType === mealFilter;
      const matchesAddon =
        addonFilter === 'All'
          ? true
          : addonFilter === 'Add-on'
            ? item.isAddon
            : !item.isAddon;
      return matchesCategory && matchesMeal && matchesAddon;
    });
  }, [items, categoryFilter, mealFilter, addonFilter]);

  const toggleAddonStatus = useCallback(async (item: FoodItemSchema) => {
    await updateItem(item.id, { isAddon: !item.isAddon });
  }, [updateItem]);

  const columns = useMemo<DataTableColumnDef<FoodItemSchema>[]>(
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
          cellClassName: 'text-sm font-medium text-slate-800',
        },
      },
      {
        accessorKey: 'category',
        header: 'Category',
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
        accessorKey: 'coins',
        header: 'Coins',
        cell: ({ row }) => <span className="font-semibold text-purple-600">{row.original.coins}</span>,
        meta: {
          cellClassName: 'text-sm font-semibold text-purple-600',
        },
      },
      {
        accessorKey: 'discountCoins',
        header: 'Discount Coins',
        cell: ({ row }) => (
          <span className="text-sm text-emerald-600">
            {row.original.discountCoins != null ? row.original.discountCoins : '—'}
          </span>
        ),
        meta: {
          cellClassName: 'text-sm font-semibold text-emerald-600',
        },
      },
      {
        id: 'addon-status',
        header: 'Add-on',
        cell: ({ row }) => {
          const item = row.original;
          const isProcessing = updatingId === item.id;
          const activeStyles = item.isAddon
            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
            : 'bg-slate-100 text-slate-600 border-slate-200';
          return (
            <button
              type="button"
              onClick={() => toggleAddonStatus(item)}
              disabled={isProcessing}
              className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:cursor-not-allowed disabled:opacity-60 ${activeStyles}`}
            >
              {isProcessing ? 'Updating…' : item.isAddon ? 'Add-on' : 'Standard'}
            </button>
          );
        },
        meta: {
          cellClassName: 'text-center',
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const item = row.original;
          const isUpdating = updatingId === item.id;
          const isDeleting = deletingId === item.id;
          return (
            <div className="flex items-center gap-2">
              <IconButton
                label="View food item"
                icon={<Eye size={16} />}
                onClick={() => handleView(item)}
                disabled={isUpdating || isDeleting}
              />
              <IconButton
                label={isUpdating ? 'Saving food item…' : 'Edit food item'}
                icon={<Pencil size={16} />}
                variant="primary"
                disabled={isUpdating || isDeleting}
                onClick={() => handleEdit(item)}
              />
              <IconButton
                label={isDeleting ? 'Deleting food item…' : 'Delete food item'}
                icon={<Trash2 size={16} />}
                variant="danger"
                disabled={isDeleting || isUpdating}
                onClick={() => handleDelete(item)}
              />
            </div>
          );
        },
        meta: {
          cellClassName: 'align-middle',
        },
      },
    ],
    [updatingId, deletingId, handleView, handleEdit, handleDelete, toggleAddonStatus],
  );

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedItem(null);
  };

  const handleDialogSubmit = async (payload: FoodItemDialogSubmitPayload) => {
    if (dialogMode === 'create') {
      const createPayload = {
        name: payload.name,
        category: payload.category,
        mealType: payload.mealType,
        coins: payload.coins,
        discountCoins: payload.discountCoins,
        isAddon: payload.isAddon,
        addonDescription: payload.addonDescription ?? null,
        addonAccentFrom: payload.addonAccentFrom ?? null,
        addonAccentTo: payload.addonAccentTo ?? null,
        ...(payload.imageBase64 ? { imageBase64: payload.imageBase64 } : {}),
      };
      const result = await createItem(createPayload);
      if (result) {
        closeDialog();
      }
      return;
    }

    if (dialogMode === 'edit' && selectedItem) {
      const updatePayload = {
        name: payload.name,
        category: payload.category,
        mealType: payload.mealType,
        coins: payload.coins,
        discountCoins: payload.discountCoins ?? null,
        imageBase64: payload.imageBase64,
        isAddon: payload.isAddon,
        addonDescription: payload.addonDescription ?? null,
        addonAccentFrom: payload.addonAccentFrom ?? null,
        addonAccentTo: payload.addonAccentTo ?? null,
      };
      const success = await updateItem(selectedItem.id, updatePayload);
      if (success) {
        closeDialog();
      }
    }
  };

  const confirmDelete = async () => {
    if (!itemPendingDelete) return;
    const { id, name } = itemPendingDelete;
    const deleted = await deleteItem(id, name);
    if (deleted) {
      setConfirmOpen(false);
      setItemPendingDelete(null);
    }
  };

  const dialogSubmitting = dialogMode === 'create'
    ? creating
    : selectedItem != null && updatingId === selectedItem.id;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Food Items</h1>
          <p className="text-sm text-slate-500">Manage the dishes available for menus and curated packages.</p>
        </div>
        <button
          type="button"
          onClick={openCreateDialog}
          className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <Plus size={16} />
          Add Food Item
        </button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Category
            <div className="flex flex-wrap gap-2">
              {CATEGORY_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setCategoryFilter(filter)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    categoryFilter === filter
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
            Meal Type
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPE_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setMealFilter(filter)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    mealFilter === filter
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
            Add-on Status
            <div className="flex flex-wrap gap-2">
              {ADDON_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setAddonFilter(filter)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    addonFilter === filter
                      ? 'border-amber-600 bg-amber-50 text-amber-700'
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
                placeholder="Search food items"
                className="w-full text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </label>
        </div>
      </section>

      <DataTable<FoodItemSchema>
        columns={columns}
        data={filteredItems}
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
        emptyMessage="No food items match your filters yet."
      />

      <FoodItemDialog
        open={dialogOpen}
        mode={dialogMode}
        initialItem={selectedItem ?? undefined}
        submitting={dialogSubmitting}
        onClose={closeDialog}
        onSubmit={handleDialogSubmit}
      />

      <ViewFoodItemDialog
        open={Boolean(viewingItem)}
        item={viewingItem}
        onClose={() => setViewingItem(null)}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete food item?"
        description={
          <span>
            Are you sure you want to delete
            {' '}
            <strong>{itemPendingDelete?.name}</strong>
            ? This action cannot be undone.
          </span>
        }
        variant="danger"
        loading={itemPendingDelete ? deletingId === itemPendingDelete.id : false}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => {
          if (itemPendingDelete && deletingId === itemPendingDelete.id) {
            return;
          }
          setConfirmOpen(false);
          setItemPendingDelete(null);
        }}
      />
    </div>
  );
};

export default FoodItemsListPage;
