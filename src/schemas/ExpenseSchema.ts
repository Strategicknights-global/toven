export type ExpenseCategory = 'general' | 'purchase';

export interface ExpenseSchema {
  id?: string;
  description: string;
  amount: number;
  expenseDate: Date;
  category: ExpenseCategory;
  sourceId?: string | null;
  sourceType?: 'manual' | 'grn';
  invoiceImageBase64?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ExpenseCreateInput = {
  description: string;
  amount: number;
  expenseDate: Date;
  invoiceImageBase64?: string | null;
};

export type ExpenseUpdateInput = Partial<Omit<ExpenseSchema, 'id' | 'createdAt' | 'updatedAt'>>;
