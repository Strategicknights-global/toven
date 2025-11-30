import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  IndianRupee,
  Layers,
  Loader2,
  MapPin,
  UserPlus,
  UtensilsCrossed,
} from 'lucide-react';
import Dialog from './Dialog';
import type { UserSchema } from '../schemas/UserSchema';
import type { MealType } from '../schemas/FoodItemSchema';
import type { PackageSchema } from '../schemas/PackageSchema';
import { useCategoriesStore } from '../stores/categoriesStore';
import { usePackagesStore } from '../stores/packagesStore';
import { useDayDiscountsStore } from '../stores/dayDiscountsStore';
import { useSubscriptionRequestsStore } from '../stores/subscriptionRequestsStore';
import type { SubscriptionRequestSelection } from '../schemas/SubscriptionRequestSchema';
import type { DayDiscountSchema } from '../schemas/DayDiscountSchema';
import { useUsersStore } from '../stores/usersStore';
import { UserDeliveryLocationModel } from '../firestore';
import type { UserDeliveryLocationSchema } from '../schemas/UserDeliveryLocationSchema';

interface AddSubscriptionDialogProps {
  open: boolean;
  subscriber: UserSchema | null;
  onClose: () => void;
}

const MEAL_TYPE_ORDER: MealType[] = ['Breakfast', 'Lunch', 'Dinner'];

const formatCurrency = (value: number): string => {
  const rounded = Math.round(value);
  return `₹${rounded.toLocaleString('en-IN')}`;
};

const formatInputDate = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseInputDate = (value: string): Date | null => {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  const result = new Date(year, month - 1, day);
  if (Number.isNaN(result.getTime())) {
    return null;
  }
  result.setHours(0, 0, 0, 0);
  return result;
};

const getDefaultStartDate = (): Date => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 1);
  return date;
};

