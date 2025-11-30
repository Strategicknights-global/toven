import React from 'react';
import Dialog from './Dialog';
import type { ProductSchema } from '../schemas/ProductSchema';

interface ViewProductDialogProps {
  open: boolean;
  product: ProductSchema | null;
  onClose: () => void;
}

const ViewProductDialog: React.FC<ViewProductDialogProps> = ({ open, product, onClose }) => {
  if (!product) {
    return null;
  }

  const safeValue = (value: unknown): string => {
    if (value === undefined || value === null) {
      return '—';
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    if (value instanceof Date) {
      return value.toLocaleString();
    }
    if (typeof value === 'object' && 'toDate' in (value as Record<string, unknown>) && typeof (value as any).toDate === 'function') {
      try {
        return (value as any).toDate().toLocaleString();
      } catch (error) {
        console.warn('Failed to format timestamp', error);
      }
    }
    return String(value);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Product details"
      description="Review the current information recorded for this product."
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
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Product ID</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">{product.id ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">{product.name}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current stock</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">{safeValue(product.currentStock)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unit</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">{product.unit.toUpperCase()}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created</dt>
          <dd className="mt-1 text-sm text-slate-600">{safeValue(product.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Updated</dt>
          <dd className="mt-1 text-sm text-slate-600">{safeValue(product.updatedAt)}</dd>
        </div>
      </dl>
    </Dialog>
  );
};

export default ViewProductDialog;
