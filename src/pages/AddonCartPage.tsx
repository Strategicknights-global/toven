import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAddonCartStore, type AddonCartItem } from '../stores/addonCartStore';
import { useToastStore } from '../stores/toastStore';
import { useUserRoleStore } from '../stores/userRoleStore';
import { useLoginModalStore } from '../stores/loginModalStore';
import { ROUTES } from '../AppRoutes';
import {
  getAddonDeliveryDate,
  getMinutesUntilCutoff,
  isAddonOrderWindowClosed,
} from '../utils/addonOrders';
import { useAddonRequestsStore } from '../stores/addonRequestsStore';
import { useSubscriptionRequestsStore } from '../stores/subscriptionRequestsStore';
import ConfirmDialog from '../components/ConfirmDialog';
import { resolveCutoffHour } from '../utils/timeWindow';
import { useConfigStore } from '../stores/configStore';

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const PLACEHOLDER_IMAGE = '/image1.webp';

const AddonCartPage: React.FC = () => {
  const itemsMap = useAddonCartStore((state) => state.items);
  const addOrUpdateItem = useAddonCartStore((state) => state.addOrUpdateItem);
  const removeItem = useAddonCartStore((state) => state.removeItem);
  const clearCart = useAddonCartStore((state) => state.clearCart);
  const totalItems = useAddonCartStore((state) => state.totalQuantity());
  const totalCoins = useAddonCartStore((state) => state.totalCoins());
  const totalDiscountCoins = useAddonCartStore((state) => state.totalDiscountCoins());
  const clearCartAndSetLastOrder = useAddonCartStore((state) => state.clearCartAndSetLastOrder);
  const lastOrder = useAddonCartStore((state) => state.lastOrder);
  const addToast = useToastStore((state) => state.addToast);
  const user = useUserRoleStore((state) => state.user);
  const openLoginModal = useLoginModalStore((state) => state.open);
  const { createRequest } = useAddonRequestsStore();
  const { requests: subscriptionRequests, loadRequests: loadSubscriptionRequests } = useSubscriptionRequestsStore();
  const navigate = useNavigate();

  const config = useConfigStore((state) => state.config);
  const configLoading = useConfigStore((state) => state.loading);
  const configLoaded = useConfigStore((state) => state.loaded);
  const loadConfig = useConfigStore((state) => state.loadConfig);

  useEffect(() => {
    if (!configLoaded && !configLoading) {
      void loadConfig();
    }
  }, [configLoaded, configLoading, loadConfig]);

  const addonCutoffHour = useMemo(
    () => resolveCutoffHour(config?.addonOrderCutoffHour),
    [config?.addonOrderCutoffHour],
  );

  const addonCutoffTimeLabel = useMemo(() => {
    const period = addonCutoffHour >= 12 ? 'PM' : 'AM';
    const displayHour = addonCutoffHour % 12 === 0 ? 12 : addonCutoffHour % 12;
    return `${displayHour}:00 ${period}`;
  }, [addonCutoffHour]);

  const now = new Date();

  const cartItems = useMemo(() => Object.values(itemsMap), [itemsMap]);
  const isCartEmpty = cartItems.length === 0;
  const isCutoffPassed = isAddonOrderWindowClosed(now, { cutoffHour: addonCutoffHour });
  const minutesUntilCutoff = getMinutesUntilCutoff(now, { cutoffHour: addonCutoffHour });
  const baseDeliveryDate = useMemo(() => {
    const date = getAddonDeliveryDate(new Date(), { cutoffHour: addonCutoffHour });
    date.setHours(0, 0, 0, 0);
    return date;
  }, [addonCutoffHour]);

  const normalizeDate = (value?: Date | null): Date | null => {
    if (!value) {
      return null;
    }
    const date = value instanceof Date ? new Date(value) : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    date.setHours(0, 0, 0, 0);
    return date;
  };
  
  // Get the earliest delivery date from active subscriptions that can serve the base delivery date
  const earliestSubscriptionDeliveryDate = useMemo(() => {
    if (!user) {
      return null;
    }

    let bestDate: Date | null = null;

    subscriptionRequests.forEach((request) => {
      if (request.userId !== user.uid || request.status !== 'approved') {
        return;
      }
      const startDate = normalizeDate(request.startDate);
      const endDate = normalizeDate(request.endDate);
      if (!startDate || !endDate) {
        return;
      }
      if (endDate < baseDeliveryDate) {
        return; // subscription ends before earliest allowable delivery
      }

      const candidate = startDate > baseDeliveryDate ? startDate : new Date(baseDeliveryDate);
      if (candidate > endDate) {
        return; // base date not within subscription window
      }

      if (!bestDate || candidate < bestDate) {
        bestDate = candidate;
      }
    });

    return bestDate;
  }, [baseDeliveryDate, subscriptionRequests, user]);

  // Use the earliest subscription date if available, otherwise use the addon calculation
  const deliveryDateKey = useMemo(() => {
    const targetDate = earliestSubscriptionDeliveryDate ?? baseDeliveryDate;
    return formatDateKey(targetDate);
  }, [earliestSubscriptionDeliveryDate, baseDeliveryDate]);

  const deliveryLabel = useMemo(() => {
    const deliveryDate = earliestSubscriptionDeliveryDate ?? baseDeliveryDate;
    return deliveryDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, [earliestSubscriptionDeliveryDate, baseDeliveryDate]);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmationLoading, setConfirmationLoading] = useState(false);

  const handleQuantityChange = useCallback(
    (item: AddonCartItem, delta: number) => {
      const nextQuantity = Math.max(0, item.quantity + delta);
      if (nextQuantity === 0) {
        removeItem(item.id);
        return;
      }
      addOrUpdateItem(item, nextQuantity);
    },
    [addOrUpdateItem, removeItem],
  );

  const validateOrderReadiness = useCallback(async () => {
    if (!user) {
      openLoginModal(ROUTES.ADDONS_CART);
      addToast('Log in to place add-on orders.', 'info');
      return false;
    }

    if (isCartEmpty) {
      addToast('Your add-on cart is empty.', 'info');
      return false;
    }

    const currentUser = user;

    let activeRequests = subscriptionRequests;
    if (activeRequests.length === 0) {
      await loadSubscriptionRequests();
      activeRequests = useSubscriptionRequestsStore.getState().requests;
    }

    const hasActiveSubscription = activeRequests.some((request) => {
      if (request.userId !== currentUser.uid || request.status !== 'approved') {
        return false;
      }
      const startDate = normalizeDate(request.startDate);
      const endDate = normalizeDate(request.endDate);
      if (!startDate || !endDate) {
        return false;
      }
      const start = formatDateKey(startDate);
      const end = formatDateKey(endDate);
      // Check if delivery date falls within subscription window AND subscription hasn't ended
      const nowDate = new Date();
      nowDate.setHours(0, 0, 0, 0);
      if (endDate < nowDate) {
        return false; // Subscription has ended
      }
      return deliveryDateKey >= start && deliveryDateKey <= end;
    });

    if (!hasActiveSubscription) {
      addToast('You need an active subscription for this delivery date to order add-ons.', 'warning');
      return false;
    }

    return true;
  }, [addToast, deliveryDateKey, isCartEmpty, loadSubscriptionRequests, openLoginModal, subscriptionRequests, user]);

  const handleCheckoutClick = useCallback(async () => {
    const ready = await validateOrderReadiness();
    if (ready) {
      setConfirmationOpen(true);
    }
  }, [validateOrderReadiness]);

  const handleConfirmOrder = useCallback(async () => {
    setConfirmationLoading(true);

    const stillReady = await validateOrderReadiness();
    if (!stillReady) {
      setConfirmationLoading(false);
      setConfirmationOpen(false);
      return;
    }

    if (!user) {
      setConfirmationLoading(false);
      setConfirmationOpen(false);
      return;
    }

    const currentUser = user;

    const now = new Date();
    const summary = {
      totalQuantity: totalItems,
      totalCoins,
      totalDiscountCoins,
    };
    try {
      const created = await createRequest({
        userId: currentUser.uid,
        userName: currentUser.displayName ?? currentUser.email ?? 'Customer',
        userEmail: currentUser.email ?? null,
        userPhone: currentUser.phoneNumber ?? null,
        deliveryDateKey,
        deliveryDate: new Date(deliveryDateKey + 'T00:00:00'),
        items: cartItems.map((item) => ({
          addonId: item.id,
          addonName: item.name,
          category: item.category,
          mealType: item.mealType,
          quantity: item.quantity,
          coinsPerUnit: item.coins,
          discountCoinsPerUnit: item.discountCoins,
        })),
        summary,
      });

      if (!created) {
        setConfirmationLoading(false);
        return;
      }

      clearCartAndSetLastOrder({
        orderId: created.id,
        placedAt: now.toISOString(),
        deliveryDate: deliveryDateKey,
        totalQuantity: summary.totalQuantity,
        totalCoins: summary.totalCoins,
        items: cartItems,
      });

      const deliveryDateInstance = new Date(deliveryDateKey + 'T00:00:00');
      const deliveryDateLabel = deliveryDateInstance.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });

      addToast(`Add-on request submitted! Delivery scheduled for ${deliveryDateLabel}.`, 'success');
      setConfirmationOpen(false);
      navigate(ROUTES.ADMIN_ADDON_REQUESTS);
    } catch (error) {
      console.error('Failed to place addon request', error);
      addToast('Failed to place add-on order. Please try again.', 'error');
    } finally {
      setConfirmationLoading(false);
    }
  }, [addToast, cartItems, clearCartAndSetLastOrder, createRequest, deliveryDateKey, navigate, totalCoins, totalDiscountCoins, totalItems, user, validateOrderReadiness]);

  const handleCancelConfirmation = useCallback(() => {
    if (confirmationLoading) {
      return;
    }
    setConfirmationOpen(false);
  }, [confirmationLoading]);

  const handleClearCart = useCallback(() => {
    clearCart();
    addToast('Add-on cart cleared.', 'info');
  }, [addToast, clearCart]);

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <section className="space-y-10">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-semibold text-slate-900">Your add-on cart</h1>
              <p className="text-sm text-slate-500">
                Review the extras you&apos;ve handpicked. Orders placed now are scheduled for {deliveryLabel}. Place your order before{' '}
                <span className="font-semibold">{addonCutoffTimeLabel}</span> to keep next-day delivery—after that we automatically shift to the following delivery day.
              </p>
              {isCutoffPassed ? (
                <p className="text-sm font-medium text-amber-600">
                  You&apos;re past today&apos;s cutoff—orders placed now will arrive on {deliveryLabel}.
                </p>
              ) : (
                <p className="text-xs uppercase tracking-wide text-emerald-600">
                  {minutesUntilCutoff} minute{minutesUntilCutoff === 1 ? '' : 's'} left before new orders move to the following delivery day.
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Link
                to={ROUTES.ADDONS}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                Add more add-ons
              </Link>
              {!isCartEmpty && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-500 transition hover:border-rose-300 hover:text-rose-600"
                >
                  Clear cart
                </button>
              )}
            </div>
          </header>

          {isCartEmpty ? (
            <div className="mt-16 flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 py-20 text-center">
              <span className="text-xl font-semibold text-slate-700">Your add-on cart is empty</span>
              <p className="max-w-md text-sm text-slate-500">
                Start by browsing the add-on library. Save your favourites before {addonCutoffTimeLabel} to secure tomorrow&apos;s delivery slot.
              </p>
              <Link
                to={ROUTES.ADDONS}
                className="rounded-full bg-slate-900 px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-800"
              >
                Browse add-ons
              </Link>
            </div>
          ) : (
            <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="flex flex-col gap-6">
                {cartItems.map((item) => (
                  <article
                    key={item.id}
                    className="flex gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  >
                    <div className="relative h-36 w-36 flex-shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                      <img
                        src={item.image || PLACEHOLDER_IMAGE}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                          <h2 className="text-lg font-semibold text-slate-900">{item.name}</h2>
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                            <span className={item.category === 'Veg' ? 'rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700' : 'rounded-full bg-rose-100 px-2.5 py-1 text-rose-700'}>
                              {item.category}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{item.mealType}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-xs font-semibold uppercase tracking-wide text-rose-500 transition hover:text-rose-600"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item, -1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900"
                          >
                            −
                          </button>
                          <span className="min-w-[2rem] text-center text-sm font-semibold text-slate-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item, 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-sm text-slate-500">
                          <span className="font-semibold text-slate-900">{item.coins * item.quantity}</span>{' '}
                          coins · Earns <span className="font-semibold text-emerald-600">{item.discountCoins * item.quantity}</span> bonus coins
                        </div>
                      </div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Added on {new Date(item.addedAt).toLocaleString()}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
              <aside className="sticky top-28 h-max rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-lg font-semibold text-slate-900">Checkout summary</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Total items</span>
                    <span className="font-semibold text-slate-900">{totalItems}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total coins</span>
                    <span className="font-semibold text-slate-900">{totalCoins}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Bonus coins</span>
                    <span className="font-semibold text-emerald-600">+{totalDiscountCoins}</span>
                  </div>
                </div>
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                  This order is scheduled for {deliveryLabel}. Place it before {addonCutoffTimeLabel} to keep next-day delivery—after that we&apos;ll roll it to the following slot automatically.
                </div>
                <button
                  type="button"
                  onClick={handleCheckoutClick}
                  disabled={isCartEmpty}
                  className={`mt-6 w-full rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-wide transition ${
                    isCartEmpty
                      ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  Place add-on order for {deliveryLabel}
                </button>
                <p className="mt-3 text-[11px] text-slate-400">
                  You&apos;ll receive a confirmation email once our kitchen locks in the menu. Payment is processed with your primary subscription method.
                </p>

                {lastOrder && (
                  <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
                    <p className="font-semibold">Last order snapshot</p>
                    <p>#{lastOrder.orderId}</p>
                    <p>
                      {lastOrder.totalQuantity} item{lastOrder.totalQuantity === 1 ? '' : 's'} · delivering on {new Date(lastOrder.deliveryDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </aside>
            </div>
          )}
        </section>
      </div>
      <ConfirmDialog
        open={confirmationOpen}
        onCancel={handleCancelConfirmation}
        onConfirm={handleConfirmOrder}
        loading={confirmationLoading}
        title="Confirm add-on order"
        confirmLabel="Place order"
        cancelLabel="Go back"
        description={(
          <div className="space-y-2 text-sm text-slate-600">
            <p>
              Delivery scheduled for <span className="font-semibold text-slate-900">{deliveryLabel}</span>.
            </p>
            <p className="text-xs text-slate-500">
              {totalItems} item{totalItems === 1 ? '' : 's'} · {totalCoins} coins · +{totalDiscountCoins} bonus coins
            </p>
          </div>
        )}
      />
    </div>
  );
};

export default AddonCartPage;
