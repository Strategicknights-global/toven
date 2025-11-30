export type CategoryStatus = 'Available' | 'Unavailable';

export interface CategorySchema {
  id: string;
  name: string;
  price: number;
  status: CategoryStatus;
  description?: string | null;
  accentFrom?: string | null;
  accentTo?: string | null;
  imageBase64?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CategoryCreateInput = {
  name: string;
  price: number;
  status: CategoryStatus;
  description?: string | null;
  accentFrom?: string | null;
  accentTo?: string | null;
  imageBase64?: string;
};

export type CategoryUpdateInput = Partial<Omit<CategoryCreateInput, 'imageBase64'>> & {
  imageBase64?: string | null;
};
