import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BadgePercent, CalendarClock, Eye, PauseCircle, Pencil, PlayCircle, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import CreateCouponDialog, { type CreateCouponPayload } from '../components/CreateCouponDialog';
import Dialog from '../components/Dialog';
import IconButton from '../components/IconButton';
import { useCouponsStore } from '../stores/couponsStore';
import { usePackagesStore } from '../stores/packagesStore';
import type { CouponSchema } from '../schemas/CouponSchema';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';

const formatCurrency = (value: number): string => `₹${value.toLocaleString('en-IN')}`;

const formatDiscount = (coupon: CouponSchema): string => {
  if (coupon.discountType === 'percentage') {
    return `${coupon.discountValue.toFixed(2).replace(/\.00$/, '')}% off`;
  }
  return `${formatCurrency(coupon.discountValue).replace(/\.00$/, '')} off`;
};

const formatDateTime = (value?: Date | null): string => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(value);
  } catch (error) {
    console.error('Failed to format date', error);
    return value.toLocaleString();
  }
};

const getStatusLabel = (coupon: CouponSchema): { label: string; tone: 'success' | 'warning' | 'error' | 'info' } => {
  const now = new Date();
  if (!coupon.active) {
    return { label: 'Paused', tone: 'warning' };
  }
  if (coupon.validUntil && coupon.validUntil < now) {
    return { label: 'Expired', tone: 'error' };
  }
  if (coupon.validFrom && coupon.validFrom > now) {
    return { label: 'Scheduled', tone: 'info' };
  }
  return { label: 'Live', tone: 'success' };
};

const toneToClass: Record<'success' | 'warning' | 'error' | 'info', string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
};

const summarizeList = (items: string[], max = 2): string => {
  if (items.length === 0) {
    return '—';
  }
  if (items.length <= max) {
    return items.join(', ');
  }
  return `${items.slice(0, max).join(', ')} +${items.length - max} more`;
};

