import React, { useEffect, useMemo, useRef, useState } from 'react';
import Dialog from './Dialog';
import type { CouponDiscountType, CouponSchema } from '../schemas/CouponSchema';
import type { PackageSchema } from '../schemas/PackageSchema';

export interface CreateCouponPayload {
  code: string;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderValue?: number | null;
  maxRedemptions?: number | null;
  maxRedemptionsPerUser?: number | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  active: boolean;
  requiredPackageIds: string[];
  requireStudentVerification: boolean;
}

interface CreateCouponDialogProps {
  open: boolean;
  creating: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateCouponPayload) => Promise<void> | void;
  mode?: 'create' | 'edit';
  initialValues?: CouponSchema | null;
  packages?: PackageSchema[];
  packagesLoading?: boolean;
}

const parseNumberInput = (value: string): number | null => {
  if (!value.trim()) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const parseDateTimeLocal = (value: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

const formatDateTimeLocalInput = (value?: Date | null): string => {
  if (!value) return '';
  const pad = (num: number) => num.toString().padStart(2, '0');
  const year = value.getFullYear();
  const month = pad(value.getMonth() + 1);
  const day = pad(value.getDate());
  const hours = pad(value.getHours());
  const minutes = pad(value.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const CreateCouponDialog: React.FC<CreateCouponDialogProps> = ({
  open,
  creating,
  onClose,
  onSubmit,
  mode,
  initialValues = null,
  packages = [],
  packagesLoading = false,
}) => {
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<CouponDiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [maxRedemptionsPerUser, setMaxRedemptionsPerUser] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiredPackageIds, setRequiredPackageIds] = useState<string[]>([]);
  const [requireStudentVerification, setRequireStudentVerification] = useState(false);

  const codeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setCode('');
      setDescription('');
      setDiscountType('percentage');
      setDiscountValue('');
      setMinOrderValue('');
      setMaxRedemptions('');
      setMaxRedemptionsPerUser('');
      setValidFrom('');
      setValidUntil('');
      setActive(true);
      setError(null);
      setRequiredPackageIds([]);
      setRequireStudentVerification(false);
      return;
    }

    if (initialValues) {
      setCode(initialValues.code ?? '');
      setDescription(initialValues.description ?? '');
      setDiscountType(initialValues.discountType);
      setDiscountValue(initialValues.discountValue != null ? String(initialValues.discountValue) : '');
      setMinOrderValue(initialValues.minOrderValue != null ? String(initialValues.minOrderValue) : '');
      setMaxRedemptions(initialValues.maxRedemptions != null ? String(initialValues.maxRedemptions) : '');
      setMaxRedemptionsPerUser(initialValues.maxRedemptionsPerUser != null ? String(initialValues.maxRedemptionsPerUser) : '');
      setValidFrom(formatDateTimeLocalInput(initialValues.validFrom));
      setValidUntil(formatDateTimeLocalInput(initialValues.validUntil));
      setActive(initialValues.active);
      setRequiredPackageIds((initialValues.requiredPackageIds ?? []).filter((id): id is string => typeof id === 'string' && id.trim().length > 0));
      setRequireStudentVerification(Boolean(initialValues.requireStudentVerification));
      setError(null);
      return;
    }

    setCode('');
    setDescription('');
    setDiscountType('percentage');
    setDiscountValue('');
    setMinOrderValue('');
    setMaxRedemptions('');
    setMaxRedemptionsPerUser('');
    setValidFrom('');
    setValidUntil('');
    setActive(true);
    setError(null);
    setRequiredPackageIds([]);
    setRequireStudentVerification(false);
  }, [open, initialValues]);

  const discountLabel = useMemo(() => {
    return discountType === 'percentage' ? 'Discount percentage' : 'Flat discount value';
  }, [discountType]);

  const effectiveMode = mode ?? (initialValues ? 'edit' : 'create');
  const dialogTitle = effectiveMode === 'edit' ? 'Edit Coupon' : 'Create Coupon';
  const submitLabel = effectiveMode === 'edit' ? 'Save Changes' : 'Create Coupon';

  const sortedPackages = useMemo(() => {
    if (!packages || packages.length === 0) {
      return [] as PackageSchema[];
    }
    return [...packages].sort((a, b) => {
      if (a.mealType !== b.mealType) {
        return a.mealType.localeCompare(b.mealType);
      }
      return a.name.localeCompare(b.name);
    });
  }, [packages]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      setError('Coupon code is required.');
      codeInputRef.current?.focus();
      return;
    }

    const numericDiscount = Number(discountValue);
    if (!Number.isFinite(numericDiscount) || numericDiscount <= 0) {
      setError(discountType === 'percentage' ? 'Enter a percentage greater than 0.' : 'Enter a discount amount greater than 0.');
      return;
    }

    if (discountType === 'percentage' && numericDiscount > 100) {
      setError('Percentage discount cannot exceed 100%.');
      return;
    }

    const payload: CreateCouponPayload = {
      code: trimmedCode,
      description: description.trim() || undefined,
      discountType,
      discountValue: Math.round(numericDiscount * 100) / 100,
      minOrderValue: parseNumberInput(minOrderValue),
      maxRedemptions: parseNumberInput(maxRedemptions),
      maxRedemptionsPerUser: parseNumberInput(maxRedemptionsPerUser),
      validFrom: parseDateTimeLocal(validFrom),
      validUntil: parseDateTimeLocal(validUntil),
      active,
      requiredPackageIds: requiredPackageIds.filter((id, index, arr) => id && arr.indexOf(id) === index),
      requireStudentVerification,
    };

    if (payload.validFrom && payload.validUntil && payload.validFrom > payload.validUntil) {
      setError('Start date must be before the end date.');
      return;
    }

    try {
      await onSubmit(payload);
    } catch (err) {
      setError((err as Error).message || 'Failed to save coupon.');
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
        form="create-coupon-form"
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
      description={
        effectiveMode === 'edit'
          ? 'Update this coupon’s guardrails, eligibility, and activation window.'
          : 'Set up a promotional code with guardrails and availability windows.'
      }
      size="lg"
      initialFocus={codeInputRef as React.RefObject<HTMLElement>}
      footer={footer}
    >
      <form id="create-coupon-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="coupon-code" className="text-sm font-medium text-slate-700">
              Coupon code
            </label>
            <input
              id="coupon-code"
              ref={codeInputRef}
              type="text"
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                if (error) setError(null);
              }}
              placeholder="SAVE50"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400/60"
              disabled={creating}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="coupon-active" className="text-sm font-medium text-slate-700">
              Status
            </label>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <input
                id="coupon-active"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                checked={active}
                onChange={(event) => {
                  setActive(event.target.checked);
                  if (error) setError(null);
                }}
                disabled={creating}
              />
              <label htmlFor="coupon-active" className="text-sm text-slate-700">
                Active immediately
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="coupon-description" className="text-sm font-medium text-slate-700">
            Description <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            id="coupon-description"
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              if (error) setError(null);
            }}
            rows={3}
            placeholder="Short internal notes or campaign summary"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400/60"
            disabled={creating}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Discount type</label>
            <div className="grid gap-2">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <input
                  type="radio"
                  name="coupon-discount-type"
                  value="percentage"
                  checked={discountType === 'percentage'}
                  onChange={() => {
                    setDiscountType('percentage');
                    if (Number(discountValue) > 100) {
                      setDiscountValue('');
                    }
                    if (error) setError(null);
                  }}
                  disabled={creating}
                />
                Percentage
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <input
                  type="radio"
                  name="coupon-discount-type"
                  value="flat"
                  checked={discountType === 'flat'}
                  onChange={() => {
                    setDiscountType('flat');
                    if (error) setError(null);
                  }}
                  disabled={creating}
                />
                Flat amount
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="coupon-discount-value" className="text-sm font-medium text-slate-700">
              {discountLabel}
            </label>
            <div className="relative">
              <input
                id="coupon-discount-value"
                type="number"
                min={discountType === 'percentage' ? 1 : 0}
                max={discountType === 'percentage' ? 100 : undefined}
                step="0.5"
                value={discountValue}
                onChange={(event) => {
                  setDiscountValue(event.target.value);
                  if (error) setError(null);
                }}
                placeholder={discountType === 'percentage' ? '15' : '200'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-12 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400/60"
                disabled={creating}
                required
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">
                {discountType === 'percentage' ? '%' : '₹'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="coupon-min-order" className="text-sm font-medium text-slate-700">
              Minimum order value
              <span className="ml-1 text-xs text-slate-400">(optional)</span>
            </label>
            <input
              id="coupon-min-order"
              type="number"
              min={0}
              step="1"
              value={minOrderValue}
              onChange={(event) => {
                setMinOrderValue(event.target.value);
                if (error) setError(null);
              }}
              placeholder="1000"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400/60"
              disabled={creating}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="coupon-max-redemptions" className="text-sm font-medium text-slate-700">
              Max redemptions
              <span className="ml-1 text-xs text-slate-400">(optional)</span>
            </label>
            <input
              id="coupon-max-redemptions"
              type="number"
              min={1}
              step={1}
              value={maxRedemptions}
              onChange={(event) => {
                setMaxRedemptions(event.target.value);
                if (error) setError(null);
              }}
              placeholder="500"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400/60"
              disabled={creating}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="coupon-max-redemptions-user" className="text-sm font-medium text-slate-700">
              Per-user limit
              <span className="ml-1 text-xs text-slate-400">(optional)</span>
            </label>
            <input
              id="coupon-max-redemptions-user"
              type="number"
              min={1}
              step={1}
              value={maxRedemptionsPerUser}
              onChange={(event) => {
                setMaxRedemptionsPerUser(event.target.value);
                if (error) setError(null);
              }}
              placeholder="1"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400/60"
              disabled={creating}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="coupon-valid-from" className="text-sm font-medium text-slate-700">
              Start date
              <span className="ml-1 text-xs text-slate-400">(optional)</span>
            </label>
            <input
              id="coupon-valid-from"
              type="datetime-local"
              value={validFrom}
              onChange={(event) => {
                setValidFrom(event.target.value);
                if (error) setError(null);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400/60"
              disabled={creating}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="coupon-valid-until" className="text-sm font-medium text-slate-700">
              End date
              <span className="ml-1 text-xs text-slate-400">(optional)</span>
            </label>
            <input
              id="coupon-valid-until"
              type="datetime-local"
              value={validUntil}
              onChange={(event) => {
                setValidUntil(event.target.value);
                if (error) setError(null);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400/60"
              disabled={creating}
            />
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-800">Eligibility rules</span>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                checked={requireStudentVerification}
                onChange={(event) => {
                  setRequireStudentVerification(event.target.checked);
                  if (error) setError(null);
                }}
                disabled={creating}
              />
              <span>
                Restrict to verified students only
                <span className="block text-xs font-normal text-slate-500">
                  Shoppers must have an approved student verification on file to use this code.
                </span>
              </span>
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-700">Required meal packages</span>
              <button
                type="button"
                onClick={() => {
                  setRequiredPackageIds([]);
                  if (error) setError(null);
                }}
                className="text-xs font-semibold text-purple-600 transition hover:text-purple-700"
                disabled={creating || requiredPackageIds.length === 0}
              >
                Clear selection
              </button>
            </div>
            <p className="text-xs text-slate-500">
              All selected packages must be part of the subscriber’s plan before this coupon can be applied. Leave empty to allow any package mix.
            </p>
            <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3">
              {packagesLoading ? (
                <p className="text-xs text-slate-500">Loading packages…</p>
              ) : sortedPackages.length === 0 ? (
                <p className="text-xs text-slate-500">No meal packages are available yet.</p>
              ) : (
                sortedPackages.map((pkg) => {
                  const isChecked = requiredPackageIds.includes(pkg.id);
                  return (
                    <label key={pkg.id} className="flex items-start gap-2 rounded-md border border-transparent px-2 py-1 text-sm text-slate-700 transition hover:border-slate-200">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        checked={isChecked}
                        onChange={() => {
                          setRequiredPackageIds((prev) => {
                            if (prev.includes(pkg.id)) {
                              return prev.filter((id) => id !== pkg.id);
                            }
                            return [...prev, pkg.id];
                          });
                          if (error) setError(null);
                        }}
                        disabled={creating}
                      />
                      <span className="flex flex-col">
                        <span className="font-medium text-slate-800">{pkg.name}</span>
                        <span className="text-[11px] uppercase tracking-wide text-slate-400">{pkg.mealType}</span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
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

export default CreateCouponDialog;
