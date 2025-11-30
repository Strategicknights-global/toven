export interface WalletSchema {
  id?: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  coins: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type WalletCreateInput = {
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  coins: number;
};
