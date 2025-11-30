import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Wallet, Coins, MoreVertical, RefreshCw } from 'lucide-react';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import FloatingMenu from '../components/FloatingMenu';
import Tooltip from '../components/Tooltip';
import ManageWalletDialog, { type WalletOperationType } from '../components/ManageWalletDialog';
import { useToastStore } from '../stores/toastStore';
import type { WalletSchema } from '../schemas/WalletSchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { useWalletsStore } from '../stores/walletsStore';
import { WalletModel } from '../firestore/WalletModel';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';

const AdminWalletPage: React.FC = () => {
  const { wallets, loading, totalItems, paginatedData } = useWalletsStore();
  const { addToast } = useToastStore();
  const [selectedWallet, setSelectedWallet] = useState<WalletSchema | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('id');
  const [searchValue, setSearchValue] = useState('');
  const searchFields = useMemo(() => getSearchFieldsForCollection('wallets'), []);

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
      pageSize,
      search,
    });
  }, [currentPage, pageSize, searchField, searchValue, paginatedData]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchField, searchValue]);

  const totalCoins = useMemo(
    () => wallets.reduce((sum, wallet) => sum + (Number.isFinite(wallet.coins) ? wallet.coins : 0), 0),
    [wallets],
  );

  const formatCreatedOn = useCallback((value?: Date) => {
    if (!value) {
      return '—';
    }
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(value);
  }, []);

  const handleManageWallet = useCallback((wallet: WalletSchema) => {
    setSelectedWallet(wallet);
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedWallet(null);
  }, []);

  const handleSubmitWallet = useCallback(
    async (walletId: string, operation: WalletOperationType, amount: number) => {
      setSubmitting(true);
      try {
        await WalletModel.updateCoins(walletId, operation, amount);
        addToast('Wallet updated successfully', 'success');
        await paginatedData({ pageNumber: currentPage, pageSize, search: searchValue ? { field: searchField, type: 'text' as const, value: searchValue } : null });
      } catch (error) {
        addToast((error as Error).message || 'Failed to update wallet', 'error');
        throw error;
      } finally {
        setSubmitting(false);
      }
    },
    [paginatedData, currentPage, pageSize, searchField, searchValue, addToast],
  );

  const columns = useMemo<DataTableColumnDef<WalletSchema>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Wallet ID',
        meta: {
          cellClassName: 'font-mono text-xs text-slate-600 whitespace-nowrap',
        },
      },
      {
        id: 'customer',
        header: 'Customer',
        cell: ({ row }) => {
          const wallet = row.original;
          const name = wallet.customerName || 'Unknown customer';
          const email = wallet.customerEmail;
          return (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-800">{name}</span>
              {email && <span className="text-xs text-slate-500">{email}</span>}
            </div>
          );
        },
        meta: {
          cellClassName: 'text-sm text-slate-700',
        },
      },
      {
        accessorKey: 'coins',
        header: 'Coins',
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-purple-600">
            {Number(row.original.coins ?? 0).toLocaleString()}
          </span>
        ),
        meta: {
          cellClassName: 'text-sm font-semibold text-purple-600',
        },
      },
      {
        id: 'createdOn',
        header: 'Created On',
        cell: ({ row }) => (
          <span className="text-sm text-slate-600">{formatCreatedOn(row.original.createdAt)}</span>
        ),
        meta: {
          cellClassName: 'text-sm text-slate-500 whitespace-nowrap',
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const wallet = row.original;
          return (
            <FloatingMenu
              trigger={({ toggle, ref }) => (
                <Tooltip label="Actions">
                  <button
                    ref={ref as React.Ref<HTMLButtonElement>}
                    type="button"
                    onClick={toggle}
                    className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    aria-label={`Manage wallet ${wallet.id}`}
                  >
                    <MoreVertical size={16} />
                  </button>
                </Tooltip>
              )}
              items={[
                {
                  id: 'manage',
                  label: (
                    <div className="flex items-center gap-2">
                      <Coins size={14} />
                      <span>Manage Coins</span>
                    </div>
                  ),
                  onSelect: () => handleManageWallet(wallet),
                },
              ]}
            />
          );
        },
        meta: {
          cellClassName: 'text-sm',
        },
      },
    ],
    [formatCreatedOn, handleManageWallet],
  );

  const handleRefresh = useCallback(() => {
    void paginatedData({ pageNumber: currentPage, pageSize, search: searchValue ? { field: searchField, type: 'text' as const, value: searchValue } : null });
  }, [paginatedData, currentPage, pageSize, searchField, searchValue]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Wallets</h1>
          <p className="text-sm text-slate-500">Monitor customer wallets and coin circulation.</p>
        </div>
        <Tooltip label="Reload wallets">
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
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-600">
            <Wallet size={22} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Wallets</p>
            <p className="text-2xl font-semibold text-slate-900">{wallets.length.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Coins size={22} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Coins in Circulation</p>
            <p className="text-2xl font-semibold text-slate-900">{totalCoins.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <DataTable<WalletSchema>
        columns={columns}
        data={wallets}
        loading={loading}
        emptyMessage="No wallets found."
        pagination={{
          currentPage,
          pageSize,
          totalItems: totalItems ?? 0,
          onPageChange: setCurrentPage,
          onPageSizeChange: setPageSize,
        }}
        searchFields={searchFields.map(f => ({ value: f.name, label: f.label }))}
        searchField={searchField}
        searchValue={searchValue}
        onSearchFieldChange={setSearchField}
        onSearchValueChange={setSearchValue}
      />

      <ManageWalletDialog
        open={dialogOpen}
        wallet={selectedWallet}
        submitting={submitting}
        onClose={handleCloseDialog}
        onSubmit={handleSubmitWallet}
      />
    </div>
  );
};

export default AdminWalletPage;
