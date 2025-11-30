import { create } from 'zustand';
import { CouponModel } from '../firestore';
import type { CouponCreateInput, CouponSchema, CouponUpdateInput } from '../schemas/CouponSchema';
import type { SearchParams } from '../utils/firestoreSearch';
import { useToastStore } from './toastStore';

interface CouponsState {
  coupons: CouponSchema[];
  loading: boolean;
  totalItems: number | null;
  creating: boolean;
  updatingId: string | null;
  togglingId: string | null;
  deletingId: string | null;
  paginatedData: (options: {
    pageNumber?: number;
    pageSize?: number;
    search?: SearchParams | null;
  }) => Promise<void>;
  loadCoupons: () => Promise<void>;
  refresh: () => Promise<void>;
  createCoupon: (input: CouponCreateInput) => Promise<string | null>;
  updateCoupon: (id: string, input: CouponUpdateInput) => Promise<boolean>;
  toggleCouponActive: (id: string, active: boolean) => Promise<boolean>;
  deleteCoupon: (id: string, code?: string) => Promise<boolean>;
}

export const useCouponsStore = create<CouponsState>((set, get) => ({
  coupons: [],
  loading: false,
  totalItems: null,
  creating: false,
  updatingId: null,
  togglingId: null,
  deletingId: null,

  paginatedData: async (options) => {
    set({ loading: true });
    try {
      const { data, total } = await CouponModel.searchPaginated(
        { 
          pageNumber: options.pageNumber || 1, 
          pageSize: options.pageSize || 1000 
        },
        options.search || null
      );
      set({ coupons: data, totalItems: total, loading: false });
    } catch (error) {
      useToastStore.getState().addToast('Failed to load coupons: ' + (error as Error).message, 'error');
      set({ loading: false });
    }
  },

  loadCoupons: async () => {
    await get().paginatedData({});
  },

  refresh: async () => {
    try {
      await get().paginatedData({});
    } catch {
      // handled by paginatedData
    }
  },

  createCoupon: async (input) => {
    set({ creating: true });
    try {
      const id = await CouponModel.create(input);
      useToastStore.getState().addToast(`Coupon ${input.code.toUpperCase()} created`, 'success');
      await get().refresh();
      return id;
    } catch (error) {
      useToastStore.getState().addToast('Failed to create coupon: ' + (error as Error).message, 'error');
      return null;
    } finally {
      set({ creating: false });
    }
  },

  updateCoupon: async (id, input) => {
    set({ updatingId: id });
    try {
      await CouponModel.update(id, input);
      useToastStore.getState().addToast('Coupon updated', 'success');
      await get().refresh();
      return true;
    } catch (error) {
      useToastStore.getState().addToast('Failed to update coupon: ' + (error as Error).message, 'error');
      return false;
    } finally {
      set({ updatingId: null });
    }
  },

  toggleCouponActive: async (id, active) => {
    set({ togglingId: id });
    try {
      await CouponModel.update(id, { active });
      useToastStore.getState().addToast(`Coupon ${active ? 'activated' : 'paused'}`, 'success');
      await get().refresh();
      return true;
    } catch (error) {
      useToastStore.getState().addToast('Failed to update coupon status: ' + (error as Error).message, 'error');
      return false;
    } finally {
      set({ togglingId: null });
    }
  },

  deleteCoupon: async (id, code) => {
    set({ deletingId: id });
    try {
      await CouponModel.delete(id);
      useToastStore.getState().addToast(`Coupon${code ? ` ${code}` : ''} deleted`, 'success');
      await get().refresh();
      return true;
    } catch (error) {
      useToastStore.getState().addToast('Failed to delete coupon: ' + (error as Error).message, 'error');
      return false;
    } finally {
      set({ deletingId: null });
    }
  },
}));
