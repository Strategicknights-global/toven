import type { ProductUnit } from '../schemas/ProductSchema';

export const getNumericStepForUnit = (unit?: ProductUnit | null): string => {
  return unit === 'pcs' ? '1' : '0.01';
};

export const getNumericInputModeForUnit = (unit?: ProductUnit | null): 'decimal' | 'numeric' => {
  return unit === 'pcs' ? 'numeric' : 'decimal';
};
