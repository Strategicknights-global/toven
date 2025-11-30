import { create } from 'zustand';
import { SubscriptionDepositModel } from '../firestore';
import type { SubscriptionDepositSchema } from '../schemas/SubscriptionDepositSchema';
import { useToastStore } from './toastStore';

interface LoadDepositArgs {
  userId: string;
}

interface RecordDepositArgs {
  userId: string;
  amount: number;
  currency: string;
  paymentReference?: string | null;
  invoiceImageBase64?: string | null;
  invoiceFileName?: string | null;
}

interface SubscriptionDepositState {
  deposit: SubscriptionDepositSchema | null;
  loading: boolean;
  submitting: boolean;
  currentUserId: string | null;
  loadDepositForUser: (args: LoadDepositArgs) => Promise<SubscriptionDepositSchema | null>;
  recordDeposit: (args: RecordDepositArgs) => Promise<SubscriptionDepositSchema | null>;
  reset: () => void;
}

export const useSubscriptionDepositStore = create<SubscriptionDepositState>((set, get) => ({
  deposit: null,
  loading: false,
  submitting: false,
  currentUserId: null,

  loadDepositForUser: async ({ userId }) => {
    if (!userId) {
      return null;
    }

    const { currentUserId, loading } = get();

    if (loading && currentUserId === userId) {
      return get().deposit;
    }

    if (currentUserId !== userId) {
      set({ deposit: null, currentUserId: userId });
    }

    set({ loading: true });

    try {
      const record = await SubscriptionDepositModel.findByUserId(userId);
      set({ deposit: record, loading: false, currentUserId: userId });
      return record;
    } catch (error) {
      console.error('Failed to load subscription deposit', error);
      useToastStore.getState().addToast('Unable to verify your deposit status. Please try again.', 'error');
      set({ loading: false });
      throw error;
    }
  },

  recordDeposit: async ({ userId, amount, currency, paymentReference = null, invoiceImageBase64 = null, invoiceFileName = null }) => {
    if (!userId) {
      throw new Error('User ID is required to record a deposit.');
    }

    const existing = get().deposit;
    if (existing && existing.userId === userId) {
      return existing;
    }

    if (get().submitting) {
      return get().deposit;
    }

    set({ submitting: true, currentUserId: userId });

    try {
      await SubscriptionDepositModel.create({
        userId,
        amount,
        currency,
        paymentReference,
        invoiceImageBase64,
        invoiceFileName,
      });

      const record = await SubscriptionDepositModel.findByUserId(userId);
      set({ deposit: record, submitting: false, loading: false });
      return record;
    } catch (error) {
      console.error('Failed to record subscription deposit', error);
      useToastStore.getState().addToast('Failed to confirm your deposit. Please try again.', 'error');
      set({ submitting: false });
      throw error;
    }
  },

  reset: () => {
    set({ deposit: null, loading: false, submitting: false, currentUserId: null });
  },
}));
