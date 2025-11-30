import React, { useState } from 'react';
import { Coins, Plus, Minus, TrendingDown } from 'lucide-react';
import Dialog from './Dialog';
import type { WalletSchema } from '../schemas/WalletSchema';

export type WalletOperationType = 'add' | 'reduce' | 'set';

interface ManageWalletDialogProps {
  open: boolean;
  wallet: WalletSchema | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (walletId: string, operation: WalletOperationType, amount: number) => Promise<void>;
}

const ManageWalletDialog: React.FC<ManageWalletDialogProps> = ({
  open,
  wallet,
  submitting = false,
  onClose,
  onSubmit,
}) => {
  const [operation, setOperation] = useState<WalletOperationType>('add');
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (submitting) return;
    setOperation('add');
    setAmount('');
    setError(null);
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!wallet) {
      setError('No wallet selected.');
      return;
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Amount must be a positive number.');
      return;
    }

    if (operation === 'reduce' && numericAmount > (wallet.coins || 0)) {
      setError(`Cannot reduce more than current balance (${wallet.coins} coins).`);
      return;
    }

    setError(null);

    if (!wallet.id) {
      setError('Invalid wallet ID.');
      return;
    }

    try {
      await onSubmit(wallet.id, operation, numericAmount);
      handleClose();
    } catch (err) {
      setError((err as Error).message || 'Failed to update wallet.');
    }
  };

  const currentCoins = wallet?.coins || 0;
  const numericAmount = Number(amount) || 0;
  
  let newBalance = currentCoins;
  if (operation === 'add') {
    newBalance = currentCoins + numericAmount;
  } else if (operation === 'reduce') {
    newBalance = currentCoins - numericAmount;
  } else if (operation === 'set') {
    newBalance = numericAmount;
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Manage Wallet Coins"
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="manage-wallet-form"
            disabled={submitting || !amount}
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-60"
          >
            {submitting ? 'Updating...' : 'Update Wallet'}
          </button>
        </div>
      }
    >
      <form id="manage-wallet-form" onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Wallet Info */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Coins className="h-4 w-4 text-purple-600" />
            <span>Wallet Information</span>
          </div>
          <div className="space-y-1">
            <div className="text-sm">
              <span className="text-slate-600">Customer: </span>
              <span className="font-medium text-slate-800">{wallet?.customerName || 'Unknown'}</span>
            </div>
            {wallet?.customerEmail && (
              <div className="text-sm text-slate-600">{wallet.customerEmail}</div>
            )}
            <div className="text-sm">
              <span className="text-slate-600">Current Balance: </span>
              <span className="font-semibold text-purple-600">{currentCoins.toLocaleString()} coins</span>
            </div>
          </div>
        </div>

        {/* Operation Type */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Operation</label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setOperation('add')}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                operation === 'add'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-green-300 hover:bg-green-50'
              }`}
            >
              <Plus className="h-6 w-6" />
              <span className="text-sm font-semibold">Add</span>
            </button>
            <button
              type="button"
              onClick={() => setOperation('reduce')}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                operation === 'reduce'
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:bg-orange-50'
              }`}
            >
              <Minus className="h-6 w-6" />
              <span className="text-sm font-semibold">Reduce</span>
            </button>
            <button
              type="button"
              onClick={() => setOperation('set')}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                operation === 'set'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:bg-purple-50'
              }`}
            >
              <TrendingDown className="h-6 w-6" />
              <span className="text-sm font-semibold">Set</span>
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label htmlFor="amount" className="mb-2 block text-sm font-semibold text-slate-700">
            Amount
          </label>
          <input
            id="amount"
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter number of coins"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            {operation === 'add' && 'Coins will be added to the current balance'}
            {operation === 'reduce' && 'Coins will be subtracted from the current balance'}
            {operation === 'set' && 'Balance will be set to this exact amount'}
          </p>
        </div>

        {/* Preview */}
        {amount && Number(amount) > 0 && (
          <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-4">
            <div className="mb-2 text-sm font-semibold text-purple-900">Preview</div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Current Balance:</span>
              <span className="font-semibold text-slate-800">{currentCoins.toLocaleString()} coins</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-slate-600">New Balance:</span>
              <span className={`text-lg font-bold ${newBalance < 0 ? 'text-red-600' : 'text-purple-600'}`}>
                {newBalance.toLocaleString()} coins
              </span>
            </div>
            {operation === 'add' && (
              <div className="mt-1 text-xs text-green-700">+{numericAmount.toLocaleString()} coins</div>
            )}
            {operation === 'reduce' && (
              <div className="mt-1 text-xs text-orange-700">-{numericAmount.toLocaleString()} coins</div>
            )}
            {newBalance < 0 && (
              <div className="mt-2 text-xs text-red-600">⚠️ Balance cannot be negative</div>
            )}
          </div>
        )}
      </form>
    </Dialog>
  );
};

export default ManageWalletDialog;
