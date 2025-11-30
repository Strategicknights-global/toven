export type CouponDiscountType = 'percentage' | 'flat';

export interface CouponSchema {
  id: string;
  code: string;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxRedemptions?: number | null;
  maxRedemptionsPerUser?: number | null;
  minOrderValue?: number | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  active: boolean;
  requiredPackageIds?: string[] | null;
  requireStudentVerification?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CouponCreateInput = {
  code: string;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxRedemptions?: number | null;
  maxRedemptionsPerUser?: number | null;
  minOrderValue?: number | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  active?: boolean;
  requiredPackageIds?: string[] | null;
  requireStudentVerification?: boolean;
};

export type CouponUpdateInput = Partial<CouponCreateInput>;
