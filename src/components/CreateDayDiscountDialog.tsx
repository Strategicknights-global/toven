import React, { useEffect, useMemo, useRef, useState } from 'react';
import Dialog from './Dialog';
import type {
  DayDiscountScope,
  DayDiscountType,
  DayDiscountSchema,
  DayDiscountMatchType,
} from '../schemas/DayDiscountSchema';
import type { PackageSchema } from '../schemas/PackageSchema';

export interface CreateDayDiscountPayload {
  label: string;
  description?: string | null;
  dayCount: number;
  discountType: DayDiscountType;
  discountValue: number;
  scope: DayDiscountScope;
  categoryIds?: string[];
  packageIds?: string[];
  matchType?: DayDiscountMatchType;
}

interface CreateDayDiscountDialogProps {
  open: boolean;
  creating: boolean;
  packages: PackageSchema[];
  packagesLoading?: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateDayDiscountPayload) => Promise<void> | void;
  mode?: 'create' | 'edit';
  initialValues?: DayDiscountSchema;
}

const CreateDayDiscountDialog: React.FC<CreateDayDiscountDialogProps> = ({
  open,
  creating,
  packages,
  packagesLoading = false,
  onClose,
  onSubmit,
  mode = 'create',
  initialValues,
}) => {
  const [label, setLabel] = useState('');
  const [dayCount, setDayCount] = useState('');
  const [discountType, setDiscountType] = useState<DayDiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [scope] = useState<DayDiscountScope>('packages');
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [matchType, setMatchType] = useState<DayDiscountMatchType>('all');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const labelInputRef = useRef<HTMLInputElement | null>(null);

  const sortedPackages = useMemo(() => {
    return [...packages].sort((a, b) => a.name.localeCompare(b.name));
  }, [packages]);

  useEffect(() => {
    if (!open) {
      setLabel('');
      setDayCount('');
      setDiscountType('percentage');
      setDiscountValue('');
      setSelectedPackageIds([]);
      setMatchType('all');
      setDescription('');
      setError(null);
      return;
    }

    if (initialValues) {
      setLabel(initialValues.label ?? '');
      setDescription(initialValues.description ?? '');
      setDayCount(initialValues.dayCount ? String(initialValues.dayCount) : '');
      setDiscountType(initialValues.discountType);
      setDiscountValue(String(initialValues.discountValue ?? ''));
      setSelectedPackageIds(initialValues.packageIds ?? []);
      setMatchType(initialValues.matchType ?? 'all');
    } else {
      setLabel('');
      setDescription('');
      setDayCount('');
      setDiscountType('percentage');
      setDiscountValue('');
      setSelectedPackageIds([]);
      setMatchType('all');
    }
    setError(null);
  }, [open, initialValues]);

  const effectiveMode = mode ?? (initialValues ? 'edit' : 'create');
  const dialogTitle = effectiveMode === 'edit' ? 'Edit Discount' : 'Create Discount';
  const submitLabel = effectiveMode === 'edit' ? 'Save Changes' : 'Create Discount';

  const togglePackage = (packageId: string) => {
    setSelectedPackageIds((prev) => {
      if (prev.includes(packageId)) {
        return prev.filter((id) => id !== packageId);
      }
      return [...prev, packageId];
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setError('Provide a discount name.');
      labelInputRef.current?.focus();
      return;
    }

    const numericDayCount = Number(dayCount);
    if (!Number.isFinite(numericDayCount) || numericDayCount <= 0) {
      setError('Specify how many days this discount applies to.');
      return;
    }

    const numericValue = Number(discountValue);
    if (!Number.isFinite(numericValue)) {
      setError('Enter a numeric discount value.');
      return;
    }

    if (discountType === 'percentage') {
      if (numericValue < 0 || numericValue > 100) {
        setError('Enter a percentage between 0 and 100.');
        return;
      }
    } else if (numericValue <= 0) {
      setError('Price-off discounts must be greater than zero.');
      return;
    }

    if (selectedPackageIds.length === 0) {
      setError('Select at least one package.');
      return;
    }

    try {
      await onSubmit({
        label: trimmedLabel,
        description: description.trim() || null,
        dayCount: Math.max(1, Math.round(numericDayCount)),
        discountType,
        discountValue: Math.round(numericValue * 100) / 100,
        scope,
        packageIds: [...selectedPackageIds],
        matchType,
      });
    } catch (err) {
      setError((err as Error).message || 'Failed to create discount.');
    }
  };

  const footer = (
    <div className="flex justify-end gap-3">
      <button
        type="button"
        onClick={onClose}
        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-60"
        disabled={creating}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="create-day-discount-form"
        className="inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
        disabled={creating}
      >
        {creating ? 'Saving…' : submitLabel}
      </button>
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!creating) {
          onClose();
        }
      }}
      title={dialogTitle}
      description="Configure how many days the discount covers, the discount type, and where it applies."
      size="xl"
      initialFocus={labelInputRef as React.RefObject<HTMLElement>}
      footer={footer}
    >
      <form id="create-day-discount-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="discount-name" className="text-sm font-medium text-slate-700">
              Discount name
            </label>
            <input
              id="discount-name"
              ref={labelInputRef}
              type="text"
              value={label}
              onChange={(event) => {
                setLabel(event.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Midweek Saver"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400/60"
              disabled={creating}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="discount-day-count" className="text-sm font-medium text-slate-700">
              Day count
            </label>
            <input
              id="discount-day-count"
              type="number"
              min={1}
              step={1}
              value={dayCount}
              onChange={(event) => {
                setDayCount(event.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. 7"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400/60"
              disabled={creating}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="discount-description" className="text-sm font-medium text-slate-700">
            Description (optional)
          </label>
          <textarea
            id="discount-description"
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Special pricing for Tuesday-Thursday orders"
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400/60"
            disabled={creating}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Discount type</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="discount-type"
                  value="percentage"
                  checked={discountType === 'percentage'}
                  onChange={() => {
                    setDiscountType('percentage');
                    setDiscountValue('');
                    if (error) setError(null);
                  }}
                  className="h-4 w-4 border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                Percentage off
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="discount-type"
                  value="amount"
                  checked={discountType === 'amount'}
                  onChange={() => {
                    setDiscountType('amount');
                    setDiscountValue('');
                    if (error) setError(null);
                  }}
                  className="h-4 w-4 border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                Price off
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="discount-value" className="text-sm font-medium text-slate-700">
              {discountType === 'percentage' ? 'Percent value' : 'Amount value'}
            </label>
            <div className="relative">
              <input
                id="discount-value"
                type="number"
                min={discountType === 'percentage' ? 0 : 0.01}
                max={discountType === 'percentage' ? 100 : undefined}
                step="0.5"
                value={discountValue}
                onChange={(event) => {
                  setDiscountValue(event.target.value);
                  if (error) setError(null);
                }}
                placeholder={discountType === 'percentage' ? '10' : '100'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400/60"
                disabled={creating}
                required
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">
                {discountType === 'percentage' ? '%' : '₹'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <span className="text-sm font-medium text-slate-700">Select Packages</span>
          
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              {packagesLoading ? (
                <p className="text-sm text-slate-500">Loading packages…</p>
              ) : sortedPackages.length === 0 ? (
                <p className="text-sm text-slate-500">No packages available. Create packages first.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {sortedPackages.map((pkg) => (
                    <label key={pkg.id} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-purple-50">
                      <input
                        type="checkbox"
                        checked={selectedPackageIds.includes(pkg.id)}
                        onChange={() => togglePackage(pkg.id)}
                        className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span>{pkg.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {sortedPackages.length > 0 && (
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Match Type
                  </span>
                  <div className="flex flex-col gap-2 text-sm text-slate-700 sm:flex-row sm:items-center">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="discount-package-match-type"
                        value="all"
                        checked={matchType === 'all'}
                        onChange={() => {
                          setMatchType('all');
                          if (error) setError(null);
                        }}
                        className="h-4 w-4 border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      All of the selected packages
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="discount-package-match-type"
                        value="any"
                        checked={matchType === 'any'}
                        onChange={() => {
                          setMatchType('any');
                          if (error) setError(null);
                        }}
                        className="h-4 w-4 border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      Any of the selected packages
                    </label>
                  </div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                    Customers must pick {matchType === 'all' ? 'every selected package' : 'at least one selected package'} for the discount to appear.
                  </p>
                </div>
              )}
              {selectedPackageIds.length > 0 && (
                <div className="rounded-md border border-purple-200 bg-purple-50 p-3 text-xs text-purple-700">
                  <span className="font-semibold">Selected packages:</span>{' '}
                  {selectedPackageIds.length}
                </div>
              )}
            </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </form>
    </Dialog>
  );
};

export default CreateDayDiscountDialog;
