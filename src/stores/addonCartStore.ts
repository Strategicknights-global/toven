import { create } from 'zustand';
import type { FoodCategory, MealType } from '../schemas/FoodItemSchema';

export interface AddonCartItemDetails {
	id: string;
	name: string;
	category: FoodCategory;
	mealType: MealType;
	coins: number;
	discountCoins: number;
	image?: string | null;
	deliveryDate: string;
}

export interface AddonCartItem extends AddonCartItemDetails {
	quantity: number;
	addedAt: string;
}

export interface PendingAddonRequest {
	item: AddonCartItemDetails;
	quantity: number;
	requestedAt: string;
}

export interface AddonOrderRecord {
	orderId: string;
	placedAt: string;
	deliveryDate: string;
	totalQuantity: number;
	totalCoins: number;
	items: AddonCartItem[];
}

interface AddonCartState {
	items: Record<string, AddonCartItem>;
	pendingRequest: PendingAddonRequest | null;
	lastOrder: AddonOrderRecord | null;
	addOrUpdateItem: (details: AddonCartItemDetails, quantity: number) => void;
	removeItem: (addonId: string) => void;
	clearCart: () => void;
	setPendingRequest: (details: AddonCartItemDetails | null, quantity?: number) => void;
	consumePendingRequest: () => PendingAddonRequest | null;
	getItemQuantity: (addonId: string) => number;
	totalQuantity: () => number;
	totalCoins: () => number;
	totalDiscountCoins: () => number;
	clearCartAndSetLastOrder: (order: AddonOrderRecord | null) => void;
}

export const useAddonCartStore = create<AddonCartState>((set, get) => ({
	items: {},
	pendingRequest: null,
	lastOrder: null,

	addOrUpdateItem: (details, quantity) => {
		set((state) => {
			if (quantity <= 0) {
				const { [details.id]: _removed, ...rest } = state.items;
				return { items: rest };
			}

			return {
				items: {
					...state.items,
					[details.id]: {
						...details,
						quantity,
						addedAt: new Date().toISOString(),
					},
				},
			};
		});
	},

	removeItem: (addonId) => {
		set((state) => {
			const { [addonId]: _removed, ...rest } = state.items;
			return { items: rest };
		});
	},

	clearCart: () => set({ items: {} }),

	setPendingRequest: (details, quantity = 0) => {
		if (!details || quantity <= 0) {
			set({ pendingRequest: null });
			return;
		}

		set({
			pendingRequest: {
				item: details,
				quantity,
				requestedAt: new Date().toISOString(),
			},
		});
	},

	consumePendingRequest: () => {
		const pending = get().pendingRequest;
		if (!pending) {
			return null;
		}

		set({ pendingRequest: null });
		return pending;
	},

	getItemQuantity: (addonId) => get().items[addonId]?.quantity ?? 0,

	totalQuantity: () => Object.values(get().items).reduce((total, item) => total + item.quantity, 0),

	totalCoins: () => Object.values(get().items).reduce((total, item) => total + item.coins * item.quantity, 0),

	totalDiscountCoins: () =>
		Object.values(get().items).reduce((total, item) => total + (item.discountCoins ?? 0) * item.quantity, 0),

	clearCartAndSetLastOrder: (order) => {
		if (order) {
			set({ items: {}, lastOrder: order });
			return;
		}

		set({ items: {}, lastOrder: null });
	},
}));