const CouponsPage: React.FC = () => {
  const {
    coupons,
    loading,
    creating,
    updatingId,
    togglingId,
    deletingId,
    loadCoupons,
    createCoupon,
    updateCoupon,
    toggleCouponActive,
    deleteCoupon,
    totalItems,
    paginatedData,
  } = useCouponsStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('code');
  const [searchValue, setSearchValue] = useState('');
  const searchFields = useMemo(() => getSearchFieldsForCollection('coupons'), []);

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CouponSchema | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [viewingCoupon, setViewingCoupon] = useState<CouponSchema | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<CouponSchema | null>(null);

  const packages = usePackagesStore((state) => state.packages);
  const packagesLoading = usePackagesStore((state) => state.loading);
  const loadPackages = usePackagesStore((state) => state.loadPackages);
  const packagesLoadedRef = useRef(false);

  const viewingStatus = viewingCoupon ? getStatusLabel(viewingCoupon) : null;

  useEffect(() => {
    const search = searchValue ? { field: searchField, type: 'text' as const, value: searchValue } : null;
    void paginatedData({ pageNumber: currentPage, pageSize, search });
  }, [currentPage, pageSize, searchField, searchValue, paginatedData]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchField, searchValue]);

  const initialCouponsLoadRef = useRef(false);
  useEffect(() => {
    if (initialCouponsLoadRef.current) {
      return;
    }
    initialCouponsLoadRef.current = true;
    void loadCoupons();
  }, [loadCoupons]);

  useEffect(() => {
    if (!packagesLoadedRef.current) {
      packagesLoadedRef.current = true;
      void loadPackages();
    }
  }, [loadPackages]);

  const sortedCoupons = useMemo(() => {
    return [...coupons].sort((a, b) => {
      const byStatus = Number(b.active) - Number(a.active);
      if (byStatus !== 0) return byStatus;
      const aDate = a.createdAt?.getTime() ?? 0;
      const bDate = b.createdAt?.getTime() ?? 0;
      return bDate - aDate;
    });
  }, [coupons]);

  const packageMetaMap = useMemo(() => {
    const map = new Map<string, { name: string; mealType: string }>();
    packages.forEach((pkg) => {
      map.set(pkg.id, { name: pkg.name, mealType: pkg.mealType });
    });
    return map;
  }, [packages]);

  const formatRequiredPackages = useCallback(
    (ids: string[] | null | undefined) => {
      if (!ids || ids.length === 0) {
        return null;
      }
      const names = ids
        .map((id) => {
          const meta = packageMetaMap.get(id);
          if (!meta) {
            return null;
          }
          return `${meta.name} (${meta.mealType})`;
        })
        .filter((value): value is string => Boolean(value));
      if (names.length === 0) {
        return 'Selected meal packages';
      }
      return summarizeList(names);
    },
    [packageMetaMap],
  );

  const columns = useMemo<DataTableColumnDef<CouponSchema>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Code',
        meta: {
          cellClassName: 'font-semibold text-slate-900',
        },
        cell: ({ row }) => {
          const coupon = row.original;
          const status = getStatusLabel(coupon);
          return (
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-md bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700">
                  {coupon.code}
                </span>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${toneToClass[status.tone]}`}>
                  {status.label}
                </span>
              </div>
              {coupon.description && (
                <p className="text-xs text-slate-500">{coupon.description}</p>
              )}
            </div>
          );
        },
      },
      {
        id: 'discount',
        header: 'Discount',
        cell: ({ row }) => {
          const coupon = row.original;
          const requiredPackagesSummary = formatRequiredPackages(coupon.requiredPackageIds);
          return (
            <div className="space-y-1 text-sm text-slate-700">
              <p className="font-medium text-slate-900">{formatDiscount(coupon)}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-600">
                  <BadgePercent size={12} />
                  {coupon.discountType === 'percentage' ? 'Percent-off' : 'Flat-off'}
                </span>
                {coupon.minOrderValue != null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-600">
                    <ShieldCheck size={12} />
                    Min {formatCurrency(coupon.minOrderValue)}
                  </span>
                )}
                {coupon.requireStudentVerification && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 font-semibold text-purple-700">
                    Student verified only
                  </span>
                )}
                {requiredPackagesSummary && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-600">
                    Requires: {requiredPackagesSummary}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: 'limits',
        header: 'Limits',
        cell: ({ row }) => {
          const coupon = row.original;
          const items: string[] = [];
          if (coupon.maxRedemptions != null) {
            items.push(`${coupon.maxRedemptions} total uses`);
          }
          if (coupon.maxRedemptionsPerUser != null) {
            items.push(`${coupon.maxRedemptionsPerUser} per user`);
          }
          if (items.length === 0) {
            return <span className="text-sm text-slate-500">No caps</span>;
          }
          return (
            <ul className="space-y-1 text-sm text-slate-700">
              {items.map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          );
        },
      },
      {
        id: 'schedule',
        header: 'Schedule',
        cell: ({ row }) => {
          const coupon = row.original;
          return (
            <div className="space-y-1 text-sm text-slate-600">
              <div className="flex items-center gap-2 text-xs">
                <CalendarClock size={14} className="text-purple-500" />
                <span>Starts: {formatDateTime(coupon.validFrom)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CalendarClock size={14} className="text-slate-400" />
                <span>Ends: {formatDateTime(coupon.validUntil)}</span>
              </div>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const coupon = row.original;
          const isToggling = togglingId === coupon.id;
          const isDeleting = deletingId === coupon.id;
          const status = getStatusLabel(coupon);

          return (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <IconButton
                label="View details"
                icon={<Eye size={16} />}
                onClick={() => setViewingCoupon(coupon)}
              />
              <IconButton
                label="Edit coupon"
                icon={<Pencil size={16} />}
                onClick={() => {
                  setEditingCoupon(coupon);
                  setDialogOpen(true);
                }}
              />
              <button
                type="button"
                onClick={() => {
                  void toggleCouponActive(coupon.id, !coupon.active);
                }}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 font-semibold transition ${
                  coupon.active
                    ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                } disabled:opacity-60`}
                disabled={isToggling}
              >
                {coupon.active ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                {coupon.active ? 'Pause' : 'Activate'}
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(coupon)}
                className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                disabled={isDeleting}
              >
                <Trash2 size={14} /> Delete
              </button>
              <span className="text-[11px] font-medium text-slate-400">{status.label}</span>
            </div>
          );
        },
      },
    ],
    [deletingId, formatRequiredPackages, togglingId, toggleCouponActive],
  );

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCoupon(null);
  };

  const handleCreateCoupon = async (payload: CreateCouponPayload) => {
    const created = await createCoupon({
      code: payload.code,
      description: payload.description,
      discountType: payload.discountType,
      discountValue: payload.discountValue,
      minOrderValue: payload.minOrderValue ?? null,
      maxRedemptions: payload.maxRedemptions ?? null,
      maxRedemptionsPerUser: payload.maxRedemptionsPerUser ?? null,
      validFrom: payload.validFrom ?? null,
      validUntil: payload.validUntil ?? null,
      active: payload.active,
      requiredPackageIds: payload.requiredPackageIds,
      requireStudentVerification: payload.requireStudentVerification,
    });
    if (created) {
      closeDialog();
    }
  };

  const handleUpdateCoupon = async (payload: CreateCouponPayload) => {
    if (!editingCoupon) return;
    const updated = await updateCoupon(editingCoupon.id, {
      code: payload.code,
      description: payload.description,
      discountType: payload.discountType,
      discountValue: payload.discountValue,
      minOrderValue: payload.minOrderValue ?? null,
      maxRedemptions: payload.maxRedemptions ?? null,
      maxRedemptionsPerUser: payload.maxRedemptionsPerUser ?? null,
      validFrom: payload.validFrom ?? null,
      validUntil: payload.validUntil ?? null,
      active: payload.active,
      requiredPackageIds: payload.requiredPackageIds,
      requireStudentVerification: payload.requireStudentVerification,
    });
    if (updated) {
      closeDialog();
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-purple-600">Admin • Coupons</p>
          <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold text-slate-900">
            <BadgePercent size={28} className="text-purple-500" /> Manage Coupon Codes
          </h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Launch promotional codes with confidence—define guardrails, activation windows, and limits so marketing offers stay on track.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingCoupon(null);
            setDialogOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
          disabled={creating || !!updatingId}
        >
          <Plus size={16} /> New Coupon
        </button>
      </header>

      <DataTable<CouponSchema>
        data={sortedCoupons}
        columns={columns}
        loading={loading}
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
        emptyMessage="No coupons created yet. Launch your first offer to delight customers."
        enableSorting
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete coupon"
        description={
          <span>
            Are you sure you want to delete{' '}
            <strong>{pendingDelete?.code ?? 'this coupon'}</strong>? Customers will no longer be able to redeem it.
          </span>
        }
        confirmLabel="Delete"
        variant="danger"
        loading={confirmLoading}
        onCancel={() => {
          if (!confirmLoading) {
            setPendingDelete(null);
          }
        }}
        onConfirm={async () => {
          if (!pendingDelete) return;
          setConfirmLoading(true);
          try {
            await deleteCoupon(pendingDelete.id, pendingDelete.code);
            setPendingDelete(null);
          } finally {
            setConfirmLoading(false);
          }
        }}
      />

      <CreateCouponDialog
        open={isDialogOpen}
        creating={editingCoupon ? updatingId === editingCoupon.id : creating}
        onClose={closeDialog}
        onSubmit={editingCoupon ? handleUpdateCoupon : handleCreateCoupon}
        mode={editingCoupon ? 'edit' : 'create'}
        initialValues={editingCoupon ?? undefined}
        packages={packages}
        packagesLoading={packagesLoading}
      />

      <Dialog
        open={!!viewingCoupon}
        onClose={() => setViewingCoupon(null)}
  title={viewingCoupon ? `${viewingCoupon.code} details` : 'Coupon details'}
        description={viewingCoupon?.description}
        size="lg"
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setViewingCoupon(null)}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              Close
            </button>
          </div>
        }
      >
        {viewingCoupon ? (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Discount</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{formatDiscount(viewingCoupon)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
                <p
                  className={`mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    viewingStatus ? toneToClass[viewingStatus.tone] : 'border-slate-200 bg-slate-100 text-slate-600'
                  }`}
                >
                  {viewingStatus?.label ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Valid from</p>
                <p className="mt-1 text-sm text-slate-700">{formatDateTime(viewingCoupon.validFrom)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Valid until</p>
                <p className="mt-1 text-sm text-slate-700">{formatDateTime(viewingCoupon.validUntil)}</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-600">
              <h3 className="text-sm font-semibold text-slate-900">Usage limits</h3>
              <ul className="mt-2 space-y-1">
                <li>
                  <strong>Total redemptions:</strong> {viewingCoupon.maxRedemptions ?? 'No cap'}
                </li>
                <li>
                  <strong>Per user:</strong> {viewingCoupon.maxRedemptionsPerUser ?? 'No cap'}
                </li>
                <li>
                  <strong>Minimum order:</strong> {viewingCoupon.minOrderValue != null ? formatCurrency(viewingCoupon.minOrderValue) : 'Not required'}
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-600">
              <h3 className="text-sm font-semibold text-slate-900">Eligibility</h3>
              <ul className="mt-2 space-y-1">
                <li>
                  <strong>Student verification:</strong> {viewingCoupon.requireStudentVerification ? 'Required' : 'Not required'}
                </li>
                <li>
                  <strong>Required packages:</strong>{' '}
                  {(() => {
                    const summary = formatRequiredPackages(viewingCoupon.requiredPackageIds);
                    if (!summary) {
                      return 'None';
                    }
                    return summary;
                  })()}
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-600">
              <h3 className="text-sm font-semibold text-slate-900">Metadata</h3>
              <ul className="mt-2 space-y-1">
                <li>
                  <strong>Created:</strong> {viewingCoupon.createdAt ? formatDateTime(viewingCoupon.createdAt) : '—'}
                </li>
                <li>
                  <strong>Last updated:</strong> {viewingCoupon.updatedAt ? formatDateTime(viewingCoupon.updatedAt) : '—'}
                </li>
              </ul>
            </div>
          </div>
        ) : null}
      </Dialog>

      <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <ShieldCheck size={18} className="text-purple-500" /> Best practices
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400" aria-hidden="true" />
            Use short, memorable codes and include a description so teams know the intent.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400" aria-hidden="true" />
            Set clear validity windows and order minimums to prevent misuse.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400" aria-hidden="true" />
            Pause or delete expired campaigns to keep the list focused on active promotions.
          </li>
        </ul>
      </section>
    </div>
  );
};

export default CouponsPage;
