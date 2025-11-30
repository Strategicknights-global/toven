import type { FoodCategory, MealType } from './FoodItemSchema';

export type AddonRequestStatus = 'pending' | 'confirmed' | 'cancelled';

export const ADDON_REQUEST_STATUSES: readonly AddonRequestStatus[] = [
  'pending',
  'confirmed',
  'cancelled',
] as const;

export interface AddonRequestItem {
  addonId: string;
  addonName: string;
  category: FoodCategory;
  mealType: MealType;
  quantity: number;
  coinsPerUnit: number;
  discountCoinsPerUnit: number;
  totalCoins: number;
  totalDiscountCoins: number;
}

export interface AddonRequestSummary {
  totalQuantity: number;
  totalCoins: number;
  totalDiscountCoins: number;
}

export interface AddonRequestSchema {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string | null;
  userPhone?: string | null;
  deliveryDateKey: string;
  deliveryDate: Date;
  items: AddonRequestItem[];
  summary: AddonRequestSummary;
  status: AddonRequestStatus;
  statusNote?: string | null;
  reviewedBy?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: Date | null;
  walletDebitedCoins?: number | null;
  walletDebitedAt?: Date | null;
  walletRefundedCoins?: number | null;
  walletRefundedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type AddonRequestItemInput = {
  addonId: string;
  addonName: string;
  category: FoodCategory;
  mealType: MealType;
  quantity: number;
  coinsPerUnit: number;
  discountCoinsPerUnit: number;
};

export type AddonRequestCreateInput = {
  userId: string;
  userName: string;
  userEmail?: string | null;
  userPhone?: string | null;
  deliveryDateKey: string;
  deliveryDate: Date;
  items: AddonRequestItemInput[];
  summary: AddonRequestSummary;
  notes?: string | null;
};

export type AddonRequestStatusUpdateInput = {
  status: AddonRequestStatus;
  statusNote?: string | null;
  reviewedBy: string;
  reviewedByName?: string | null;
};

const clampNonNegative = (value: number): number => (Number.isFinite(value) && value > 0 ? value : 0);

export const normalizeAddonRequestSummary = (summary: AddonRequestSummary): AddonRequestSummary => ({
  totalQuantity: clampNonNegative(summary.totalQuantity),
  totalCoins: clampNonNegative(summary.totalCoins),
  totalDiscountCoins: clampNonNegative(summary.totalDiscountCoins),
});

export const normalizeAddonRequestItems = (items: AddonRequestItemInput[]): AddonRequestItem[] => {
  return items.map((item) => ({
    addonId: item.addonId,
    addonName: item.addonName,
    category: item.category,
    mealType: item.mealType,
    quantity: clampNonNegative(item.quantity),
    coinsPerUnit: clampNonNegative(item.coinsPerUnit),
    discountCoinsPerUnit: clampNonNegative(item.discountCoinsPerUnit),
    totalCoins: clampNonNegative(item.coinsPerUnit * item.quantity),
    totalDiscountCoins: clampNonNegative(item.discountCoinsPerUnit * item.quantity),
  }));
};
