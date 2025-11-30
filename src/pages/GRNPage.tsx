import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, FileText, Package, Plus, Trash2 } from 'lucide-react';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import CreateGRNDialog, { type CreateGrnPayload } from '../components/CreateGRNDialog';
import InvoicePreviewDialog from '../components/InvoicePreviewDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import FloatingMenu from '../components/FloatingMenu';
import IconButton from '../components/IconButton';
import { useGrnStore } from '../stores/grnStore';
import { useProductsStore } from '../stores/productsStore';
import { useUsersStore } from '../stores/usersStore';
import { useToastStore } from '../stores/toastStore';
import type { GrnSchema } from '../schemas/GRNSchema';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
});

const GrnPage: React.FC = () => {
  const { grns, loading: loadingGrn, creating, deletingId, loadGrns, createGrn, deleteGrn, totalItems, paginatedData } = useGrnStore();
  const { productOptions, loadProductOptions, optionsLoading, optionsLoaded } = useProductsStore();
  const users = useUsersStore((state) => state.users);
  const availableRoles = useUsersStore((state) => state.availableRoles);
  const loadingUsers = useUsersStore((state) => state.loading);
  const loadUsersForRole = useUsersStore((state) => state.loadUsersForRole);
  const roleMembers = useUsersStore((state) => state.roleMembers);
  const roleMembersLoading = useUsersStore((state) => state.roleMembersLoading);
  const addToast = useToastStore((state) => state.addToast);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [pendingDialogRequest, setPendingDialogRequest] = useState(false);
  const [invoicePreview, setInvoicePreview] = useState<{ record: GrnSchema | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GrnSchema | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('grNumber');
  const [searchValue, setSearchValue] = useState('');
  const searchFields = useMemo(() => getSearchFieldsForCollection('grns'), []);

  useEffect(() => {
    const search = searchValue ? { field: searchField, type: 'text' as const, value: searchValue } : null;
    void paginatedData({ pageNumber: currentPage, pageSize, search });
  }, [currentPage, pageSize, searchField, searchValue, paginatedData]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchField, searchValue]);

  const initialGrnLoadRef = useRef(false);
  useEffect(() => {
    if (initialGrnLoadRef.current) {
      return;
    }
    initialGrnLoadRef.current = true;
    void loadGrns();
  }, [loadGrns]);

  const chefRoleKey = 'chef';
  const chefMembers = useMemo(() => roleMembers[chefRoleKey] ?? [], [roleMembers, chefRoleKey]);
  const chefsLoading = roleMembersLoading[chefRoleKey] ?? false;

  useEffect(() => {
    if (chefMembers.length > 0 || chefsLoading) {
      return;
    }
    void loadUsersForRole('Chef');
  }, [chefMembers.length, chefsLoading, loadUsersForRole]);

  const chefRoleId = useMemo(() => {
    const chefRole = availableRoles.find((role) => role.name.toLowerCase() === 'chef');
    return chefRole?.id;
  }, [availableRoles]);

  const chefs = useMemo(() => {
    const source = chefMembers.length > 0 ? chefMembers : users;
    return source.filter((user) => {
      if (!user) return false;
      if (user.roleType && user.roleType.toLowerCase() === 'chef') return true;
      if (!chefRoleId) return false;
      return (user.roles ?? []).includes(chefRoleId);
    });
  }, [chefMembers, users, chefRoleId]);

  const data = useMemo(() => [...grns].sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime()), [grns]);

  const totalPurchaseValue = useMemo(() => grns.reduce((sum, record) => sum + record.totalPrice, 0), [grns]);
  const columns = useMemo<DataTableColumnDef<GrnSchema>[]>(() => [
    {
      accessorKey: 'id',
      header: 'GRN ID',
      cell: ({ row }) => {
        const record = row.original;
        const docId = record.id ?? '—';
        return <span className="font-mono text-xs font-medium text-slate-700">{docId}</span>;
      },
      meta: { cellClassName: 'font-mono text-xs text-slate-600 whitespace-nowrap' },
    },
    {
      accessorKey: 'purchaseDate',
      header: 'Purchase Date',
      cell: ({ row }) => (
        <span className="text-sm font-medium text-slate-700">{dateFormatter.format(row.original.purchaseDate)}</span>
      ),
      meta: { cellClassName: 'whitespace-nowrap' },
    },
    {
      accessorKey: 'productName',
      header: 'Product',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-semibold text-slate-900">{row.original.productName}</p>
        </div>
      ),
    },
    {
      id: 'quantity',
      header: 'Quantity',
      cell: ({ row }) => {
        const record = row.original;
        return (
          <span className="text-sm font-semibold text-slate-700">
            {record.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
            {record.productUnit?.toUpperCase() ?? ''}
          </span>
        );
      },
      meta: { cellClassName: 'text-sm text-slate-600 whitespace-nowrap' },
    },
    {
      accessorKey: 'receivedByName',
      header: 'Received By',
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-slate-900">{row.original.receivedByName}</p>
          <p className="text-xs text-slate-500">{row.original.receivedById}</p>
        </div>
      ),
    },
    {
      accessorKey: 'totalPrice',
      header: 'Total Price',
      cell: ({ row }) => (
        <span className="text-sm font-semibold text-slate-800">{currencyFormatter.format(row.original.totalPrice)}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const record = row.original;
        const items = [];
        items.push({
          id: 'view-invoice',
          label: (
            <span className="flex items-center gap-2">
              <Eye size={14} /> View invoice
            </span>
          ),
          disabled: !record.invoiceImageBase64,
          onSelect: () => {
            setInvoicePreview({ record });
          },
        });

        if (record.notes) {
          items.push({
            id: 'view-notes',
            label: (
              <span className="flex items-center gap-2">
                <FileText size={14} /> View notes
              </span>
            ),
            onSelect: () => {
              setInvoicePreview({ record });
            },
          });
        }

        items.push({
          id: 'delete',
          label: (
            <span className="flex items-center gap-2 text-red-600">
              <Trash2 size={14} /> Delete
            </span>
          ),
          onSelect: () => {
            setDeleteTarget(record);
          },
        });

        return (
          <div className="flex items-center gap-2">
            <IconButton
              label="View details"
              icon={<Eye size={16} />}
              onClick={() => setInvoicePreview({ record })}
            />
            <FloatingMenu
              trigger={({ toggle, ref }) => (
                <button
                  ref={ref as React.Ref<HTMLButtonElement>}
                  type="button"
                  onClick={toggle}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-100"
                >
                  Actions
                </button>
              )}
              items={items}
            />
          </div>
        );
      },
    },
  ], []);

  const handleCreateGrn = async (payload: CreateGrnPayload) => {
    const id = await createGrn(payload);
    return Boolean(id);
  };

  const handleOpenCreateDialog = useCallback(() => {
    if (!optionsLoaded) {
      setPendingDialogRequest(true);
      void loadProductOptions();
      return;
    }

    if (optionsLoading || loadingUsers) {
      return;
    }

    if (productOptions.length === 0) {
      addToast('Add at least one product before recording a GRN.', 'info');
      return;
    }

    setCreateDialogOpen(true);
  }, [addToast, loadProductOptions, loadingUsers, optionsLoaded, optionsLoading, productOptions.length]);

  useEffect(() => {
    if (!pendingDialogRequest) {
      return;
    }
    if (optionsLoading || !optionsLoaded) {
      return;
    }

    setPendingDialogRequest(false);

    if (productOptions.length === 0) {
      addToast('Add at least one product before recording a GRN.', 'info');
      return;
    }

    if (!loadingUsers) {
      setCreateDialogOpen(true);
    }
  }, [addToast, loadingUsers, optionsLoaded, optionsLoading, pendingDialogRequest, productOptions.length]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-purple-600">Admin • Inventory</p>
          <h1 className="text-3xl font-bold text-slate-900">Goods Received Notes</h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Log every inbound stock with the product, recipient, and invoice evidence to maintain audit-ready records.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreateDialog}
          className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          disabled={optionsLoading || loadingUsers}
        >
          <Plus size={16} />
          Create GRN
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-1">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total purchase value</span>
            <Package size={20} className="text-purple-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{currencyFormatter.format(totalPurchaseValue)}</p>
        </div>
      </section>

      <DataTable<GrnSchema>
        columns={columns}
        data={data}
        loading={loadingGrn || optionsLoading || loadingUsers}
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
        emptyMessage="No GRNs recorded yet. Log your first goods receipt to keep stock reconciled."
      />

      <CreateGRNDialog
        open={createDialogOpen}
        creating={creating}
        products={productOptions}
        chefs={chefs}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateGrn}
      />

      <InvoicePreviewDialog
        open={Boolean(invoicePreview)}
        onClose={() => setInvoicePreview(null)}
        title={invoicePreview?.record?.id ?? 'Goods Received Note'}
        description={invoicePreview?.record ? `Received by ${invoicePreview.record.receivedByName} on ${dateFormatter.format(invoicePreview.record.purchaseDate)}` : undefined}
        imageSrc={invoicePreview?.record?.invoiceImageBase64 ?? undefined}
        meta={invoicePreview?.record ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p><strong>Product:</strong> {invoicePreview.record.productName}</p>
            <p><strong>Quantity:</strong> {invoicePreview.record.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })} {invoicePreview.record.productUnit}</p>
            <p><strong>Total price:</strong> {currencyFormatter.format(invoicePreview.record.totalPrice)}</p>
            {invoicePreview.record.notes && (
              <p className="mt-2 whitespace-pre-wrap text-slate-600"><strong>Notes:</strong> {invoicePreview.record.notes}</p>
            )}
          </div>
        ) : undefined}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete GRN"
        description={
          <span>
            Are you sure you want to delete{' '}
            <strong>{deleteTarget?.id ?? 'this GRN'}</strong>? Stock levels will be adjusted accordingly.
          </span>
        }
        confirmLabel="Delete"
        variant="danger"
        loading={Boolean(deletingId)}
        onCancel={() => {
          if (!deletingId) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={async () => {
          if (!deleteTarget?.id) return;
          const success = await deleteGrn(deleteTarget.id);
          if (success) {
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
};

export default GrnPage;
