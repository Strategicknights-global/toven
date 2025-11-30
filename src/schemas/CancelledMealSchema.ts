import type { MealType } from './FoodItemSchema';

export interface CancelledMealSchema {
  id: string;
  subscriptionId?: string | null;
  customerId: string;
  customerShortId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  packageId?: string | null;
  packageName?: string | null;
  mealType?: MealType | null;
  mealDate?: Date | null;
  cancelledAt?: Date | null;
  price?: number | null;
  currency?: string | null;
  reason?: string | null;
  recordedById?: string | null;
  recordedByName?: string | null;
}

export type CancelledMealCreateInput = {
  subscriptionId?: string | null;
  customerId: string;
  customerShortId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  packageId?: string | null;
  packageName?: string | null;
  mealType?: MealType | null;
  mealDate?: Date | null;
  cancelledAt?: Date | null;
  price?: number | null;
  currency?: string | null;
  reason?: string | null;
  recordedById?: string | null;
  recordedByName?: string | null;
};
