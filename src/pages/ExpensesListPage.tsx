import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Eye, Plus, Receipt, Trash2 } from 'lucide-react';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import CreateGeneralExpenseDialog, { type CreateGeneralExpensePayload } from '../components/CreateGeneralExpenseDialog';
import InvoicePreviewDialog from '../components/InvoicePreviewDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import FloatingMenu from '../components/FloatingMenu';
import IconButton from '../components/IconButton';
import { useExpensesStore } from '../stores/expensesStore';
import { useGrnStore } from '../stores/grnStore';
import type { ExpenseSchema } from '../schemas/ExpenseSchema';
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

type ExpenseRow = {
  rowId: string;
  category: 'Purchase' | 'General Expense';
  amount: number;
  description: string;
  expenseDate: Date;
  invoiceImageBase64?: string | null;
  source: 'grn' | 'manual';
  originalExpense?: ExpenseSchema;
  grn?: GrnSchema;
};

const buildGeneralRows = (expenses: ExpenseSchema[]): ExpenseRow[] =>
  expenses.map((expense) => ({
    rowId: `expense-${expense.id}`,
    category: 'General Expense',
    amount: expense.amount,
    description: expense.description,
    expenseDate: expense.expenseDate,
    invoiceImageBase64: expense.invoiceImageBase64,
    source: 'manual',
    originalExpense: expense,
  }));

const buildPurchaseRows = (grns: GrnSchema[]): ExpenseRow[] =>
  grns.map((grn) => ({
    rowId: `grn-${grn.id}`,
    category: 'Purchase',
    amount: grn.totalPrice,
    description: `GRN • ${grn.productName}`,
    expenseDate: grn.purchaseDate,
    invoiceImageBase64: grn.invoiceImageBase64,
    source: 'grn',
    grn,
  }));

