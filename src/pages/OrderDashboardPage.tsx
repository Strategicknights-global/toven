import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Filter, Users, Phone, Eye } from 'lucide-react';
import { useSubscriptionRequestsStore } from '../stores/subscriptionRequestsStore';
import { usePackagesStore } from '../stores/packagesStore';
import { useFoodItemsStore } from '../stores/foodItemsStore';
import { UserModel } from '../firestore';
import type { MealType } from '../schemas/FoodItemSchema';
import type { SubscriptionRequestSchema, SubscriptionRequestSelection } from '../schemas/SubscriptionRequestSchema';
import type { UserSchema } from '../schemas/UserSchema';
import OrderDetailDialog, { type OrderDetailData, type OrderMenuItem } from '../components/OrderDetailDialog';
import { getDisplayCustomerId } from '../utils/customerDisplay';

const mealTypeOrder: Record<MealType, number> = {
  Breakfast: 1,
  Lunch: 2,
  Dinner: 3,
};

type MealFilterOption = {
  label: string;
  value: string;
  mealTypes: MealType[];
};

const MEAL_FILTER_OPTIONS: MealFilterOption[] = [
  { label: 'All Meals', value: 'all', mealTypes: ['Breakfast', 'Lunch', 'Dinner'] },
  { label: 'Breakfast', value: 'breakfast', mealTypes: ['Breakfast'] },
  { label: 'Breakfast & Lunch', value: 'breakfast_lunch', mealTypes: ['Breakfast', 'Lunch'] },
  { label: 'Lunch', value: 'lunch', mealTypes: ['Lunch'] },
  { label: 'Dinner', value: 'dinner', mealTypes: ['Dinner'] },
];

type DayOption = 'today' | 'tomorrow';

type OrderRow = {
  subscriptionId?: string;
  customerId: string;
  customerShortId: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  mealPlan: string;
  packageId?: string;
  mealType: MealType;
  dietPreference: SubscriptionRequestSchema['dietPreference'];
  addOns: string;
  menuPlanned: boolean;
  serviceDate: Date;
  serviceDateStr: string;
};

const normalizeDate = (input: Date): Date => {
  const base = new Date(input);
  base.setHours(0, 0, 0, 0);
  return base;
};

