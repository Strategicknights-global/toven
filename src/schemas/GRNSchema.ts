export interface GrnSchema {
  id?: string;
  productId: string;
  productName: string;
  productUnit?: string;
  quantity: number;
  purchaseDate: Date;
  receivedById: string;
  receivedByName: string;
  totalPrice: number;
  invoiceImageBase64?: string | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type GrnCreateInput = {
  productId: string;
  productName: string;
  productUnit?: string;
  quantity: number;
  purchaseDate: Date;
  receivedById: string;
  receivedByName: string;
  totalPrice: number;
  invoiceImageBase64?: string | null;
  notes?: string | null;
};

export type GrnUpdateInput = Partial<Omit<GrnSchema, 'id' | 'createdAt' | 'updatedAt'>>;