const ExpensesListPage: React.FC = () => {
  const {
    generalExpenses,
    loading: loadingExpenses,
    creating: creatingExpense,
    createGeneralExpense,
    deleteExpense,
    deletingId,
    loadGeneralExpenses,
    totalItems,
    paginatedData,
  } = useExpensesStore();
  const { grns, loading: loadingGrn, loadGrns } = useGrnStore();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [invoicePreview, setInvoicePreview] = useState<{
    title: string;
    description?: string;
    image?: string | null;
    meta?: React.ReactNode;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseSchema | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('category');
  const [searchValue, setSearchValue] = useState('');
  const searchFields = useMemo(() => getSearchFieldsForCollection('expenses'), []);

  useEffect(() => {
    const search = searchValue ? { field: searchField, type: 'text' as const, value: searchValue } : null;
    void paginatedData({ pageNumber: currentPage, pageSize, search });
  }, [currentPage, pageSize, searchField, searchValue, paginatedData]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchField, searchValue]);

  const initialExpensesLoadRef = useRef(false);
  useEffect(() => {
    if (initialExpensesLoadRef.current) {
      return;
    }
    initialExpensesLoadRef.current = true;
    void loadGeneralExpenses();
  }, [loadGeneralExpenses]);

  useEffect(() => {
    void loadGrns();
  }, [loadGrns]);

  const rows = useMemo<ExpenseRow[]>(() => {
    const manualRows = buildGeneralRows(generalExpenses);
    const purchaseRows = buildPurchaseRows(grns);
    return [...manualRows, ...purchaseRows].sort((a, b) => b.expenseDate.getTime() - a.expenseDate.getTime());
  }, [generalExpenses, grns]);

  const totals = useMemo(() => {
    const generalTotal = generalExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const purchaseTotal = grns.reduce((sum, grn) => sum + grn.totalPrice, 0);
    return {
      generalTotal,
      purchaseTotal,
      overall: generalTotal + purchaseTotal,
    };
  }, [generalExpenses, grns]);

  const handleCreateExpense = async (payload: CreateGeneralExpensePayload) => {
    const id = await createGeneralExpense(payload);
    return Boolean(id);
  };

  const columns = useMemo<DataTableColumnDef<ExpenseRow>[]>(() => [
    {
      accessorKey: 'expenseDate',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-sm font-medium text-slate-700">{dateFormatter.format(row.original.expenseDate)}</span>
      ),
      meta: { cellClassName: 'whitespace-nowrap' },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">{record.description}</p>
            {record.source === 'grn' && record.grn ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-slate-400">
                  Received by <strong className="font-semibold text-slate-600">{record.grn.receivedByName}</strong>
                </span>
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{row.original.category}</span>
      ),
      meta: { cellClassName: 'text-xs uppercase whitespace-nowrap' },
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="text-sm font-semibold text-slate-800">{currencyFormatter.format(row.original.amount)}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const record = row.original;
        const meta = (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 space-y-1">
            <p>
              <strong>Category:</strong> {record.category}
            </p>
            <p>
              <strong>Amount:</strong> {currencyFormatter.format(record.amount)}
            </p>
            <p>
              <strong>Date:</strong> {dateFormatter.format(record.expenseDate)}
            </p>
            {record.source === 'grn' && record.grn ? (
              <>
                <p>
                  <strong>Product:</strong> {record.grn.productName}
                </p>
                <p>
                  <strong>Received by:</strong> {record.grn.receivedByName}
                </p>
              </>
            ) : null}
          </div>
        );

        const openPreview = () => {
          setInvoicePreview({
            title: record.category === 'Purchase' ? 'Purchase invoice' : 'Expense receipt',
            description: record.description,
            image: record.invoiceImageBase64 ?? null,
            meta,
          });
        };

        const items = [
          {
            id: 'view-invoice',
            label: (
              <span className="flex items-center gap-2">
                <Eye size={14} />
                View invoice
              </span>
            ),
            onSelect: openPreview,
          },
        ];

        if (record.source === 'manual' && record.originalExpense?.id) {
          items.push({
            id: 'delete',
            label: (
              <span className="flex items-center gap-2 text-red-600">
                <Trash2 size={14} />
                Delete entry
              </span>
            ),
            onSelect: () => {
              setDeleteTarget(record.originalExpense ?? null);
            },
          });
        }

        return (
          <div className="flex items-center gap-2">
            <IconButton label="View details" icon={<Eye size={16} />} onClick={openPreview} />
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

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-purple-600">Admin • Expenses</p>
          <h1 className="text-3xl font-bold text-slate-900">Expense Ledger</h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Track operational spending alongside goods received to maintain a single source of truth for costs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <Plus size={16} />
          Create General Expense
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total expenses</span>
            <Receipt size={20} className="text-purple-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{currencyFormatter.format(totals.overall)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Purchases (GRN)</span>
            <ArrowUpCircle size={20} className="text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{currencyFormatter.format(totals.purchaseTotal)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">General expenses</span>
            <ArrowDownCircle size={20} className="text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{currencyFormatter.format(totals.generalTotal)}</p>
        </div>
      </section>

      <DataTable<ExpenseRow>
        columns={columns}
        data={rows}
        loading={loadingExpenses || loadingGrn}
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
        emptyMessage="No expense activity recorded yet. Capture a general expense or create a GRN to get started."
      />

      <CreateGeneralExpenseDialog
        open={createDialogOpen}
        creating={creatingExpense}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateExpense}
      />

      <InvoicePreviewDialog
        open={Boolean(invoicePreview)}
        onClose={() => setInvoicePreview(null)}
        title={invoicePreview?.title}
        description={invoicePreview?.description}
        imageSrc={invoicePreview?.image}
        meta={invoicePreview?.meta}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete general expense"
        description={
          <span>
            Are you sure you want to remove{' '}
            <strong>{deleteTarget?.description}</strong>? This action cannot be undone.
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
          const success = await deleteExpense(deleteTarget.id);
          if (success) {
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
};

export default ExpensesListPage;
