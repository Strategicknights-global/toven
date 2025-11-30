import React from 'react';
import Dialog from './Dialog';
import type { CategorySchema } from '../schemas/CategorySchema';

interface ViewCategoryDialogProps {
  open: boolean;
  category: CategorySchema | null;
  onClose: () => void;
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const ViewCategoryDialog: React.FC<ViewCategoryDialogProps> = ({ open, category, onClose }) => {
  if (!category) {
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
      title="Category details"
      description="Review the information captured for this menu category."
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
        {category.imageBase64 && (
          <div className="flex items-center justify-center">
            <div className="h-36 w-36 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
              <img src={category.imageBase64} alt={category.name} className="h-full w-full object-cover" />
            </div>
          </div>
        )}

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category ID</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{safeText(category.id)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{category.status}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{category.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Base price</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{currencyFormatter.format(category.price ?? 0)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{safeText(category.description)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Accent from</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{safeText(category.accentFrom)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Accent to</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{safeText(category.accentTo)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created</dt>
            <dd className="mt-1 text-sm text-slate-600">{safeText(category.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Updated</dt>
            <dd className="mt-1 text-sm text-slate-600">{safeText(category.updatedAt)}</dd>
          </div>
        </dl>
      </div>
    </Dialog>
  );
};

export default ViewCategoryDialog;
