export type FoodCategory = 'Veg' | 'Non-Veg';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner';

export interface FoodItemSchema {
  id: string;
  name: string;
  category: FoodCategory;
  mealType: MealType;
  coins: number;
  discountCoins: number;
  isAddon: boolean;
  addonDescription?: string | null;
  addonAccentFrom?: string | null;
  addonAccentTo?: string | null;
  imageBase64?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type FoodItemCreateInput = {
  name: string;
  category: FoodCategory;
  mealType: MealType;
  coins: number;
  discountCoins: number;
  isAddon?: boolean;
  addonDescription?: string | null;
  addonAccentFrom?: string | null;
  addonAccentTo?: string | null;
  imageBase64?: string;
};

export type FoodItemUpdateInput = Partial<Omit<FoodItemCreateInput, 'discountCoins' | 'imageBase64'>> & {
  discountCoins?: number;
  imageBase64?: string | null;
  isAddon?: boolean;
  addonDescription?: string | null;
  addonAccentFrom?: string | null;
  addonAccentTo?: string | null;
};
