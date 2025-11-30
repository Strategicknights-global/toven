export type DayDiscountType = 'percentage' | 'amount';
export type DayDiscountScope = 'all' | 'categories' | 'packages';
export type DayDiscountMatchType = 'all' | 'any';

export interface DayDiscountSchema {
  id: string;
  label: string;
  description?: string | null; // Description for the discount
  dayCount: number;
  discountType: DayDiscountType;
  discountValue: number;
  scope: DayDiscountScope;
  categoryIds?: string[];
  packageIds?: string[];
  matchType?: DayDiscountMatchType;
  createdAt?: Date;
  updatedAt?: Date;
}

export type DayDiscountCreateInput = {
  label: string;
  description?: string | null;
  dayCount: number;
  discountType: DayDiscountType;
  discountValue: number;
  scope: DayDiscountScope;
  categoryIds?: string[];
  packageIds?: string[];
  matchType?: DayDiscountMatchType;
};

export type DayDiscountUpdateInput = Partial<DayDiscountCreateInput>;
