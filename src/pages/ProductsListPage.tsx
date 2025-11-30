import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import FloatingMenu from '../components/FloatingMenu';
import Tooltip from '../components/Tooltip';
import ConfirmDialog from '../components/ConfirmDialog';
import ViewProductDialog from '../components/ViewProductDialog';
import EditProductDialog from '../components/EditProductDialog';
import AddProductDialog from '../components/AddProductDialog';
import IconButton from '../components/IconButton';
import { Eye, MoreVertical, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { useProductsStore } from '../stores/productsStore';
import { useToastStore } from '../stores/toastStore';
import type { ProductSchema, ProductUnit } from '../schemas/ProductSchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';

const UNIT_LABELS: Record<ProductUnit, string> = {
  kg: 'Kilograms',
  grams: 'Grams',
  pcs: 'Pieces',
  liters: 'Liters',
  ml: 'Milliliters',
};

const ProductsListPage: React.FC = () => {
  const products = useProductsStore((state) => state.products);
  const loading = useProductsStore((state) => state.loading);
  const totalItems = useProductsStore((state) => state.totalItems);
  const paginatedData = useProductsStore((state) => state.paginatedData);
  const refreshProducts = useProductsStore((state) => state.refreshProducts);
  const deleteProductById = useProductsStore((state) => state.deleteProduct);
  const deletingProduct = useProductsStore((state) => state.deleting);
  const addToast = useToastStore((state) => state.addToast);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('name');
  const [searchValue, setSearchValue] = useState('');
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<ProductSchema | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductSchema | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductSchema | null>(null);

  const searchFields = useMemo(() => getSearchFieldsForCollection('products'), []);

  // Load paginated data when filters change
  useEffect(() => {
    const search: SearchParams | null = searchValue
      ? {
          field: searchField,
          type: 'text',
          value: searchValue,
        }
      : null;
    void paginatedData({
      pageNumber: currentPage,
      pageSize: pageSize,
      search,
    });
  }, [currentPage, pageSize, searchField, searchValue, paginatedData]);

  const handleRefresh = useCallback(() => {
    void refreshProducts();
  }, [refreshProducts]);

  const handleOpenAddDialog = () => setAddDialogOpen(true);
  const handleCloseAddDialog = () => setAddDialogOpen(false);

  const handleViewProduct = useCallback((product: ProductSchema) => {
    setViewingProduct(product);
  }, []);

  const handleEditProduct = useCallback((product: ProductSchema) => {
    setEditingProduct(product);
  }, []);

  const handleDeleteRequest = useCallback((product: ProductSchema) => {
    setDeleteTarget(product);
  }, []);

  const handleCloseView = useCallback(() => {
    setViewingProduct(null);
  }, []);

  const handleCloseEdit = useCallback(() => {
    setEditingProduct(null);
  }, []);

  const handleCancelDelete = useCallback(() => {
    if (deletingProduct) {
      return;
    }
    setDeleteTarget(null);
  }, [deletingProduct]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget?.id) {
      addToast('Unable to identify the product to delete.', 'error');
      return;
    }

    try {
      await deleteProductById(deleteTarget.id);
      addToast('Product deleted successfully.', 'success');
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete product', error);
    }
  }, [addToast, deleteProductById, deleteTarget]);

  const columns = useMemo<DataTableColumnDef<ProductSchema>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Product ID',
        meta: {
          cellClassName: 'font-mono text-xs text-slate-600 whitespace-nowrap',
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
        accessorKey: 'currentStock',
        header: 'Current Stock',
        cell: ({ row }) => {
          const stockValue = Number.isFinite(row.original.currentStock)
            ? row.original.currentStock
            : 0;
          return (
            <span className="text-sm font-semibold text-slate-700">
              {stockValue.toLocaleString()}
            </span>
          );
        },
        meta: {
          cellClassName: 'text-sm text-slate-600',
        },
      },
      {
        accessorKey: 'unit',
        header: 'Unit',
        cell: ({ row }) => (
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {UNIT_LABELS[row.original.unit] ?? row.original.unit}
          </span>
        ),
        meta: {
          cellClassName: 'uppercase text-xs text-slate-500',
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const product = row.original;
          return (
            <div className="flex items-center gap-2">
              <IconButton
                label="View details"
                icon={<Eye size={16} />}
                onClick={() => handleViewProduct(product)}
              />
              <IconButton
                label="Edit product"
                icon={<Pencil size={16} />}
                variant="primary"
                onClick={() => handleEditProduct(product)}
              />
              <FloatingMenu
                trigger={({ toggle, ref }) => (
                  <Tooltip label="More actions">
                    <button
                      ref={ref as React.Ref<HTMLButtonElement>}
                      type="button"
                      onClick={toggle}
                      className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                      aria-label={`More actions for ${product.name}`}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </Tooltip>
                )}
                items={[
                  {
                    id: 'delete',
                    label: (
                      <div className="flex items-center gap-2 text-red-600">
                        <Trash2 size={14} />
                        <span>Delete product</span>
                      </div>
                    ),
                    onSelect: () => {
                      handleDeleteRequest(product);
                    },
                  },
                ]}
              />
            </div>
          );
        },
        meta: {
          cellClassName: 'text-sm',
        },
      },
    ],
    [handleDeleteRequest, handleEditProduct, handleViewProduct],
  );

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Products</h1>
        </div>
        <div className="flex items-center gap-3">
          <Tooltip label="Reload products">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60"
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-purple-500' : 'text-slate-500'} />
              Refresh
            </button>
          </Tooltip>
          <button
            type="button"
            onClick={handleOpenAddDialog}
            className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <span className="text-lg leading-none">+</span>
            Add Product
          </button>
        </div>
      </div>
      <DataTable<ProductSchema>
        columns={columns}
        data={products}
        loading={loading}
        emptyMessage="No products found. Add one to get started."
        pagination={{
          currentPage: currentPage,
          pageSize: pageSize,
          totalItems: totalItems || 0,
          onPageChange: setCurrentPage,
          onPageSizeChange: setPageSize,
        }}
        searchFields={searchFields.map((f) => ({ value: f.name, label: f.label }))}
        searchField={searchField}
        searchValue={searchValue}
        onSearchFieldChange={setSearchField}
        onSearchValueChange={setSearchValue}
      />
      <AddProductDialog open={isAddDialogOpen} onClose={handleCloseAddDialog} />
      <ViewProductDialog open={!!viewingProduct} product={viewingProduct} onClose={handleCloseView} />
      <EditProductDialog open={!!editingProduct} product={editingProduct} onClose={handleCloseEdit} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete product"
        description={
          <span>
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
          </span>
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deletingProduct}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default ProductsListPage;
