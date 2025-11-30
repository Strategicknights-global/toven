import { create } from 'zustand';
import {
  AddonRequestModel,
  CustomerLoginModel,
  ExpenseModel,
  SubscriptionDepositModel,
  SubscriptionRequestModel,
} from '../firestore';
import type { SubscriptionRequestSchema } from '../schemas/SubscriptionRequestSchema';
import type { AddonRequestSchema } from '../schemas/AddonRequestSchema';
import type { SubscriptionDepositSchema } from '../schemas/SubscriptionDepositSchema';
import type { ExpenseSchema } from '../schemas/ExpenseSchema';

const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
const endOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
const startOfToday = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const isWithinRange = (value: Date | undefined, start: Date, end: Date): boolean => {
  if (!value) return false;
  return value.getTime() >= start.getTime() && value.getTime() <= end.getTime();
};

const isSameMonth = (value: Date | undefined, reference: Date): boolean => {
  if (!value) return false;
  return value.getFullYear() === reference.getFullYear() && value.getMonth() === reference.getMonth();
};

export interface SubscribersByProductMetric {
  packageId: string;
  packageName: string;
  subscriberCount: number;
  totalRevenue: number;
}

export interface AddonForecastMetric {
  addonId: string;
  addonName: string;
  totalQuantity: number;
  totalCoins: number;
  totalDiscountCoins: number;
  nextDeliveryDate: Date | null;
}

interface AdminDashboardMetricsState {
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  loginsThisMonth: number;
  uniqueLoginCustomersThisMonth: number;
  revenueThisMonth: number;
  expensesThisMonth: number;
  subscribersByProduct: SubscribersByProductMetric[];
  addonForecast: AddonForecastMetric[];
  refresh: () => Promise<void>;
}

const mapSubscribersByProduct = (requests: SubscriptionRequestSchema[]): SubscribersByProductMetric[] => {
  const productMap = new Map<string, SubscribersByProductMetric>();

  requests
    .filter((request) => request.status === 'approved')
    .forEach((request) => {
      request.selections.forEach((selection) => {
        const key = selection.packageId || selection.packageName;
        const current = productMap.get(key) ?? {
          packageId: selection.packageId,
          packageName: selection.packageName || 'Unnamed Package',
          subscriberCount: 0,
          totalRevenue: 0,
        };

        current.subscriberCount += 1;
        current.totalRevenue += selection.totalPrice ?? 0;

        productMap.set(key, current);
      });
    });

  return [...productMap.values()].sort((a, b) => b.subscriberCount - a.subscriberCount);
};

const mapAddonForecast = (requests: AddonRequestSchema[], fromDate: Date): AddonForecastMetric[] => {
  const addonMap = new Map<string, AddonForecastMetric>();

  requests
    .filter((request) => (request.status === 'pending' || request.status === 'confirmed') && request.deliveryDate && request.deliveryDate >= fromDate)
    .forEach((request) => {
      request.items.forEach((item) => {
        const key = item.addonId || item.addonName;
        const existing = addonMap.get(key) ?? {
          addonId: item.addonId,
          addonName: item.addonName || 'Unnamed Add-on',
          totalQuantity: 0,
          totalCoins: 0,
          totalDiscountCoins: 0,
          nextDeliveryDate: null,
        };

        existing.totalQuantity += item.quantity ?? 0;
        existing.totalCoins += item.totalCoins ?? 0;
        existing.totalDiscountCoins += item.totalDiscountCoins ?? 0;
        if (!existing.nextDeliveryDate || (request.deliveryDate && request.deliveryDate < existing.nextDeliveryDate)) {
          existing.nextDeliveryDate = request.deliveryDate ?? null;
        }

        addonMap.set(key, existing);
      });
    });

  return [...addonMap.values()].sort((a, b) => b.totalQuantity - a.totalQuantity);
};

export const useAdminDashboardMetricsStore = create<AdminDashboardMetricsState>((set, get) => ({
  loading: false,
  error: null,
  lastUpdated: null,
  loginsThisMonth: 0,
  uniqueLoginCustomersThisMonth: 0,
  revenueThisMonth: 0,
  expensesThisMonth: 0,
  subscribersByProduct: [],
  addonForecast: [],

  refresh: async () => {
    if (get().loading) {
      return;
    }

    set({ loading: true, error: null });

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const todayStart = startOfToday(now);

    try {
      // Iteratively paginate subscription deposits
      let pageNumber = 1;
      let hasMore = true;
      const allDeposits: SubscriptionDepositSchema[] = [];

      while (hasMore) {
        const { data, total } = await SubscriptionDepositModel.searchPaginated(
          { pageNumber, pageSize: 100 },
        );
        allDeposits.push(...data);
        const retrieved = pageNumber * 100;
        hasMore = data.length > 0 && retrieved < total;
        pageNumber += 1;
      }

      // Iteratively paginate expenses
      pageNumber = 1;
      hasMore = true;
      const allExpenses: ExpenseSchema[] = [];

      while (hasMore) {
        const { data, total } = await ExpenseModel.searchPaginated(
          { pageNumber, pageSize: 100 },
          null,
        );
        allExpenses.push(...data);
        const retrieved = pageNumber * 100;
        hasMore = data.length > 0 && retrieved < total;
        pageNumber += 1;
      }

      // Iteratively paginate subscription requests
      pageNumber = 1;
      hasMore = true;
      const allSubscriptionRequests: SubscriptionRequestSchema[] = [];

      while (hasMore) {
        const { data, total } = await SubscriptionRequestModel.searchPaginated(
          { pageNumber, pageSize: 100 },
          null,
        );
        allSubscriptionRequests.push(...data);
        const retrieved = pageNumber * 100;
        hasMore = data.length > 0 && retrieved < total;
        pageNumber += 1;
      }

      // Iteratively paginate addon requests
      pageNumber = 1;
      hasMore = true;
      const allAddonRequests: AddonRequestSchema[] = [];

      while (hasMore) {
        const { data, total } = await AddonRequestModel.searchPaginated(
          { pageNumber, pageSize: 100 },
          null,
        );
        allAddonRequests.push(...data);
        const retrieved = pageNumber * 100;
        hasMore = data.length > 0 && retrieved < total;
        pageNumber += 1;
      }

      // Get login counts
      const loginCounts = await CustomerLoginModel.countSince(monthStart);

      // Calculate metrics
      const revenueThisMonth = allDeposits
        .filter((deposit) => isSameMonth(deposit.paidAt ?? deposit.createdAt, now))
        .reduce((sum, deposit) => sum + (deposit.amount ?? 0), 0);

      const expensesThisMonth = allExpenses
        .filter((expense) => isWithinRange(expense.expenseDate, monthStart, monthEnd))
        .reduce((sum, expense) => sum + (expense.amount ?? 0), 0);

      const subscribersByProduct = mapSubscribersByProduct(allSubscriptionRequests);
      const addonForecast = mapAddonForecast(allAddonRequests, todayStart).slice(0, 5);

      set({
        loading: false,
        error: null,
        lastUpdated: new Date(),
        loginsThisMonth: loginCounts.total,
        uniqueLoginCustomersThisMonth: loginCounts.uniqueCustomers,
        revenueThisMonth,
        expensesThisMonth,
        subscribersByProduct,
        addonForecast,
      });
    } catch (error) {
      console.error('Failed to load admin dashboard metrics', error);
      set({
        loading: false,
        error: (error as Error).message ?? 'Failed to load admin metrics',
      });
    }
  },
}));