const AddSubscriptionDialog: React.FC<AddSubscriptionDialogProps> = ({
  open,
  subscriber,
  onClose,
}) => {
  const formId = useId();
  const { categories, loadCategories, loading: categoriesLoading } = useCategoriesStore();
  const { packages, loadPackages, loading: packagesLoading } = usePackagesStore();
  const { discounts: dayDiscounts, loadDiscounts, loading: discountsLoading } = useDayDiscountsStore();
  const createRequest = useSubscriptionRequestsStore((state) => state.createRequest);
  const submitting = useSubscriptionRequestsStore((state) => state.submitting);
  const users = useUsersStore((state) => state.users);
  const usersLoading = useUsersStore((state) => state.loading);
  const paginatedData = useUsersStore((state) => state.paginatedData);

  const [categoryId, setCategoryId] = useState<string>('');
  const [dietPreference, setDietPreference] = useState<'mixed' | 'pure-veg'>('mixed');
  const [durationDays, setDurationDays] = useState<number>(0);
  const [startDateInput, setStartDateInput] = useState<string>(() => formatInputDate(getDefaultStartDate()));
  const [selectedPackages, setSelectedPackages] = useState<Partial<Record<MealType, string>>>({});
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedSubscriberId, setSelectedSubscriberId] = useState<string>('');
  const [deliveryLocations, setDeliveryLocations] = useState<UserDeliveryLocationSchema[]>([]);
  const [deliveryLocationsLoading, setDeliveryLocationsLoading] = useState(false);
  const [selectedDeliveryLocationId, setSelectedDeliveryLocationId] = useState<string>('');

  const loading = categoriesLoading || packagesLoading || discountsLoading;
  const sortedUsers = useMemo(() => {
    const list = [...users];
    list.sort((a, b) => {
      const aName = (a.fullName || a.email || '').toLowerCase();
      const bName = (b.fullName || b.email || '').toLowerCase();
      return aName.localeCompare(bName);
    });
    return list;
  }, [users]);

  const selectedSubscriber = useMemo(() => {
    if (subscriber) {
      return subscriber;
    }
    if (!selectedSubscriberId) {
      return null;
    }
    return users.find((user) => user.id === selectedSubscriberId) ?? null;
  }, [subscriber, selectedSubscriberId, users]);

  const displayedUsers = useMemo(() => {
    if (subscriber) {
      return [] as UserSchema[];
    }
    const list = sortedUsers.filter((user) => Boolean(user.id));
    const seen = new Set<string>();
    return list.filter((user) => {
      if (!user.id) {
        return false;
      }
      if (seen.has(user.id)) {
        return false;
      }
      seen.add(user.id);
      return true;
    });
  }, [sortedUsers, subscriber]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const target = selectedSubscriber;
    if (!target?.id) {
      setDeliveryLocations([]);
      setSelectedDeliveryLocationId('');
      setDeliveryLocationsLoading(false);
      return;
    }

    let cancelled = false;
    setDeliveryLocationsLoading(true);
    (async () => {
      try {
        const locations = await UserDeliveryLocationModel.findByUserId(target.id!);
        if (cancelled) {
          return;
        }
        setDeliveryLocations(locations);
        setSelectedDeliveryLocationId((prev) => {
          if (prev && locations.some((location) => location.id === prev)) {
            return prev;
          }
          const preferred = locations.find((location) => location.isDefault) ?? locations[0] ?? null;
          return preferred?.id ?? '';
        });
      } catch (error) {
        console.error('Failed to load delivery locations for subscriber', error);
        if (!cancelled) {
          setDeliveryLocations([]);
          setSelectedDeliveryLocationId('');
        }
      } finally {
        if (!cancelled) {
          setDeliveryLocationsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, selectedSubscriber]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!categories.length && !categoriesLoading) {
      void loadCategories();
    }
    if (!packages.length && !packagesLoading) {
      void loadPackages();
    }
    if (!dayDiscounts.length && !discountsLoading) {
      void loadDiscounts();
    }
  }, [open, categories.length, categoriesLoading, dayDiscounts.length, discountsLoading, loadCategories, loadDiscounts, loadPackages, packages.length, packagesLoading]);

  useEffect(() => {
    if (open && !subscriber && !users.length && !usersLoading) {
      void paginatedData({ pageNumber: 1, pageSize: 100 });
    }
  }, [open, subscriber, paginatedData, users.length, usersLoading]);

  useEffect(() => {
    if (open) {
      setDietPreference('mixed');
      setNotes('');
      setFormError(null);
      setSelectedPackages({});
      setStartDateInput(formatInputDate(getDefaultStartDate()));
      setDeliveryLocations([]);
      setSelectedDeliveryLocationId('');
      setDeliveryLocationsLoading(false);
      if (!subscriber) {
        setSelectedSubscriberId('');
      }
    } else {
      setCategoryId('');
      setDurationDays(0);
      setSelectedPackages({});
      setFormError(null);
      setSelectedSubscriberId('');
      setDeliveryLocations([]);
      setSelectedDeliveryLocationId('');
      setDeliveryLocationsLoading(false);
    }
  }, [open, subscriber]);

  const availableCategories = useMemo(() => categories.filter((category) => category.status === 'Available'), [categories]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!categoryId && availableCategories.length > 0) {
      setCategoryId(availableCategories[0].id);
    }
  }, [availableCategories, categoryId, open]);

  const discountsByDayCount = useMemo(() => {
    const map = new Map<number, DayDiscountSchema[]>();
    dayDiscounts.forEach((discount) => {
      const list = map.get(discount.dayCount) ?? [];
      list.push(discount);
      map.set(discount.dayCount, list);
    });
    return map;
  }, [dayDiscounts]);

  const durationOptions = useMemo(() => {
    const values = Array.from(discountsByDayCount.keys()).sort((a, b) => a - b);
    if (values.length === 0) {
      return [30];
    }
    return values;
  }, [discountsByDayCount]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (durationDays > 0) {
      return;
    }
    const preferred = durationOptions[0];
    if (preferred) {
      setDurationDays(preferred);
    }
  }, [durationDays, durationOptions, open]);

  const selectedCategory = useMemo(() => availableCategories.find((category) => category.id === categoryId) ?? null, [availableCategories, categoryId]);

  const packagesForCategory = useMemo(
    () => packages.filter((pkg) => pkg.categoryId === categoryId && pkg.status === 'Available'),
    [categoryId, packages],
  );

  const packagesByMealType = useMemo(() => {
    const map = new Map<MealType, PackageSchema[]>();
    packagesForCategory.forEach((pkg) => {
      const existing = map.get(pkg.mealType) ?? [];
      existing.push(pkg);
      map.set(pkg.mealType, existing);
    });
    map.forEach((list, mealType) => {
      list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      map.set(mealType, list);
    });
    return map;
  }, [packagesForCategory]);

  const availableMealTypes = useMemo(
    () => MEAL_TYPE_ORDER.filter((mealType) => packagesByMealType.has(mealType)),
    [packagesByMealType],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setSelectedPackages({});
  }, [categoryId, open]);

  const selectionEntries = useMemo(() => {
    if (!durationDays || durationDays <= 0) {
      return [] as { mealType: MealType; pkg: PackageSchema }[];
    }
    const entries: { mealType: MealType; pkg: PackageSchema }[] = [];
    availableMealTypes.forEach((mealType) => {
      const packageId = selectedPackages[mealType];
      if (!packageId) {
        return;
      }
      const pkg = (packagesByMealType.get(mealType) ?? []).find((item) => item.id === packageId);
      if (pkg) {
        entries.push({ mealType, pkg });
      }
    });
    return entries;
  }, [availableMealTypes, durationDays, packagesByMealType, selectedPackages]);

  const selectedPackageIds = useMemo(() => {
    return Object.values(selectedPackages).filter((id): id is string => Boolean(id));
  }, [selectedPackages]);

  const selectedDeliveryLocation = useMemo(() => {
    if (!selectedDeliveryLocationId) {
      return null;
    }
    return deliveryLocations.find((location) => location.id === selectedDeliveryLocationId) ?? null;
  }, [deliveryLocations, selectedDeliveryLocationId]);

  const formatDiscountSummary = useCallback((discount: DayDiscountSchema) => {
    if (discount.discountType === 'percentage') {
      const formatted = discount.discountValue.toFixed(2).replace(/\.00$/, '');
      return `${formatted}% off`;
    }
    const formatted = discount.discountValue
      .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      .replace(/\.00$/, '');
    return `₹${formatted} off`;
  }, []);

  const computeDiscountSavings = useCallback((discount: DayDiscountSchema, baseSubtotal: number) => {
    if (baseSubtotal <= 0) {
      return 0;
    }
    if (discount.discountType === 'percentage') {
      return Math.max(0, (baseSubtotal * discount.discountValue) / 100);
    }
    return Math.min(baseSubtotal, discount.discountValue);
  }, []);

  const isDiscountApplicable = useCallback((discount: DayDiscountSchema) => {
    if (discount.scope === 'all') {
      return true;
    }

    if (discount.scope === 'categories') {
      if (!categoryId) {
        return false;
      }
      return (discount.categoryIds ?? []).includes(categoryId);
    }

    if (discount.scope === 'packages') {
      if (selectedPackageIds.length === 0) {
        return false;
      }
      const applicablePackages = discount.packageIds ?? [];
      return selectedPackageIds.some((id) => applicablePackages.includes(id));
    }

    return false;
  }, [categoryId, selectedPackageIds]);

  const perDayTotal = useMemo(() => {
    if (selectionEntries.length === 0 || durationDays <= 0) {
      return 0;
    }
    return selectionEntries.reduce((sum, entry) => sum + entry.pkg.price, 0);
  }, [durationDays, selectionEntries]);

  const discountSummaryByDayCount = useMemo(() => {
    const map = new Map<number, string>();
    discountsByDayCount.forEach((list, dayCount) => {
      const applicable = list.filter(isDiscountApplicable);
      if (applicable.length === 0) {
        map.set(dayCount, '');
        return;
      }
      const estimatedSubtotal = perDayTotal > 0 ? perDayTotal * dayCount : 0;
      let best: DayDiscountSchema | null = null;
      let bestSavings = -Infinity;
      applicable.forEach((discount) => {
        const savings = estimatedSubtotal > 0 ? computeDiscountSavings(discount, estimatedSubtotal) : discount.discountValue;
        if (savings > bestSavings) {
          best = discount;
          bestSavings = savings;
        }
      });
      map.set(dayCount, best ? formatDiscountSummary(best) : '');
    });
    return map;
  }, [computeDiscountSavings, discountsByDayCount, formatDiscountSummary, isDiscountApplicable, perDayTotal]);

  const subtotal = useMemo(() => {
    if (!durationDays || durationDays <= 0) {
      return 0;
    }
    return selectionEntries.reduce((sum, entry) => sum + entry.pkg.price * durationDays, 0);
  }, [durationDays, selectionEntries]);

  const activeDiscount = useMemo(() => {
    if (!durationDays) {
      return null;
    }
    const options = discountsByDayCount.get(durationDays) ?? [];
    const applicable = options.filter(isDiscountApplicable);
    if (applicable.length === 0) {
      return null;
    }
    let best: DayDiscountSchema | null = null;
    let bestScore = -Infinity;
    applicable.forEach((discount) => {
      const score = subtotal > 0
        ? computeDiscountSavings(discount, subtotal)
        : discount.discountValue;
      if (score > bestScore) {
        best = discount;
        bestScore = score;
      }
    });
    return best;
  }, [computeDiscountSavings, discountsByDayCount, durationDays, isDiscountApplicable, subtotal]);

  const discountAmount = activeDiscount ? computeDiscountSavings(activeDiscount, subtotal) : 0;
  const effectiveDiscountPercent = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
  const totalPayable = Math.max(0, subtotal - discountAmount);

  const startDate = useMemo(() => parseInputDate(startDateInput), [startDateInput]);
  const endDate = useMemo(() => {
    if (!startDate || !durationDays || durationDays <= 0) {
      return null;
    }
    const value = new Date(startDate);
    value.setDate(value.getDate() + durationDays - 1);
    return value;
  }, [durationDays, startDate]);

  const hasSelectedDeliveryLocation = deliveryLocations.length === 0 || Boolean(selectedDeliveryLocationId);

  const canSubmit = Boolean(
    selectedSubscriber
    && selectedCategory
    && startDate
    && endDate
    && durationDays > 0
    && selectionEntries.length > 0
    && !loading
    && !submitting
    && !deliveryLocationsLoading
    && hasSelectedDeliveryLocation,
  );

  const handleSelectPackage = (mealType: MealType, packageId: string) => {
    setSelectedPackages((prev) => {
      const next = { ...prev };
      if (!packageId) {
        delete next[mealType];
      } else {
        next[mealType] = packageId;
      }
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const targetSubscriber = selectedSubscriber;

    if (!targetSubscriber || !targetSubscriber.id) {
      setFormError('Select a subscriber to continue.');
      return;
    }
    if (!selectedCategory) {
      setFormError('Select a category to continue.');
      return;
    }
    if (!startDate || !endDate) {
      setFormError('Select a valid start date and duration.');
      return;
    }
    if (durationDays <= 0) {
      setFormError('Duration must be greater than zero.');
      return;
    }
    if (selectionEntries.length === 0) {
      setFormError('Pick at least one meal package.');
      return;
    }

    if (deliveryLocationsLoading) {
      setFormError('Delivery locations are still loading. Please wait a moment.');
      return;
    }
    if (deliveryLocations.length > 0 && !selectedDeliveryLocation) {
      setFormError('Select a delivery location to continue.');
      return;
    }

    setFormError(null);

    const selectionPayload: SubscriptionRequestSelection[] = selectionEntries.map(({ mealType, pkg }) => ({
      mealType,
      packageId: pkg.id,
      packageName: pkg.name,
      pricePerDay: pkg.price,
      totalPrice: pkg.price * durationDays,
    }));

    try {
      await createRequest({
        userId: targetSubscriber.id,
        userName: targetSubscriber.fullName ?? targetSubscriber.email ?? 'Subscriber',
        userEmail: targetSubscriber.email ?? null,
        userPhone: targetSubscriber.phone ?? null,
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        dietPreference,
        durationDays,
        startDate,
        endDate,
        selections: selectionPayload,
        deliveryLocationId: selectedDeliveryLocation?.id ?? null,
        deliveryLocationName: selectedDeliveryLocation?.locationName ?? null,
        deliveryLocationAddress: selectedDeliveryLocation?.address ?? null,
        deliveryLocationCoordinates: selectedDeliveryLocation?.coordinates ?? null,
        deliveryLocationLandmark: selectedDeliveryLocation?.landmark ?? null,
        deliveryLocationContactName: selectedDeliveryLocation?.contactName ?? null,
        deliveryLocationContactPhone: selectedDeliveryLocation?.contactPhone ?? null,
        summary: {
          durationDays,
          subtotal,
          discountPercent: Number.isFinite(effectiveDiscountPercent)
            ? Math.max(0, Math.round(effectiveDiscountPercent * 100) / 100)
            : 0,
          discountAmount,
          couponCode: null,
          couponDiscountAmount: 0,
          totalPayable,
        },
        notes: notes.trim() ? notes.trim() : undefined,
      });
      onClose();
    } catch (error) {
      console.error('Failed to create subscription request', error);
      setFormError('Could not submit subscription. Please try again.');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
  title={subscriber ? `Add subscription for ${subscriber.fullName ?? subscriber.email ?? 'subscriber'}` : 'Add subscription'}
  description={subscriber ? 'Configure a meal plan and submit it for review. Newly created subscriptions enter the approval queue.' : 'Pick an existing subscriber, configure a meal plan, and submit it for review.'}
      size="xl"
      footer={(
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {formError ? (
              <span className="inline-flex items-center gap-1 text-red-600">
                <AlertCircle className="h-4 w-4" />
                {formError}
              </span>
            ) : (
              <span>Requests are created as pending and can be approved from the review queue.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              form={formId}
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>{submitting ? 'Submitting…' : 'Submit subscription'}</span>
            </button>
          </div>
        </div>
      )}
    >
      <form id={formId} className="space-y-6" onSubmit={handleSubmit}>
        {!subscriber ? (
          <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="add-subscription-subscriber">
                <span className="inline-flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-purple-500" /> Subscriber
                </span>
              </label>
              <select
                id="add-subscription-subscriber"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                value={selectedSubscriberId}
                onChange={(event) => setSelectedSubscriberId(event.target.value)}
                disabled={usersLoading && !users.length}
              >
                <option value="">Select a subscriber</option>
                {displayedUsers.map((user) => (
                  <option key={user.id} value={user.id ?? ''}>
                    {(user.fullName || user.email || 'Subscriber')}
                  </option>
                ))}
              </select>
              {usersLoading && !users.length ? (
                <p className="text-xs text-slate-400">Loading users…</p>
              ) : displayedUsers.length === 0 ? (
                <p className="text-xs text-slate-400">No subscribers available. Add users to create subscriptions.</p>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <UserPlus className="h-4 w-4 text-purple-500" /> Subscriber
            </h3>
            <div className="mt-2 space-y-1">
              <p className="text-base font-semibold text-slate-800">{subscriber.fullName}</p>
              <p className="text-xs text-slate-500">{subscriber.email}</p>
              {subscriber.phone ? (
                <p className="text-xs text-slate-500">{subscriber.phone}</p>
              ) : null}
            </div>
          </section>
        )}
        <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <MapPin className="h-4 w-4 text-purple-500" /> Delivery location
          </h3>
          {!selectedSubscriber?.id ? (
            <p className="mt-2 text-xs text-slate-400">Pick a subscriber to load saved delivery locations.</p>
          ) : deliveryLocationsLoading ? (
            <p className="mt-2 text-xs text-slate-400">Loading delivery locations…</p>
          ) : deliveryLocations.length === 0 ? (
            <div className="mt-3 rounded-md border border-dashed border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
              No delivery locations found for this subscriber. Ask them to add one from their profile before fulfilment.
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="add-subscription-delivery-location">
                  Choose delivery location
                </label>
                <select
                  id="add-subscription-delivery-location"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  value={selectedDeliveryLocationId}
                  onChange={(event) => setSelectedDeliveryLocationId(event.target.value)}
                  disabled={deliveryLocationsLoading}
                >
                  <option value="">Select location</option>
                  {deliveryLocations.map((location) => (
                    <option key={location.id} value={location.id ?? ''}>
                      {location.locationName} {location.isDefault ? '• Default' : ''}
                    </option>
                  ))}
                </select>
              </div>
              {selectedDeliveryLocation ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  <p className="text-sm font-semibold text-slate-800">{selectedDeliveryLocation.locationName}</p>
                  <p className="mt-1 whitespace-pre-wrap text-slate-600">{selectedDeliveryLocation.address}</p>
                  {selectedDeliveryLocation.landmark ? (
                    <p className="mt-1 text-slate-500">Landmark: {selectedDeliveryLocation.landmark}</p>
                  ) : null}
                  {(selectedDeliveryLocation.contactName || selectedDeliveryLocation.contactPhone) ? (
                    <p className="mt-1 text-slate-500">
                      Contact: {selectedDeliveryLocation.contactName ? `${selectedDeliveryLocation.contactName}` : '—'}
                      {selectedDeliveryLocation.contactPhone ? ` • ${selectedDeliveryLocation.contactPhone}` : ''}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-amber-600">Select a delivery location to continue.</p>
              )}
            </div>
          )}
        </section>
        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <div className="space-y-2 text-sm text-slate-600">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <Layers className="h-4 w-4 text-purple-500" /> Plan basics
            </h3>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="add-subscription-category">
              Category
            </label>
            <select
              id="add-subscription-category"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              disabled={loading}
            >
              <option value="">Select a category</option>
              {availableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Diet preference</p>
              <div className="mt-2 flex gap-2">
                {(['mixed', 'pure-veg'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDietPreference(value)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                      dietPreference === value
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {value === 'mixed' ? 'Mixed' : 'Pure Veg'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-2 text-sm text-slate-600">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <CalendarClock className="h-4 w-4 text-purple-500" /> Schedule
            </h3>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="add-subscription-start-date">
              Start date
            </label>
            <input
              id="add-subscription-start-date"
              type="date"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              value={startDateInput}
              onChange={(event) => setStartDateInput(event.target.value)}
              disabled={loading}
              min={formatInputDate(getDefaultStartDate())}
            />
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="add-subscription-duration">
              Duration (days)
            </label>
            <select
              id="add-subscription-duration"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              value={durationDays || ''}
              onChange={(event) => setDurationDays(Number(event.target.value) || 0)}
              disabled={loading}
            >
              <option value="">Select duration</option>
              {durationOptions.map((dayCount) => (
                <option key={dayCount} value={dayCount}>
                  {dayCount} days {discountSummaryByDayCount.get(dayCount) ? `• ${discountSummaryByDayCount.get(dayCount)}` : ''}
                </option>
              ))}
            </select>
            {endDate ? (
              <p className="text-xs text-slate-500">Ends on {endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            ) : null}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <UtensilsCrossed className="h-4 w-4 text-purple-500" /> Meal selections
          </h3>
          {availableMealTypes.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No available packages for this category yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {availableMealTypes.map((mealType) => {
                const mealPackages = packagesByMealType.get(mealType) ?? [];
                return (
                  <div key={mealType} className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm font-semibold text-slate-700">{mealType}</p>
                    <select
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                      value={selectedPackages[mealType] ?? ''}
                      onChange={(event) => handleSelectPackage(mealType, event.target.value)}
                      disabled={loading}
                    >
                      <option value="">Select package</option>
                      {mealPackages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} • {formatCurrency(pkg.price)} / day
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <IndianRupee className="h-4 w-4 text-purple-500" /> Pricing summary
          </h3>
          <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            <div className="flex items-center justify-between text-sm">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Duration</span>
              <span className="text-slate-500">{durationDays > 0 ? `${durationDays} days` : '—'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Plan discount</span>
              <span className="text-slate-500">
                {activeDiscount ? (
                  <>
                    {formatDiscountSummary(activeDiscount)}
                    {discountAmount > 0 ? ` (${formatCurrency(Math.round(discountAmount))})` : ''}
                  </>
                ) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between text-base font-semibold text-slate-900">
              <span>Total payable</span>
              <span>{formatCurrency(Math.round(totalPayable))}</span>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <label className="text-sm font-semibold text-slate-700" htmlFor="add-subscription-notes">Internal notes (optional)</label>
          <textarea
            id="add-subscription-notes"
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            placeholder="Add any special instructions for reviewers"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={loading}
          />
        </section>
      </form>
    </Dialog>
  );
};

export default AddSubscriptionDialog;
