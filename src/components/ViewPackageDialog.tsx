import React from 'react';
import Dialog from './Dialog';
import type { PackageSchema } from '../schemas/PackageSchema';

interface ViewPackageDialogProps {
  open: boolean;
  pkg: PackageSchema | null;
  onClose: () => void;
  categoryName?: string;
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const formatDate = (iso: string): string => {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return iso || '—';
  }
  const [year, month, day] = iso.split('-').map((value) => Number.parseInt(value, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const ViewPackageDialog: React.FC<ViewPackageDialogProps> = ({ open, pkg, onClose, categoryName }) => {
  if (!pkg) {
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
      title="Package details"
      description="Review the configuration of this curated package."
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
      size="xl"
    >
      <div className="space-y-6">
        {pkg.imageBase64 && (
          <div className="flex items-center justify-center">
            <div className="h-36 w-36 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
              <img src={pkg.imageBase64} alt={pkg.name} className="h-full w-full object-cover" />
            </div>
          </div>
        )}

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Package ID</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{safeText(pkg.id)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{pkg.status}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{pkg.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Meal type</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{pkg.mealType}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</dt>
            <dd className="mt-1 text-sm text-slate-700">{categoryName ?? pkg.categoryId}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Price</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{currencyFormatter.format(pkg.price ?? 0)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created</dt>
            <dd className="mt-1 text-sm text-slate-600">{safeText(pkg.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Updated</dt>
            <dd className="mt-1 text-sm text-slate-600">{safeText(pkg.updatedAt)}</dd>
          </div>
        </dl>

        <section>
          <h3 className="text-sm font-semibold text-slate-900">Menu schedule</h3>
          {pkg.dateMenus.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No dated menu entries configured.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {pkg.dateMenus.map((entry, index) => (
                <li
                  key={`${entry.date}-${index}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                >
                  <span className="font-semibold text-slate-900">{formatDate(entry.date)}</span>
                  {entry.description ? <span className="ml-2 text-slate-600">{entry.description}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Dialog>
  );
};

export default ViewPackageDialog;
