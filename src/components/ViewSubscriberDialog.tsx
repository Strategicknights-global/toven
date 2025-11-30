import React, { useState } from 'react';
import Dialog from './Dialog';
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Eye,
  IndianRupee,
  Mail,
  MapPin,
  NotebookPen,
  Phone,
  UserCheck,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react';
import type { UserSchema } from '../schemas/UserSchema';
import type {
  SubscriptionRequestSchema,
  SubscriptionRequestStatus,
} from '../schemas/SubscriptionRequestSchema';

const formatDate = (value?: Date | null): string => {
  if (!value) {
    return '—';
  }
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(value);
  } catch (error) {
    console.error('Failed to format date', error);
    return value.toLocaleDateString();
  }
};

const formatDateTime = (value?: Date | null): string => {
  if (!value) {
    return '—';
  }
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(value);
  } catch (error) {
    console.error('Failed to format datetime', error);
    return value.toLocaleString();
  }
};

const formatCurrency = (amount: number | null | undefined): string => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return '₹0';
  }
  const rounded = Math.round(amount);
  return `₹${rounded.toLocaleString('en-IN')}`;
};

const getTimestamp = (value?: Date | null): number => (value instanceof Date ? value.getTime() : 0);

const statusMeta: Record<SubscriptionRequestStatus, { label: string; className: string; icon: React.ReactNode }> = {
  approved: {
    label: 'Approved',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  pending: {
    label: 'Pending',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: <Clock3 className="h-4 w-4" />,
  },
  rejected: {
    label: 'Rejected',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
    icon: <XCircle className="h-4 w-4" />,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'border-gray-200 bg-gray-50 text-gray-700',
    icon: <XCircle className="h-4 w-4" />,
  },
};

interface ViewSubscriberDialogProps {
  open: boolean;
  subscriber: (UserSchema & {
    latestRequest: SubscriptionRequestSchema | null;
    approvedRequests: SubscriptionRequestSchema[];
    activeRequests: SubscriptionRequestSchema[];
    totalActiveValue: number;
    primaryDeliveryAddress: string | null;
  }) | null;
  requests: SubscriptionRequestSchema[];
  roleNameLookup: Map<string, string>;
  subscriberRoleId: string | null;
  onClose: () => void;
}

const ViewSubscriberDialog: React.FC<ViewSubscriberDialogProps> = ({
  open,
  subscriber,
  requests,
  roleNameLookup,
  subscriberRoleId,
  onClose,
}) => {
  const [viewingPaymentProof, setViewingPaymentProof] = useState<{ imageBase64: string; fileName?: string } | null>(null);

  if (!open || !subscriber) {
    return null;
  }

  const sortedRequests = [...requests].sort((a, b) => {
    const aTime = getTimestamp(a.createdAt) || getTimestamp(a.startDate);
    const bTime = getTimestamp(b.createdAt) || getTimestamp(b.startDate);
    return bTime - aTime;
  });

  const totalRequests = sortedRequests.length;
  const approvedCount = sortedRequests.filter((request) => request.status === 'approved').length;
  const pendingCount = sortedRequests.filter((request) => request.status === 'pending').length;
  const activeRequests = subscriber.activeRequests ?? [];
  const approvedRequests = subscriber.approvedRequests ?? [];
  const subscriberRoles = Array.isArray(subscriber.roles) ? subscriber.roles : [];
  const primaryPlan = activeRequests[0] ?? subscriber.latestRequest ?? approvedRequests[0] ?? null;
  const totalActiveValue = subscriber.totalActiveValue ?? 0;
  const now = Date.now();

  const isRequestActive = (request: SubscriptionRequestSchema): boolean => {
    if (request.status !== 'approved') {
      return false;
    }
    const startTime = request.startDate instanceof Date ? request.startDate.getTime() : 0;
    const endTime = request.endDate instanceof Date ? request.endDate.getTime() : 0;
    if (!startTime || !endTime) {
      return false;
    }
    return startTime <= now && now <= endTime;
  };

  return (
    <>
    <Dialog
      open={open}
      onClose={onClose}
      title="Subscriber details"
      description="Review the account profile and subscription history for this subscriber."
      size="xl"
      footer={
        <div className="flex justify-between gap-3 flex-wrap-reverse sm:flex-nowrap">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ClipboardList className="h-4 w-4 text-slate-400" />
            <span>
              {approvedCount} approved • {pendingCount} pending • {totalRequests} total requests
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <UserCheck className="h-4 w-4 text-purple-500" />
              Subscriber profile
            </h3>
            <div className="space-y-2 text-sm text-slate-700">
              <p className="text-lg font-semibold text-slate-900">{subscriber.fullName}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                {subscriber.email ? (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {subscriber.email}
                  </span>
                ) : null}
                {subscriber.phone ? (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {subscriber.phone}
                  </span>
                ) : null}
                {subscriber.userType ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
                    {subscriber.userType}
                  </span>
                ) : null}
              </div>
              {subscriber.primaryDeliveryAddress ? (
                <p className="flex items-start gap-2 text-xs text-slate-500">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 text-slate-400" />
                  <span>{subscriber.primaryDeliveryAddress}</span>
                </p>
              ) : (
                <p className="text-xs text-slate-400">No delivery location on record.</p>
              )}
              <p className="text-xs text-slate-400">
                Joined {formatDate(subscriber.createdAt ?? null)} • Last updated {formatDateTime(subscriber.updatedAt ?? null)}
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <ClipboardList className="h-4 w-4 text-purple-500" />
              Roles & preferences
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {subscriberRoles.length ? (
                subscriberRoles.map((roleId) => {
                  const name = roleNameLookup.get(roleId) ?? roleId;
                  const isSubscriberRole = subscriberRoleId ? roleId === subscriberRoleId : name.toLowerCase() === 'subscriber';
                  return (
                    <span
                      key={roleId}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold ${
                        isSubscriberRole
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      {name}
                    </span>
                  );
                })
              ) : (
                <span className="text-slate-400">No roles assigned</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5">
                <UtensilsCrossed className="h-3.5 w-3.5 text-slate-400" />
                Diet preference: {primaryPlan ? (primaryPlan.dietPreference === 'pure-veg' ? 'Pure Veg' : 'Mixed') : '—'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5">
                Requests placed: {totalRequests}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5">
                Active subscriptions: {activeRequests.length}
              </span>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <CalendarClock className="h-4 w-4 text-purple-500" />
            Active subscriptions
          </h3>
          {activeRequests.length ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-700">
                <span className="font-semibold uppercase tracking-wide">{activeRequests.length} active subscription{activeRequests.length > 1 ? 's' : ''}</span>
                <span className="inline-flex items-center gap-1 font-semibold">
                  <IndianRupee className="h-4 w-4" />
                  {formatCurrency(totalActiveValue)} projected
                </span>
              </div>
              {activeRequests.map((request, index) => (
                <div key={request.id ?? `active-${index}`} className="space-y-3 rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">{request.categoryName}</p>
                      <p className="text-xs text-emerald-700">
                        {formatDate(request.startDate)} → {formatDate(request.endDate)} ({request.durationDays} days)
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 shadow-inner">
                      <IndianRupee className="h-4 w-4" />
                      {formatCurrency(request.summary.totalPayable)}
                    </span>
                  </div>
                  <div className="grid gap-3 text-xs text-emerald-700 sm:grid-cols-3">
                    <div>
                      <p className="font-semibold uppercase tracking-wide text-emerald-600">Meal selections</p>
                      <ul className="mt-1 space-y-1">
                        {request.selections.map((selection, selectionIndex) => (
                          <li
                            key={`${request.id ?? `active-${index}`}-selection-${selectionIndex}`}
                            className="flex items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-1"
                          >
                            <span className="font-medium text-emerald-800">{selection.mealType}</span>
                            <span className="text-emerald-600">{selection.packageName}</span>
                            <span className="font-semibold text-emerald-800">{formatCurrency(selection.totalPrice)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold uppercase tracking-wide text-emerald-600">Discounts</p>
                      <ul className="mt-1 space-y-1 text-emerald-700">
                        <li>Subtotal: {formatCurrency(request.summary.subtotal)}</li>
                        <li>Plan discount: {request.summary.discountPercent}% ({formatCurrency(request.summary.discountAmount)})</li>
                        {request.summary.couponCode ? (
                          <li>Coupon {request.summary.couponCode}: {formatCurrency(request.summary.couponDiscountAmount)}</li>
                        ) : null}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold uppercase tracking-wide text-emerald-600">Reviewed by</p>
                      <div className="mt-1 space-y-1 text-emerald-700">
                        <p>{request.reviewedByName ?? '—'}</p>
                        <p className="text-xs text-emerald-600">{formatDateTime(request.reviewedAt ?? null)}</p>
                      </div>
                    </div>
                  </div>
                  {request.notes ? (
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-emerald-700">
                      <p className="font-semibold uppercase tracking-wide text-emerald-600">Subscriber notes</p>
                      <p className="mt-1 whitespace-pre-wrap">{request.notes}</p>
                    </div>
                  ) : null}
                  {request.statusNote ? (
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-emerald-700">
                      <p className="font-semibold uppercase tracking-wide text-emerald-600">Reviewer note</p>
                      <p className="mt-1 whitespace-pre-wrap">{request.statusNote}</p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : approvedRequests.length ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              All approved subscriptions for this subscriber have completed.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No approved subscription yet for this subscriber.
            </div>
          )}
  </section>

  <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <ClipboardList className="h-4 w-4 text-purple-500" />
            Request history
          </h3>
          {sortedRequests.length ? (
            <div className="space-y-4">
              {sortedRequests.map((request) => {
                const meta = statusMeta[request.status];
                const active = isRequestActive(request);
                return (
                  <article
                    key={request.id ?? `${request.userId}-${getTimestamp(request.createdAt)}`}
                    className={`overflow-hidden rounded-xl border bg-white shadow-sm ${active ? 'border-emerald-300 shadow-emerald-100/70' : 'border-slate-200'}`}
                  >
                    <header className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{request.categoryName}</p>
                        <p className="text-xs text-slate-500">
                          Requested {formatDateTime(request.createdAt ?? null)} • Duration {request.durationDays} days
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {active ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                            Active
                          </span>
                        ) : null}
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
                          {meta.icon}
                          {meta.label}
                        </span>
                      </div>
                    </header>
                    <div className="grid gap-4 px-4 py-4 text-xs text-slate-600 sm:grid-cols-2">
                      {request.paymentProofImageBase64 ? (
                        <div className="space-y-1 sm:col-span-2">
                          <p className="font-semibold uppercase tracking-wide text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Payment proof
                          </p>
                          <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-2">
                            <button
                              type="button"
                              onClick={() => setViewingPaymentProof({
                                imageBase64: request.paymentProofImageBase64!,
                                fileName: request.paymentProofFileName ?? undefined,
                              })}
                              className="group relative w-full overflow-hidden rounded border border-emerald-200 transition hover:border-emerald-400 hover:shadow-md"
                            >
                              <img
                                src={`data:image/jpeg;base64,${request.paymentProofImageBase64}`}
                                alt="Payment proof screenshot"
                                className="max-h-48 w-full object-cover transition group-hover:opacity-90"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/20 group-hover:opacity-100">
                                <Eye size={24} className="text-white" />
                              </div>
                            </button>
                            {request.paymentProofFileName ? (
                              <p className="mt-1 text-[10px] text-emerald-600">File: {request.paymentProofFileName}</p>
                            ) : null}
                            <p className="mt-1 text-[10px] text-emerald-500">Click to view full size</p>
                          </div>
                        </div>
                      ) : null}
                      <div className="space-y-1">
                        <p className="font-semibold uppercase tracking-wide text-slate-500">Schedule</p>
                        <p>{formatDate(request.startDate)} → {formatDate(request.endDate)}</p>
                        <p>Reviewed: {formatDateTime(request.reviewedAt ?? null)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold uppercase tracking-wide text-slate-500">Payment summary</p>
                        <p>Subtotal: {formatCurrency(request.summary.subtotal)}</p>
                        <p>Discount: {request.summary.discountPercent}% ({formatCurrency(request.summary.discountAmount)})</p>
                        {request.summary.couponCode ? (
                          <p>Coupon {request.summary.couponCode}: {formatCurrency(request.summary.couponDiscountAmount)}</p>
                        ) : null}
                        <p className="font-semibold text-slate-700">Total payable: {formatCurrency(request.summary.totalPayable)}</p>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <p className="font-semibold uppercase tracking-wide text-slate-500">Selections</p>
                        <div className="grid gap-2 md:grid-cols-2">
                          {request.selections.map((selection, selectionIndex) => (
                            <div
                              key={`${request.id ?? getTimestamp(request.createdAt)}-selection-${selectionIndex}`}
                              className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                            >
                              <span className="text-slate-700">{selection.mealType}</span>
                              <span className="text-slate-500">{selection.packageName}</span>
                              <span className="font-semibold text-slate-700">{formatCurrency(selection.totalPrice)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {request.notes ? (
                        <div className="space-y-1">
                          <p className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-500">
                            <NotebookPen className="h-3.5 w-3.5" />
                            Subscriber notes
                          </p>
                          <p className="whitespace-pre-wrap text-slate-600">{request.notes}</p>
                        </div>
                      ) : null}
                      {request.statusNote ? (
                        <div className="space-y-1">
                          <p className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-500">
                            <NotebookPen className="h-3.5 w-3.5" />
                            Reviewer note
                          </p>
                          <p className="whitespace-pre-wrap text-slate-600">{request.statusNote}</p>
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No subscription requests submitted yet.
            </div>
          )}
        </section>
      </div>
    </Dialog>

    <Dialog
      open={!!viewingPaymentProof}
      onClose={() => setViewingPaymentProof(null)}
      title="Payment Proof"
      description={viewingPaymentProof?.fileName ? `File: ${viewingPaymentProof.fileName}` : 'Screenshot of payment confirmation'}
      size="xl"
      footer={(
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setViewingPaymentProof(null)}
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            Close
          </button>
        </div>
      )}
    >
      {viewingPaymentProof ? (
        <div className="space-y-4">
          <img
            src={`data:image/jpeg;base64,${viewingPaymentProof.imageBase64}`}
            alt="Payment proof screenshot - full size"
            className="w-full rounded-lg border border-slate-200 shadow-sm"
          />
        </div>
      ) : null}
    </Dialog>
  </>
  );
};

export default ViewSubscriberDialog;
