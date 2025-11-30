import React from 'react';
import Dialog from './Dialog';
import {
  CalendarDays,
  ClipboardList,
  Mail,
  NotebookPen,
  Phone,
  User,
  UtensilsCrossed,
} from 'lucide-react';
import type { MealType } from '../schemas/FoodItemSchema';
import type { SubscriptionRequestSchema } from '../schemas/SubscriptionRequestSchema';

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

const formatCurrency = (amount: number | null | undefined): string => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return '₹0';
  }
  const rounded = Math.round(amount);
  return `₹${rounded.toLocaleString('en-IN')}`;
};

export interface OrderMenuItem {
  id: string;
  name: string;
  quantity: number;
}

export interface OrderDetailData {
  orderDate: Date;
  dateLabel: string;
  mealType: MealType;
  mealPlan: string;
  menuPlanned: boolean;
  addOns: string;
  customer: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    dietPreference: SubscriptionRequestSchema['dietPreference'];
  };
  subscription?: SubscriptionRequestSchema;
  menuItems: OrderMenuItem[];
}

interface OrderDetailDialogProps {
  open: boolean;
  detail: OrderDetailData | null;
  onClose: () => void;
}

const OrderDetailDialog: React.FC<OrderDetailDialogProps> = ({ open, detail, onClose }) => {
  if (!open || !detail) {
    return null;
  }

  const { subscription } = detail;
  const dietLabel = detail.customer.dietPreference === 'pure-veg' ? 'Pure Veg' : 'Mixed';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Order details"
      description={`Complete view of ${detail.mealType} orders for ${detail.dateLabel}.`}
      size="xl"
      footer={
        <div className="flex w-full items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ClipboardList className="h-4 w-4 text-slate-400" />
            <span>
              {detail.menuItems.length} menu item{detail.menuItems.length === 1 ? '' : 's'} listed • Diet preference: {dietLabel}
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
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <CalendarDays className="h-4 w-4 text-purple-500" />
              Service window
            </h3>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p className="text-lg font-semibold text-slate-900">{detail.dateLabel}</p>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-purple-600">
                <UtensilsCrossed className="h-3.5 w-3.5" />
                {detail.mealType}
              </p>
              {detail.menuPlanned ? (
                <span className="inline-flex w-fit items-center rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                  Menu confirmed
                </span>
              ) : (
                <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700">
                  Menu pending
                </span>
              )}
              <p className="text-xs text-slate-500">Add-ons: {detail.addOns || '—'}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <User className="h-4 w-4 text-purple-500" />
              Customer
            </h3>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p className="text-lg font-semibold text-slate-900">{detail.customer.name}</p>
              <div className="grid gap-1 text-xs text-slate-500">
                <span>ID: {detail.customer.id || '—'}</span>
                {detail.customer.phone ? (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {detail.customer.phone}
                  </span>
                ) : null}
                {detail.customer.email ? (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {detail.customer.email}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  Diet: {dietLabel}
                </span>
              </div>
            </div>
          </div>
        </section>

        {subscription ? (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <NotebookPen className="h-4 w-4 text-purple-500" />
              Subscription overview
            </h3>
            <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
              <div className="space-y-1">
                <p className="font-semibold text-slate-900">{subscription.categoryName}</p>
                <p className="text-xs text-slate-500">
                  {formatDate(subscription.startDate)} → {formatDate(subscription.endDate)} ({subscription.durationDays} days)
                </p>
                <p className="text-xs text-slate-500">Status: {subscription.status}</p>
              </div>
              <div className="space-y-1 text-xs text-slate-500">
                <p>Subtotal: {formatCurrency(subscription.summary.subtotal)}</p>
                <p>
                  Discount: {subscription.summary.discountPercent}% ({formatCurrency(subscription.summary.discountAmount)})
                </p>
                <p className="font-semibold text-slate-700">Total payable: {formatCurrency(subscription.summary.totalPayable)}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Meal selections</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {subscription.selections.map((selection, index) => (
                  <div
                    key={`${subscription.id ?? subscription.userId}-selection-${index}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600"
                  >
                    <span className="font-semibold text-slate-700">{selection.mealType}</span>
                    <span>{selection.packageName}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <UtensilsCrossed className="h-4 w-4 text-purple-500" />
            Menu items for the day
          </h3>
          {detail.menuItems.length ? (
            <ul className="mt-3 space-y-2">
              {detail.menuItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                >
                  <span>{item.name}</span>
                  <span className="font-semibold text-slate-900">×{item.quantity}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              No menu has been configured for this date yet.
            </div>
          )}
        </section>

        {subscription?.notes ? (
          <section className="rounded-xl border border-purple-200 bg-purple-50/70 p-4 text-sm text-purple-700">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
              <NotebookPen className="h-4 w-4" />
              Subscriber notes
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-purple-800">{subscription.notes}</p>
          </section>
        ) : null}

        {subscription?.statusNote ? (
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <NotebookPen className="h-4 w-4" />
              Reviewer note
            </h3>
            <p className="mt-2 whitespace-pre-wrap">{subscription.statusNote}</p>
          </section>
        ) : null}
      </div>
    </Dialog>
  );
};

export default OrderDetailDialog;
