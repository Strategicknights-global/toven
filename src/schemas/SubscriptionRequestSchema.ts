import type { MealType } from './FoodItemSchema';
import type { RefundSource } from './RefundPolicySchema';

export type SubscriptionDietPreference = 'mixed' | 'pure-veg';

export type SubscriptionRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export const SUBSCRIPTION_REQUEST_STATUSES: readonly SubscriptionRequestStatus[] = [
	'pending',
	'approved',
	'rejected',
	'cancelled',
] as const;

export const isSubscriptionRequestStatus = (
	value: unknown,
): value is SubscriptionRequestStatus =>
	typeof value === 'string' && SUBSCRIPTION_REQUEST_STATUSES.includes(value as SubscriptionRequestStatus);

export interface SubscriptionRequestSelection {
	mealType: MealType;
	packageId: string;
	packageName: string;
	pricePerDay: number;
	totalPrice: number;
}

export interface SubscriptionRequestSummary {
	durationDays: number;
	subtotal: number;
	discountPercent: number;
	discountAmount: number;
	couponCode?: string | null;
	couponDiscountAmount: number;
	totalPayable: number;
}

export interface SubscriptionRefundInfo {
	amount: number;
	currency: string;
	percentApplied: number;
	source: RefundSource;
	tierLabel?: string | null;
	notes?: string | null;
	remainingAmount?: number | null;
	remainingDays?: number | null;
	processedAt?: Date | null;
	processedById?: string | null;
	processedByName?: string | null;
}

export interface PausedMeal {
	date: string; // ISO date string (YYYY-MM-DD)
	mealType: MealType; // 'Breakfast' | 'Lunch' | 'Dinner'
}

export interface SubscriptionRequestSchema {
	id?: string;
	userId: string;
	customerShortId?: string | null;
	userName: string;
	userEmail?: string | null;
	userPhone?: string | null;
	categoryId: string;
	categoryName: string;
	dietPreference: SubscriptionDietPreference;
	durationDays: number;
	startDate: Date;
	endDate: Date;
	selections: SubscriptionRequestSelection[];
	summary: SubscriptionRequestSummary;
	notes?: string | null;
	status: SubscriptionRequestStatus;
	pausedMeals?: PausedMeal[]; // Array of date+mealType combinations that are paused
	statusNote?: string | null;
	reviewedBy?: string | null;
	reviewedByName?: string | null;
	reviewedAt?: Date | null;
	cancelledAt?: Date | null;
	refundInfo?: SubscriptionRefundInfo | null;
	createdAt?: Date;
	updatedAt?: Date;
	deliveryLocationId?: string | null;
	deliveryLocationName?: string | null;
	deliveryLocationAddress?: string | null;
	deliveryLocationCoordinates?: string | null;
	deliveryLocationLandmark?: string | null;
	deliveryLocationContactName?: string | null;
	deliveryLocationContactPhone?: string | null;
	paymentProofImageBase64?: string | null;
	paymentProofFileName?: string | null;
}

export type SubscriptionRequestCreateInput = {
	userId: string;
	customerShortId?: string | null;
	userName: string;
	userEmail?: string | null;
	userPhone?: string | null;
	categoryId: string;
	categoryName: string;
	dietPreference: SubscriptionDietPreference;
	durationDays: number;
	startDate: Date;
	endDate: Date;
	selections: SubscriptionRequestSelection[];
	summary: SubscriptionRequestSummary;
	notes?: string | null;
	deliveryLocationId?: string | null;
	deliveryLocationName?: string | null;
	deliveryLocationAddress?: string | null;
	deliveryLocationCoordinates?: string | null;
	deliveryLocationLandmark?: string | null;
	deliveryLocationContactName?: string | null;
	deliveryLocationContactPhone?: string | null;
	paymentProofImageBase64?: string | null;
	paymentProofFileName?: string | null;
};

export type SubscriptionRequestStatusUpdateInput = {
	status: SubscriptionRequestStatus;
	statusNote?: string | null;
	reviewedBy: string;
	reviewedByName?: string | null;
};

