import type { MealType } from './FoodItemSchema';

export type PackageStatus = 'Available' | 'Unavailable';

export interface PackageDateMenuEntry {
  date: string;
  foodItemIds: string[];
  foodItemQuantities?: Record<string, number>;
  description?: string;
}

export interface PackageSchema {
  id: string;
  name: string;
  categoryId: string;
  mealType: MealType;
  price: number;
  status: PackageStatus;
  dateMenus: PackageDateMenuEntry[];
  menuDescription?: string;
  imageBase64?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PackageDateMenuEntryInput = {
  date?: string | null;
  foodItemIds?: string[] | null;
  foodItemQuantities?: Record<string, number> | null;
  description?: string | null;
};

export type PackageCreateInput = {
  name: string;
  categoryId: string;
  mealType: MealType;
  price: number;
  status: PackageStatus;
  dateMenus: PackageDateMenuEntryInput[];
  menuDescription?: string;
  imageBase64?: string;
};

export type PackageUpdateInput = Partial<Omit<PackageCreateInput, 'imageBase64' | 'dateMenus' | 'menuDescription'>> & {
  imageBase64?: string | null;
  dateMenus?: PackageDateMenuEntryInput[];
  menuDescription?: string | null;
};

const isValidISODate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const normalizeDateString = (value?: string | null): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return isValidISODate(trimmed) ? trimmed : null;
};

const normalizeDescription = (value?: string | null): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeFoodItemIds = (value?: string[] | null): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
};

const normalizeFoodItemQuantities = (value?: Record<string, number> | null): Record<string, number> | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const normalized: Record<string, number> = {};
  for (const [key, val] of Object.entries(value)) {
    if (typeof key === 'string' && key.trim() && typeof val === 'number' && val > 0) {
      normalized[key] = val;
    }
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

export const normalizeMenuDescription = (value?: string | null): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const createEmptyDateMenus = (): PackageDateMenuEntry[] => [];

export const createDefaultDateMenu = (): PackageDateMenuEntry => {
  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  return {
    date: iso,
    foodItemIds: [],
    foodItemQuantities: undefined,
    description: undefined,
  };
};

export const createDefaultDateMenus = (): PackageDateMenuEntry[] => [createDefaultDateMenu()];

export const normalizeDateMenuEntries = (
  entries?: PackageDateMenuEntryInput[],
  { allowEmpty = false }: { allowEmpty?: boolean } = {},
): PackageDateMenuEntry[] => {
  if (!Array.isArray(entries) || entries.length === 0) {
    return allowEmpty ? createEmptyDateMenus() : createDefaultDateMenus();
  }

  const normalized: PackageDateMenuEntry[] = [];
  
  for (const entry of entries) {
    const date = normalizeDateString(entry.date ?? null);
    if (!date) {
      continue;
    }
    const foodItemIds = normalizeFoodItemIds(entry.foodItemIds ?? null);
    const foodItemQuantities = normalizeFoodItemQuantities(entry.foodItemQuantities ?? null);
    const description = normalizeDescription(entry.description ?? null);
    normalized.push({ date, foodItemIds, foodItemQuantities, description });
  }

  if (normalized.length === 0) {
    return allowEmpty ? createEmptyDateMenus() : createDefaultDateMenus();
  }

  return normalized.sort((a, b) => a.date.localeCompare(b.date));
};
