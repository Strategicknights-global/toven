export type ProductUnit = 'kg' | 'grams' | 'pcs' | 'liters' | 'ml';

export interface ProductSchema {
  id?: string;
  name: string;
  currentStock: number;
  unit: ProductUnit;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ProductCreateInput = {
  name: string;
  currentStock: number;
  unit: ProductUnit;
};

export type ProductUpdateInput = {
  name?: string;
  currentStock?: number;
  unit?: ProductUnit;
};

export const PRODUCT_UNITS: ProductUnit[] = ['kg', 'grams', 'pcs', 'liters', 'ml'];