const OrderDashboardPage: React.FC = () => {
  const { requests, loading: loadingRequests, loadRequests } = useSubscriptionRequestsStore();
  const { packages, loading: loadingPackages, loadPackages } = usePackagesStore();
  const { items: foodItems, loading: loadingFoodItems, loadItems: loadFoodItems } = useFoodItemsStore();
  const [selectedDay, setSelectedDay] = useState<DayOption>('today');
  const [selectedMealFilter, setSelectedMealFilter] = useState<string>(MEAL_FILTER_OPTIONS[0].value);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<OrderDetailData | null>(null);
  const [usersMap, setUsersMap] = useState<Map<string, UserSchema>>(new Map());
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    void loadRequests();
    void loadPackages();
    void loadFoodItems();
  }, [loadFoodItems, loadPackages, loadRequests]);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const users = await UserModel.findAll();
        const map = new Map<string, UserSchema>();
        users.forEach((user) => {
          if (user.id) {
            map.set(user.id, user);
          }
        });
        setUsersMap(map);
      } catch (error) {
        console.error('Failed to load users for order dashboard:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    void fetchUsers();
  }, []);

  const targetDate = useMemo(() => {
    const today = normalizeDate(new Date());
    if (selectedDay === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }
    return today;
  }, [selectedDay]);

  const activeMealFilter = useMemo(
    () => MEAL_FILTER_OPTIONS.find((option) => option.value === selectedMealFilter) ?? MEAL_FILTER_OPTIONS[0],
    [selectedMealFilter],
  );

  const { rows, uniqueCustomerCount } = useMemo(() => {
    const selectedDateStr = targetDate.toISOString().split('T')[0];
    const allowedMealTypes = new Set<MealType>(activeMealFilter.mealTypes);

    const result: OrderRow[] = [];
    const customerIds = new Set<string>();

    const dateIsWithin = (sub: SubscriptionRequestSchema) => {
      const startStr = sub.startDate.toISOString().split('T')[0];
      const endStr = sub.endDate.toISOString().split('T')[0];
      return selectedDateStr >= startStr && selectedDateStr <= endStr;
    };

    requests.forEach((subscription) => {
      if (subscription.status !== 'approved') {
        return;
      }
      if (!dateIsWithin(subscription)) {
        return;
      }

      const activeSelections: SubscriptionRequestSelection[] = [];
      subscription.selections.forEach((selection: SubscriptionRequestSelection) => {
        const isPaused = subscription.pausedMeals?.some(
          (paused) => paused.date === selectedDateStr && paused.mealType === selection.mealType,
        );
        if (isPaused) {
          return;
        }
        activeSelections.push(selection);
      });

      if (activeMealFilter.value === 'breakfast_lunch') {
        const activeMealTypes = new Set(activeSelections.map((selection) => selection.mealType));
        if (!(activeMealTypes.has('Breakfast') && activeMealTypes.has('Lunch'))) {
          return;
        }
      }

      activeSelections.forEach((selection) => {
        if (!allowedMealTypes.has(selection.mealType)) {
          return;
        }

        const pkg = packages.find((pkgItem) => pkgItem.id === selection.packageId);
        const menuForDate = pkg?.dateMenus.find((menuEntry) => menuEntry.date === selectedDateStr);
        const serviceDate = new Date(targetDate);
        const user = usersMap.get(subscription.userId);
        const shortFromSubscription = typeof subscription.customerShortId === 'string' ? subscription.customerShortId.trim() : '';
        const shortFromUser = typeof user?.customerId === 'string' ? user.customerId.trim() : '';
        const customerShortId = shortFromSubscription || shortFromUser;

        result.push({
          subscriptionId: subscription.id,
          customerId: subscription.userId,
          customerShortId,
          customerName: subscription.userName || 'Unnamed Customer',
          customerEmail: subscription.userEmail,
          customerPhone: subscription.userPhone,
          mealPlan: selection.packageName || pkg?.name || 'Unnamed Plan',
          packageId: selection.packageId,
          mealType: selection.mealType,
          dietPreference: subscription.dietPreference,
          addOns: '—',
          menuPlanned: Boolean(menuForDate),
          serviceDate,
          serviceDateStr: selectedDateStr,
        });

        if (subscription.userId) {
          customerIds.add(subscription.userId);
        }
      });
    });

    result.sort((a, b) => {
      const mealOrderDiff = (mealTypeOrder[a.mealType] || 99) - (mealTypeOrder[b.mealType] || 99);
      if (mealOrderDiff !== 0) {
        return mealOrderDiff;
      }
      return a.customerName.localeCompare(b.customerName);
    });

    return { rows: result, uniqueCustomerCount: customerIds.size };
  }, [activeMealFilter, packages, requests, targetDate, usersMap]);

  const foodItemsMap = useMemo(() => {
    const map = new Map<string, string>();
    foodItems.forEach((item) => {
      map.set(item.id, item.name);
    });
    return map;
  }, [foodItems]);

  const serviceDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }),
    [],
  );

  const handleViewOrder = (row: OrderRow) => {
    const subscription = row.subscriptionId
      ? requests.find((request) => request.id === row.subscriptionId)
      : undefined;
    const pkg = row.packageId ? packages.find((pkgItem) => pkgItem.id === row.packageId) : undefined;
    const menuEntry = pkg?.dateMenus.find((menu) => menu.date === row.serviceDateStr);
    const menuItems: OrderMenuItem[] = menuEntry
      ? (menuEntry.foodItemIds ?? []).map((foodItemId) => {
          const name = foodItemsMap.get(foodItemId) ?? foodItemId;
          const quantity = menuEntry.foodItemQuantities?.[foodItemId] ?? 1;
          return { id: foodItemId, name, quantity };
        })
      : [];

    const detail: OrderDetailData = {
      orderDate: row.serviceDate,
      dateLabel: serviceDateFormatter.format(row.serviceDate),
      mealType: row.mealType,
      mealPlan: row.mealPlan,
      menuPlanned: row.menuPlanned,
      addOns: row.addOns,
      customer: {
      id: row.customerId,
        name: row.customerName,
        phone: row.customerPhone,
        email: row.customerEmail ?? subscription?.userEmail ?? null,
        dietPreference: row.dietPreference,
      },
      subscription,
      menuItems,
    };

    setDetailData(detail);
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setDetailData(null);
  };

  const isLoading = loadingRequests || loadingPackages || loadingFoodItems || loadingUsers;

  const dateLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    return formatter.format(targetDate);
  }, [targetDate]);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-md sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-3 shadow-lg">
              <ClipboardList className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Order Dashboard</h1>
              <p className="text-sm text-slate-600">Track meal fulfilment and customer readiness for each service window.</p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 text-sm sm:items-end">
            <span className="text-slate-500">Viewing for</span>
            <span className="text-base font-semibold text-slate-900">{dateLabel}</span>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <Filter className="h-4 w-4" />
                <span>Meal Window</span>
              </label>
              <div className="relative w-64">
                <select
                  value={selectedMealFilter}
                  onChange={(event) => setSelectedMealFilter(event.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                >
                  {MEAL_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">▾</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3 shadow-sm">
                <Users className="h-5 w-5 text-purple-600" />
                <div>
                  <div className="text-xs font-semibold uppercase text-purple-600">Count</div>
                  <div className="text-2xl font-bold text-purple-700">{rows.length}</div>
                  <div className="text-xs font-medium text-purple-500">
                    {uniqueCustomerCount} unique customer{uniqueCustomerCount === 1 ? '' : 's'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                {(['today', 'tomorrow'] as DayOption[]).map((dayOption) => {
                  const isActive = selectedDay === dayOption;
                  return (
                    <button
                      key={dayOption}
                      type="button"
                      onClick={() => setSelectedDay(dayOption)}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                        isActive
                          ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow'
                          : 'text-slate-600 hover:bg-purple-50'
                      }`}
                    >
                      {dayOption === 'today' ? 'Today' : 'Tomorrow'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-md">
          {isLoading ? (
            <div className="flex items-center justify-center p-12 text-slate-500">
              Loading orders...
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
              <ClipboardList className="h-12 w-12 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-700">No orders for the selected window</h3>
              <p className="text-sm text-slate-500">
                Adjust the meal filter or date to review other service windows.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">#</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Customer ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Customer Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Mobile</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Meal Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Meal Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Meal Preference</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Add-ons</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, index) => (
                    <tr key={`${row.subscriptionId}-${row.mealType}-${index}`} className="hover:bg-purple-50/60">
                      <td className="px-6 py-3 text-sm font-medium text-slate-500">{index + 1}</td>
                      <td className="px-6 py-3 text-sm text-slate-700">
                        {(() => {
                          const displayId = getDisplayCustomerId(row.customerShortId, row.customerId);
                          if (displayId === '—') {
                            return <span className="text-xs text-slate-400">—</span>;
                          }
                          return (
                            <span className="inline-flex items-center rounded-md bg-purple-100 px-2.5 py-1 font-mono text-xs font-semibold text-purple-700">
                              {displayId}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-3 text-sm font-semibold text-slate-900">{row.customerName}</td>
                      <td className="px-6 py-3 text-sm text-slate-700">
                        {row.customerPhone ? (
                          <a href={`tel:${row.customerPhone}`} className="inline-flex items-center gap-2 text-purple-600 hover:underline">
                            <Phone className="h-4 w-4" />
                            {row.customerPhone}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-700">
                        <div className="flex flex-col gap-1">
                          <span>{row.mealPlan}</span>
                          {!row.menuPlanned && (
                            <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                              Menu pending
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm font-medium">
                        <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                          {row.mealType}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-700">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            row.dietPreference === 'pure-veg'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {row.dietPreference === 'pure-veg' ? 'Pure Veg' : 'Mixed'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-700">{row.addOns}</td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewOrder(row)}
                            className="inline-flex items-center gap-2 rounded-lg border border-purple-300 px-3 py-2 text-xs font-semibold text-purple-600 transition hover:bg-purple-50"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <OrderDetailDialog open={detailOpen} detail={detailData} onClose={handleCloseDetail} />
      </div>
    </div>
  );
};

export default OrderDashboardPage;
