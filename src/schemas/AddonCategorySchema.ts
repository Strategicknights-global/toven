export interface AddonCategorySchema {
  id: string;
  name: string;
  addonIds: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export type AddonCategoryCreateInput = {
  name: string;
  addonIds: string[];
};

export type AddonCategoryUpdateInput = Partial<AddonCategoryCreateInput>;
