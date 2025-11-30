import React from 'react';
import Dialog from './Dialog';
import type { FoodItemSchema } from '../schemas/FoodItemSchema';

interface ViewFoodItemDialogProps {
  open: boolean;
  item: FoodItemSchema | null;
  onClose: () => void;
}

const ViewFoodItemDialog: React.FC<ViewFoodItemDialogProps> = ({ open, item, onClose }) => {
  if (!item) {
    return null;
  }

  const safeText = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '—';
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    if (value instanceof Date) {
      return value.toLocaleString();
    }
    return String(value);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Food item details"
      description="Inspect the current data for this menu item."
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {item.imageBase64 && (
          <div className="flex items-center justify-center">
            <div className="h-36 w-36 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
              <img src={item.imageBase64} alt={item.name} className="h-full w-full object-cover" />
            </div>
          </div>
        )}

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Item ID</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{safeText(item.id)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{item.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</dt>
            <dd className="mt-1 text-sm text-slate-700">{item.category}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Meal type</dt>
            <dd className="mt-1 text-sm text-slate-700">{item.mealType}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Coins</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{safeText(item.coins)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Discount coins</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{safeText(item.discountCoins)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Is add-on</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{item.isAddon ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Addon accent (from)</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{safeText(item.addonAccentFrom)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Addon accent (to)</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{safeText(item.addonAccentTo)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Addon description</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{safeText(item.addonDescription)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created</dt>
            <dd className="mt-1 text-sm text-slate-600">{safeText(item.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Updated</dt>
            <dd className="mt-1 text-sm text-slate-600">{safeText(item.updatedAt)}</dd>
          </div>
        </dl>
      </div>
    </Dialog>
  );
};

export default ViewFoodItemDialog;
