import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PiggyBank, ReceiptIndianRupee, Users } from 'lucide-react';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import { useCouponsStore } from '../stores/couponsStore';
import { useSubscriptionRequestsStore } from '../stores/subscriptionRequestsStore';
import type { CouponSchema } from '../schemas/CouponSchema';
import type { SubscriptionRequestSchema } from '../schemas/SubscriptionRequestSchema';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';
import { getDisplayCustomerId } from '../utils/customerDisplay';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

type RedemptionRow = {
  id: string;
  customerName: string;
  customerEmail?: string | null;
  originalPrice: number;
  discountedPrice: number;
  discountAmount: number;
  usedAt: Date | null;
  request: SubscriptionRequestSchema;
};

const buildRedemptionRows = (
  requests: SubscriptionRequestSchema[],
  selectedCouponCode: string,
): RedemptionRow[] => {
  if (!selectedCouponCode) {
    return [];
  }

  const normalizedCoupon = selectedCouponCode.trim().toUpperCase();

  return requests
    .filter((request) => {
      if (request.status !== 'approved') {
        return false;
      }
      const appliedCode = request.summary.couponCode?.trim().toUpperCase();
      return appliedCode === normalizedCoupon;
    })
    .map((request) => {
      const couponDiscount = Math.max(0, request.summary.couponDiscountAmount);
      const discountedPrice = Math.max(0, request.summary.totalPayable);
      const originalPrice = discountedPrice + couponDiscount;

      const usedAt = request.reviewedAt ?? request.updatedAt ?? request.createdAt ?? null;

      return {
        id: request.id ?? `${request.userId}-${normalizedCoupon}`,
        customerName: request.userName,
        customerEmail: request.userEmail,
        originalPrice,
        discountedPrice,
        discountAmount: couponDiscount,
        usedAt,
        request,
      } satisfies RedemptionRow;
    })
    .sort((a, b) => {
      const aTime = a.usedAt?.getTime() ?? 0;
      const bTime = b.usedAt?.getTime() ?? 0;
      return bTime - aTime;
    });
};

const CouponUsageReportPage: React.FC = () => {
  const {
    coupons,
    loading: couponsLoading,
    loadCoupons,
    totalItems,
    paginatedData,
  } = useCouponsStore();
  const {
    requests,
    loading: requestsLoading,
    loadRequests,
  } = useSubscriptionRequestsStore();

  const [selectedCouponCode, setSelectedCouponCode] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('code');
  const [searchValue, setSearchValue] = useState('');
  const searchFields = useMemo(() => getSearchFieldsForCollection('coupons'), []);

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
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!selectedCouponCode && coupons.length > 0) {
      setSelectedCouponCode(coupons[0].code ?? '');
    }
  }, [coupons, selectedCouponCode]);

  const selectedCoupon: CouponSchema | undefined = useMemo(() => {
    if (!selectedCouponCode) {
      return undefined;
    }
    const normalized = selectedCouponCode.trim().toUpperCase();
    return coupons.find((coupon) => coupon.code.trim().toUpperCase() === normalized);
  }, [coupons, selectedCouponCode]);

  const redemptionRows = useMemo(
    () => buildRedemptionRows(requests, selectedCouponCode),
    [requests, selectedCouponCode],
  );

  const totals = useMemo(() => {
    const totalRedemptions = redemptionRows.length;
    const totalDiscountGiven = redemptionRows.reduce((sum, row) => sum + row.discountAmount, 0);
    const totalRevenue = redemptionRows.reduce((sum, row) => sum + row.discountedPrice, 0);

    return {
      totalRedemptions,
      totalDiscountGiven,
      totalRevenue,
    };
  }, [redemptionRows]);

  const columns = useMemo<DataTableColumnDef<RedemptionRow>[]>(
    () => [
      {
        accessorKey: 'customerName',
        header: 'Customer',
        meta: { cellClassName: 'whitespace-nowrap' },
        cell: ({ row }) => {
          const record = row.original;
          const displayId = getDisplayCustomerId(record.request.customerShortId, record.request.userId, { allowFallback: true });
          return (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">{record.customerName}</p>
              {record.customerEmail ? (
                <p className="text-xs text-slate-500">{record.customerEmail}</p>
              ) : null}
              {displayId !== '—' ? (
                <p className="text-[11px] text-slate-500">
                  CID: <span className="font-mono text-xs">{displayId}</span>
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: 'originalPrice',
        header: 'Original Price',
        meta: { cellClassName: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="text-sm font-medium text-slate-700">
            {currencyFormatter.format(row.original.originalPrice)}
          </span>
        ),
      },
      {
        accessorKey: 'discountAmount',
        header: 'Discount Applied',
        meta: { cellClassName: 'whitespace-nowrap text-emerald-600' },
        cell: ({ row }) => (
          <span className="text-sm font-semibold">
            -{currencyFormatter.format(row.original.discountAmount)}
          </span>
        ),
      },
      {
        accessorKey: 'discountedPrice',
        header: 'Final Price',
        meta: { cellClassName: 'whitespace-nowrap text-slate-900' },
        cell: ({ row }) => (
          <span className="text-sm font-semibold">
            {currencyFormatter.format(row.original.discountedPrice)}
          </span>
        ),
      },
      {
        accessorKey: 'usedAt',
        header: 'Date Used',
        meta: { cellClassName: 'whitespace-nowrap' },
        cell: ({ row }) => {
          const usedAt = row.original.usedAt;
          return (
            <span className="text-sm text-slate-600">
              {usedAt ? dateTimeFormatter.format(usedAt) : '—'}
            </span>
          );
        },
      },
    ],
    [],
  );

  const isLoading = couponsLoading || requestsLoading;

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-purple-600">Admin • Coupons</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Coupon Usage Report</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Measure how approved subscriptions redeem promotional codes and quantify the revenue impact per coupon.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="coupon-selector">
              Select coupon
            </label>
            <select
              id="coupon-selector"
              value={selectedCouponCode}
              onChange={(event) => setSelectedCouponCode(event.target.value)}
              className="min-w-[220px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {coupons.length === 0 ? (
                <option value="">No coupons available</option>
              ) : (
                coupons.map((coupon) => (
                  <option key={coupon.id} value={coupon.code}>
                    {coupon.code}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
        {selectedCoupon ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-slate-500">
              <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[11px] font-semibold text-purple-700">
                {selectedCoupon.code}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                {selectedCoupon.discountType === 'percentage'
                  ? `${selectedCoupon.discountValue}% off`
                  : currencyFormatter.format(selectedCoupon.discountValue).replace(/\.00$/, '') + ' off'}
              </span>
              {selectedCoupon.active ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                  Paused
                </span>
              )}
            </div>
            {selectedCoupon.description ? (
              <p className="mt-3 text-xs text-slate-500">{selectedCoupon.description}</p>
            ) : null}
          </div>
        ) : null}
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total redemptions
            <Users size={18} className="text-purple-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totals.totalRedemptions}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
            Discount granted
            <PiggyBank size={18} className="text-emerald-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-600">
            {currencyFormatter.format(totals.totalDiscountGiven)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
            Net revenue collected
            <ReceiptIndianRupee size={18} className="text-slate-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {currencyFormatter.format(totals.totalRevenue)}
          </p>
        </div>
      </section>

      <DataTable<RedemptionRow>
        columns={columns}
        data={redemptionRows}
        loading={isLoading}
        emptyMessage={
          selectedCouponCode
            ? 'No approved subscriptions have redeemed this coupon yet.'
            : 'Select a coupon to view redemption activity.'
        }
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
    </div>
  );
};

export default CouponUsageReportPage;
