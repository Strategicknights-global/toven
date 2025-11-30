import { create } from 'zustand';
import { ExpenseModel } from '../firestore';
import type { ExpenseCreateInput, ExpenseSchema } from '../schemas/ExpenseSchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { useToastStore } from './toastStore';

interface ExpensesState {
  generalExpenses: ExpenseSchema[];
  loading: boolean;
  totalItems: number | null;
  creating: boolean;
  deletingId: string | null;
  paginatedData: (options: {
    pageNumber?: number;
    pageSize?: number;
    search?: SearchParams | null;
  }) => Promise<void>;
  loadGeneralExpenses: () => Promise<void>;
  refreshGeneralExpenses: () => Promise<void>;
  createGeneralExpense: (input: ExpenseCreateInput) => Promise<string | null>;
  deleteExpense: (id: string) => Promise<boolean>;
}

export const useExpensesStore = create<ExpensesState>((set, get) => ({
  generalExpenses: [],
  loading: false,
  totalItems: null,
  creating: false,
  deletingId: null,

  paginatedData: async (options) => {
    set({ loading: true });
    try {
      const { data, total } = await ExpenseModel.searchPaginated(
        { 
          pageNumber: options.pageNumber || 1, 
          pageSize: options.pageSize || 1000 
        },
        options.search || null
      );
      const generalOnly = data.filter((expense) => expense.category === 'general');
      set({ generalExpenses: generalOnly, totalItems: total, loading: false });
    } catch (error) {
      useToastStore.getState().addToast('Failed to load expenses: ' + (error as Error).message, 'error');
      set({ loading: false });
    }
  },

  loadGeneralExpenses: async () => {
    await get().paginatedData({});
  },

  refreshGeneralExpenses: async () => {
    try {
      await get().paginatedData({});
    } catch {
      // handled in paginatedData
    }
  },

  createGeneralExpense: async (input) => {
    set({ creating: true });
    try {
      const id = await ExpenseModel.create(input);
      useToastStore.getState().addToast('Expense recorded successfully.', 'success');
      await get().refreshGeneralExpenses();
      return id;
    } catch (error) {
      useToastStore.getState().addToast('Failed to create expense: ' + (error as Error).message, 'error');
      return null;
    } finally {
      set({ creating: false });
    }
  },

  deleteExpense: async (id) => {
    set({ deletingId: id });
    try {
      await ExpenseModel.delete(id);
      useToastStore.getState().addToast('Expense deleted.', 'success');
      await get().refreshGeneralExpenses();
      return true;
    } catch (error) {
      useToastStore.getState().addToast('Failed to delete expense: ' + (error as Error).message, 'error');
      return false;
    } finally {
      set({ deletingId: null });
    }
  },
}));
