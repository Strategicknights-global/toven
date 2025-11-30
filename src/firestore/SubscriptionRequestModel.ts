import {
	addDoc,
	collection,
	doc,
	getDoc,
	getDocs,
	orderBy,
	query,
	serverTimestamp,
	Timestamp,
	updateDoc,
	type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import { ConfigModel } from './ConfigModel';
import { RoleModel } from './RoleModel';
import { UserModel } from './UserModel';
import { RefundPolicyModel } from './RefundPolicyModel';
import { WalletModel } from './WalletModel';
import type {
	PausedMeal,
	SubscriptionRequestCreateInput,
	SubscriptionRequestSchema,
	SubscriptionRequestSelection,
	SubscriptionRequestSummary,
	SubscriptionRequestStatus,
	SubscriptionRequestStatusUpdateInput,
	SubscriptionRefundInfo,
} from '../schemas/SubscriptionRequestSchema';
import {
	isSubscriptionRequestStatus,
	SUBSCRIPTION_REQUEST_STATUSES,
} from '../schemas/SubscriptionRequestSchema';
import type { MealType } from '../schemas/FoodItemSchema';
import type { RefundPolicySchema, RefundTierSchema, RefundSource } from '../schemas/RefundPolicySchema';
import { executeSearchQuery, executeSearchQueryCount, type SearchParams, type PaginationParams } from '../utils/firestoreSearch';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const roundCurrency = (value: number): number => Math.round(value * 100) / 100;

const normalizeToMidnight = (value: Date): Date => {
	const normalized = new Date(value);
	normalized.setHours(0, 0, 0, 0);
	return normalized;
};

const COLLECTION_NAME = 'subscriptionRequests';

const VALID_MEAL_TYPES: readonly MealType[] = ['Breakfast', 'Lunch', 'Dinner'];

const toDate = (value: unknown): Date | undefined => {
	if (value instanceof Timestamp) {
		return value.toDate();
	}
	if (value instanceof Date) {
		return value;
	}
	if (typeof value === 'number') {
		const parsed = new Date(value);
		if (!Number.isNaN(parsed.getTime())) {
			return parsed;
		}
	}
	if (typeof value === 'string') {
		const parsed = new Date(value);
		if (!Number.isNaN(parsed.getTime())) {
			return parsed;
		}
	}
	return undefined;
};

const toCurrency = (value: unknown): number => {
	const numeric = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(numeric)) {
		return 0;
	}
	return Math.round(numeric * 100) / 100;
};

const toPercent = (value: unknown): number => {
	const numeric = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(numeric)) {
		return 0;
	}
	const clamped = Math.max(0, Math.min(100, numeric));
	return Math.round(clamped * 100) / 100;
};

const toStringSafe = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const toStringOrNull = (value: unknown): string | null => {
	if (typeof value !== 'string') {
		return null;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
};

const normalizeDietPreference = (value: unknown): 'mixed' | 'pure-veg' =>
	value === 'pure-veg' ? 'pure-veg' : 'mixed';

const normalizeSelections = (value: unknown): SubscriptionRequestSelection[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map((item) => {
			if (!item || typeof item !== 'object') {
				return null;
			}

			const mealType = (item as Record<string, unknown>).mealType;
			const resolvedMealType = VALID_MEAL_TYPES.includes(mealType as MealType)
				? (mealType as MealType)
				: null;
			if (!resolvedMealType) {
				return null;
			}

			const packageId = toStringSafe((item as Record<string, unknown>).packageId);
			if (!packageId) {
				return null;
			}

			return {
				mealType: resolvedMealType,
				packageId,
				packageName: toStringSafe((item as Record<string, unknown>).packageName),
				pricePerDay: toCurrency((item as Record<string, unknown>).pricePerDay),
				totalPrice: toCurrency((item as Record<string, unknown>).totalPrice),
			} satisfies SubscriptionRequestSelection;
		})
		.filter((entry): entry is SubscriptionRequestSelection => entry !== null);
};

const normalizeSummary = (value: unknown): SubscriptionRequestSummary => {
	const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
	const durationDaysRaw = Number(record.durationDays);
	const durationDays = Number.isFinite(durationDaysRaw) && durationDaysRaw > 0
		? Math.round(durationDaysRaw)
		: 1;

	const couponCode = toStringOrNull(record.couponCode);

	return {
		durationDays,
		subtotal: toCurrency(record.subtotal),
		discountPercent: toPercent(record.discountPercent),
		discountAmount: toCurrency(record.discountAmount),
		couponCode,
		couponDiscountAmount: toCurrency(record.couponDiscountAmount),
		totalPayable: toCurrency(record.totalPayable),
	} satisfies SubscriptionRequestSummary;
};

const normalizePausedMeals = (value: unknown): PausedMeal[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map((entry) => {
			if (!entry || typeof entry !== 'object') {
				return null;
			}

			const record = entry as Record<string, unknown>;
			const date = typeof record.date === 'string' ? record.date.trim() : '';
			const mealType = record.mealType;

			if (!date || !VALID_MEAL_TYPES.includes(mealType as MealType)) {
				return null;
			}

			return {
				date,
				mealType: mealType as MealType,
			} satisfies PausedMeal;
		})
		.filter((entry): entry is PausedMeal => entry !== null)
		// Remove duplicates by combining date+mealType key
		.reduce<PausedMeal[]>((acc, item) => {
			const exists = acc.some((existing) => existing.date === item.date && existing.mealType === item.mealType);
			if (!exists) {
				acc.push(item);
			}
			return acc;
		}, [])
		.sort((a, b) => {
			if (a.date === b.date) {
				return VALID_MEAL_TYPES.indexOf(a.mealType) - VALID_MEAL_TYPES.indexOf(b.mealType);
			}
			return a.date.localeCompare(b.date);
		});
};

const computePerMealValueInCoins = (subscription: SubscriptionRequestSchema): number => {
	const duration = Math.max(1, subscription.durationDays || subscription.summary.durationDays || 1);
	const subtotal = subscription.summary.subtotal > 0 ? subscription.summary.subtotal : subscription.summary.totalPayable;
	if (!subtotal || duration <= 0) {
		return 0;
	}
	const totalMealsPerDay = subscription.selections.length || 1;
	const totalMeals = duration * totalMealsPerDay;
	if (totalMeals <= 0) {
		return 0;
	}
	const couponDiscount = subscription.summary.couponDiscountAmount ?? 0;
	const autoDiscount = subscription.summary.discountAmount ?? 0;
	const totalDiscount = Math.max(0, autoDiscount + couponDiscount);
	const effectivePaid = Math.max(0, subtotal - totalDiscount);
	if (effectivePaid <= 0) {
		return 0;
	}
	const effectivePerMeal = effectivePaid / totalMeals;
	return Math.round(effectivePerMeal);
};

const normalizeRefundSource = (value: unknown): RefundSource => {
	return value === 'coins' ? 'coins' : 'coins';
};

const normalizeRefundInfo = (value: unknown): SubscriptionRefundInfo | null => {
	if (!value || typeof value !== 'object') {
		return null;
	}

	const record = value as Record<string, unknown>;
	const amount = toCurrency(record.amount);
	const currency = toStringOrNull(record.currency) ?? 'INR';
	const percentApplied = toPercent(record.percentApplied);
	const source = normalizeRefundSource(record.source);
	const remainingAmountRaw = toCurrency(record.remainingAmount);
	const remainingDaysRaw = Number(record.remainingDays);
	const processedAt = toDate(record.processedAt) ?? null;
	const processedById = toStringOrNull(record.processedById);
	const processedByName = toStringOrNull(record.processedByName);
	const tierLabel = toStringOrNull(record.tierLabel);
	const notes = toStringOrNull(record.notes);

	return {
		amount,
		currency,
		percentApplied,
		source,
		tierLabel,
		notes,
		remainingAmount: Number.isFinite(remainingAmountRaw) ? remainingAmountRaw : 0,
		remainingDays: Number.isFinite(remainingDaysRaw) ? Math.max(0, Math.round(remainingDaysRaw)) : 0,
		processedAt,
		processedById,
		processedByName,
	} satisfies SubscriptionRefundInfo;
};

const formatRefundInfoForWrite = (info: SubscriptionRefundInfo | null): Record<string, unknown> | null => {
	if (!info) {
		return null;
	}

	return {
		amount: roundCurrency(info.amount ?? 0),
		currency: info.currency ?? 'INR',
		percentApplied: Math.min(100, Math.max(0, info.percentApplied ?? 0)),
		source: normalizeRefundSource(info.source),
		tierLabel: info.tierLabel ?? null,
		notes: info.notes ?? null,
		remainingAmount: info.remainingAmount !== undefined && info.remainingAmount !== null ? roundCurrency(info.remainingAmount) : null,
		remainingDays: info.remainingDays ?? null,
		processedAt: info.processedAt ? Timestamp.fromDate(info.processedAt) : null,
		processedById: info.processedById ?? null,
		processedByName: info.processedByName ?? null,
	};
};

const findApplicableRefundPolicy = async (
	subscription: SubscriptionRequestSchema,
): Promise<RefundPolicySchema | null> => {
	try {
		const policies = await RefundPolicyModel.findAll();
		if (policies.length === 0) {
			return null;
		}

		const duration = Math.max(0, subscription.durationDays ?? 0);
		const categoryId = subscription.categoryId;
		const packageIds = subscription.selections.map((selection) => selection.packageId).filter((id): id is string => Boolean(id));

		let bestMatch: { policy: RefundPolicySchema; score: number } | null = null;

		for (const policy of policies) {
			if (policy.active === false) {
				continue;
			}

			const lengthMatches = policy.subscriptionLengthDays === duration;
			const isFallbackLength = policy.subscriptionLengthDays === 0;
			if (!lengthMatches && !isFallbackLength) {
				continue;
			}

			const categoryMatches = !policy.appliesToCategoryIds || policy.appliesToCategoryIds.length === 0 || policy.appliesToCategoryIds.includes(categoryId);
			if (!categoryMatches) {
				continue;
			}

			const productMatches = !policy.appliesToProductIds || policy.appliesToProductIds.length === 0 || policy.appliesToProductIds.some((id) => packageIds.includes(id));
			if (!productMatches) {
				continue;
			}

			let score = 0;
			if (lengthMatches) {
				score += 4;
			} else if (isFallbackLength) {
				score += 1;
			}
			if (policy.appliesToCategoryIds && policy.appliesToCategoryIds.length > 0) {
				score += 1;
			}
			if (policy.appliesToProductIds && policy.appliesToProductIds.length > 0) {
				score += 1;
			}

			if (!bestMatch || score > bestMatch.score) {
				bestMatch = { policy, score };
			}
		}

		return bestMatch?.policy ?? null;
	} catch (error) {
		console.error('Failed to load refund policies', error);
		return null;
	}
};

const pickRefundTier = (policy: RefundPolicySchema, effectiveDay: number): RefundTierSchema | null => {
	if (!policy.tiers || policy.tiers.length === 0) {
		return null;
	}

	const sorted = [...policy.tiers].sort((a, b) => a.startDay - b.startDay);
	for (const tier of sorted) {
		const start = tier.startDay ?? 0;
		const end = tier.endDay ?? Number.POSITIVE_INFINITY;
		if (effectiveDay >= start && effectiveDay <= end) {
			return tier;
		}
	}

	let fallback: RefundTierSchema | null = null;
	for (const tier of sorted) {
		if (effectiveDay >= tier.startDay) {
			fallback = tier;
		}
	}
	return fallback ?? sorted[sorted.length - 1];
};

const determineRefundForCancellation = async (
	subscription: SubscriptionRequestSchema,
	cancellationDate: Date,
): Promise<{
		info: SubscriptionRefundInfo | null;
		walletAdjustment?: { userId: string; amount: number; source: RefundSource };
	}> => {
	const duration = Math.max(0, subscription.durationDays ?? 0);
	const totalPayable = subscription.summary?.totalPayable ?? 0;
	const startDate = subscription.startDate ?? null;
	const processedAt = cancellationDate;
	const currency = 'INR';

	if (duration <= 0) {
		return {
			info: {
				amount: 0,
				currency,
				percentApplied: 0,
				source: 'coins',
				remainingAmount: 0,
				remainingDays: 0,
				processedAt,
			},
		};
	}

	let consumedDays = 0;
	if (startDate instanceof Date) {
		const startMidnight = normalizeToMidnight(startDate);
		const cancelMidnight = normalizeToMidnight(cancellationDate);
		if (cancelMidnight < startMidnight) {
			consumedDays = 0;
		} else {
			const diff = Math.floor((cancelMidnight.getTime() - startMidnight.getTime()) / DAY_IN_MS);
			consumedDays = Math.min(duration, diff + 1);
		}
	}

	const remainingDays = Math.max(0, duration - consumedDays);
	const remainingAmount = remainingDays > 0 ? roundCurrency((totalPayable / duration) * remainingDays) : 0;

	const policy = await findApplicableRefundPolicy(subscription);
	const effectiveDay = consumedDays;
	const tier = policy ? pickRefundTier(policy, effectiveDay) : null;
	const percentApplied = tier ? Math.min(100, Math.max(0, tier.refundPercent)) : 0;
	const refundAmount = percentApplied > 0 ? roundCurrency((remainingAmount * percentApplied) / 100) : 0;
	const source: RefundSource = tier?.refundSource ?? 'coins';

	const info: SubscriptionRefundInfo = {
		amount: refundAmount,
		currency,
		percentApplied,
		source,
		tierLabel: tier?.label ?? policy?.name ?? null,
		notes: tier?.notes ?? policy?.description ?? null,
		remainingAmount,
		remainingDays,
		processedAt,
	};

	const walletAdjustment = refundAmount > 0 && source === 'coins' && subscription.userId
		? { userId: subscription.userId, amount: refundAmount, source }
		: undefined;

	return { info, walletAdjustment };
};

const mapDoc = (docId: string, data: Record<string, unknown>): SubscriptionRequestSchema => {
	const summary = normalizeSummary(data.summary);
	const status = isSubscriptionRequestStatus(data.status)
		? (data.status as SubscriptionRequestStatus)
		: 'pending';

	const notes = toStringOrNull(data.notes);
	const statusNote = toStringOrNull(data.statusNote);
	const reviewedBy = toStringOrNull(data.reviewedBy);
	const reviewedByName = toStringOrNull(data.reviewedByName);

	const durationDays = Number.isFinite(data.durationDays)
		? Math.max(1, Math.round(Number(data.durationDays)))
		: summary.durationDays;

	return {
		id: docId,
		userId: toStringSafe(data.userId),
		customerShortId: toStringOrNull(data.customerShortId),
		userName: toStringSafe(data.userName),
		userEmail: toStringOrNull(data.userEmail),
		userPhone: toStringOrNull(data.userPhone),
		categoryId: toStringSafe(data.categoryId),
		categoryName: toStringSafe(data.categoryName),
		dietPreference: normalizeDietPreference(data.dietPreference),
		durationDays,
		startDate: toDate(data.startDate) ?? new Date(),
		endDate: toDate(data.endDate) ?? toDate(data.startDate) ?? new Date(),
		selections: normalizeSelections(data.selections),
		summary,
		notes,
		status,
		pausedMeals: normalizePausedMeals(data.pausedMeals),
		statusNote,
		reviewedBy,
		reviewedByName,
		reviewedAt: toDate(data.reviewedAt) ?? null,
		cancelledAt: toDate(data.cancelledAt) ?? null,
		refundInfo: normalizeRefundInfo(data.refundInfo),
		createdAt: toDate(data.createdAt),
		updatedAt: toDate(data.updatedAt),
		deliveryLocationId: toStringOrNull(data.deliveryLocationId),
		deliveryLocationName: toStringOrNull(data.deliveryLocationName),
		deliveryLocationAddress: toStringOrNull(data.deliveryLocationAddress),
		deliveryLocationCoordinates: toStringOrNull(data.deliveryLocationCoordinates),
		deliveryLocationLandmark: toStringOrNull(data.deliveryLocationLandmark),
		deliveryLocationContactName: toStringOrNull(data.deliveryLocationContactName),
		deliveryLocationContactPhone: toStringOrNull(data.deliveryLocationContactPhone),
		paymentProofImageBase64: toStringOrNull(data.paymentProofImageBase64),
		paymentProofFileName: toStringOrNull(data.paymentProofFileName),
	} satisfies SubscriptionRequestSchema;
};

const mapSelectionInput = (selection: SubscriptionRequestSelection): Record<string, unknown> => ({
	mealType: selection.mealType,
	packageId: selection.packageId,
	packageName: selection.packageName,
	pricePerDay: toCurrency(selection.pricePerDay),
	totalPrice: toCurrency(selection.totalPrice),
});

const mapSummaryInput = (summary: SubscriptionRequestSummary): Record<string, unknown> => ({
	durationDays: Math.max(1, Math.round(summary.durationDays)),
	subtotal: toCurrency(summary.subtotal),
	discountPercent: toPercent(summary.discountPercent),
	discountAmount: toCurrency(summary.discountAmount),
	couponCode: summary.couponCode ? summary.couponCode.trim().toUpperCase() : null,
	couponDiscountAmount: toCurrency(summary.couponDiscountAmount),
	totalPayable: toCurrency(summary.totalPayable),
});

const resolveSubscriberRoleId = async (): Promise<string | null> => {
	try {
		const config = await ConfigModel.get();
		if (config.defaultSubscriberRoleId) {
			return config.defaultSubscriberRoleId;
		}
	} catch (error) {
		console.error('Failed to load config when resolving subscriber role', error);
	}

	try {
		const fallbackRole = await RoleModel.findByName('Subscriber');
		if (fallbackRole?.id) {
			return fallbackRole.id;
		}
	} catch (error) {
		console.error('Failed to find fallback Subscriber role', error);
	}

	return null;
};

export class SubscriptionRequestModel {
	static collectionName = COLLECTION_NAME;

	static async findAll(): Promise<SubscriptionRequestSchema[]> {
		const requestsQuery = query(
			collection(db, this.collectionName),
			orderBy('createdAt', 'desc'),
		);
		const snapshot = await getDocs(requestsQuery);
		return snapshot.docs.map((docSnap) => mapDoc(docSnap.id, docSnap.data()));
	}

	static async findById(id: string): Promise<SubscriptionRequestSchema | null> {
		const ref = doc(db, this.collectionName, id);
		const snap = await getDoc(ref);
		if (!snap.exists()) {
			return null;
		}
		return mapDoc(snap.id, snap.data());
	}

	static async create(input: SubscriptionRequestCreateInput): Promise<string> {
		const payload: DocumentData = {
			userId: input.userId,
			customerShortId: toStringOrNull(input.customerShortId),
			userName: input.userName.trim(),
			userEmail: input.userEmail ? input.userEmail.trim().toLowerCase() : null,
			userPhone: input.userPhone ? input.userPhone.trim() : null,
			categoryId: input.categoryId,
			categoryName: input.categoryName.trim(),
			dietPreference: normalizeDietPreference(input.dietPreference),
			durationDays: Math.max(1, Math.round(input.durationDays)),
			startDate: Timestamp.fromDate(input.startDate),
			endDate: Timestamp.fromDate(input.endDate),
			selections: input.selections.map(mapSelectionInput),
			summary: mapSummaryInput(input.summary),
			status: 'pending',
			notes: input.notes ? input.notes.trim() : null,
			deliveryLocationId: toStringOrNull(input.deliveryLocationId),
			deliveryLocationName: toStringOrNull(input.deliveryLocationName),
			deliveryLocationAddress: toStringOrNull(input.deliveryLocationAddress),
			deliveryLocationCoordinates: toStringOrNull(input.deliveryLocationCoordinates),
			deliveryLocationLandmark: toStringOrNull(input.deliveryLocationLandmark),
			deliveryLocationContactName: toStringOrNull(input.deliveryLocationContactName),
			deliveryLocationContactPhone: toStringOrNull(input.deliveryLocationContactPhone),
			paymentProofImageBase64: input.paymentProofImageBase64 ? input.paymentProofImageBase64.trim() : null,
			paymentProofFileName: input.paymentProofFileName ? input.paymentProofFileName.trim() : null,
			pausedMeals: [],
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
			reviewedAt: null,
			reviewedBy: null,
			reviewedByName: null,
			statusNote: null,
		} satisfies DocumentData;

		const docRef = await addDoc(collection(db, this.collectionName), payload);
		return docRef.id;
	}

	static async previewCancellation(
		id: string,
		options?: { cancellationDate?: Date },
	): Promise<SubscriptionRefundInfo | null> {
		const ref = doc(db, this.collectionName, id);
		const existingSnap = await getDoc(ref);
		if (!existingSnap.exists()) {
			throw new Error('Subscription request not found');
		}
		const existingRequest = mapDoc(existingSnap.id, existingSnap.data() as Record<string, unknown>);
		if (existingRequest.status === 'cancelled') {
			return existingRequest.refundInfo ?? null;
		}
		const cancellationDate = options?.cancellationDate ?? new Date();
		const refundOutcome = await determineRefundForCancellation(existingRequest, cancellationDate);
		return refundOutcome.info ?? null;
	}

	static async updateStatus(id: string, input: SubscriptionRequestStatusUpdateInput): Promise<void> {
		const ref = doc(db, this.collectionName, id);
		const existingSnap = await getDoc(ref);
		if (!existingSnap.exists()) {
			throw new Error('Subscription request not found');
		}
		const existingRequest = mapDoc(existingSnap.id, existingSnap.data() as Record<string, unknown>);

		const status: SubscriptionRequestStatus = SUBSCRIPTION_REQUEST_STATUSES.includes(input.status)
			? input.status
			: 'pending';

		const payload: DocumentData = {
			status,
			statusNote: input.statusNote ? input.statusNote.trim() : null,
			reviewedBy: input.reviewedBy,
			reviewedByName: input.reviewedByName ? input.reviewedByName.trim() : null,
			reviewedAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		} satisfies DocumentData;

		let walletAdjustmentApplied = false;
		let walletAdjustment: { userId: string; amount: number; source: RefundSource } | undefined;

		if (status === 'cancelled' && existingRequest.status !== 'cancelled') {
			const cancellationDate = new Date();
			const refundOutcome = await determineRefundForCancellation(existingRequest, cancellationDate);
			const refundInfo = refundOutcome.info
				? {
					...refundOutcome.info,
					processedById: input.reviewedBy,
					processedByName: input.reviewedByName ?? null,
				}
				: null;
			payload.cancelledAt = Timestamp.fromDate(cancellationDate);
			payload.refundInfo = formatRefundInfoForWrite(refundInfo);
			walletAdjustment = refundOutcome.walletAdjustment;
		}

		try {
			if (walletAdjustment && walletAdjustment.amount > 0) {
				await WalletModel.addCoins(walletAdjustment.userId, walletAdjustment.amount);
				walletAdjustmentApplied = true;
			}

			await updateDoc(ref, payload);
		} catch (error) {
			if (walletAdjustmentApplied && walletAdjustment) {
				try {
					await WalletModel.addCoins(walletAdjustment.userId, -walletAdjustment.amount);
				} catch (rollbackError) {
					console.error('Failed to rollback wallet refund after cancellation error', rollbackError);
				}
			}
			throw error;
		}

		if (status === 'approved') {
			try {
				const subscriberRoleId = await resolveSubscriberRoleId();
				if (subscriberRoleId) {
					const userId = existingRequest.userId;
					if (userId) {
						const user = await UserModel.findById(userId);
						if (user) {
							const existingRoles = Array.isArray(user.roles) ? user.roles.filter((role): role is string => typeof role === 'string' && role.trim().length > 0) : [];
							if (!existingRoles.includes(subscriberRoleId)) {
								await UserModel.updateById(userId, { roles: [...existingRoles, subscriberRoleId] });
							}
						} else {
							console.warn(`Subscriber approval succeeded but user ${userId} was not found.`);
						}
					}
				} else {
					console.warn('Subscriber approval succeeded but no subscriber role is configured.');
				}
			} catch (error) {
				console.error('Failed to assign subscriber role on approval', error);
			}
		}
	}

	static async update(id: string, updates: Partial<SubscriptionRequestSchema>): Promise<void> {
		const ref = doc(db, this.collectionName, id);
		const existingSnap = await getDoc(ref);
		if (!existingSnap.exists()) {
			throw new Error('Subscription request not found');
		}
		const existingRequest = mapDoc(existingSnap.id, existingSnap.data() as Record<string, unknown>);

		const sanitized: Record<string, unknown> = { ...updates };
		delete sanitized.refundInfo;
		delete sanitized.cancelledAt;

		if (Object.prototype.hasOwnProperty.call(sanitized, 'status')) {
			const rawStatus = sanitized.status as unknown;
			if (isSubscriptionRequestStatus(rawStatus)) {
				sanitized.status = rawStatus;
			} else {
				delete sanitized.status;
			}
		}

		let walletAdjustmentApplied = false;
		let walletAdjustment: { userId: string; amount: number; source: RefundSource } | undefined;
		const nextStatus = sanitized.status as SubscriptionRequestStatus | undefined;
		if (nextStatus === 'cancelled' && existingRequest.status !== 'cancelled') {
			const cancellationDate = new Date();
			const refundOutcome = await determineRefundForCancellation(existingRequest, cancellationDate);
			const incomingRefundInfo = (updates as Partial<SubscriptionRequestSchema>).refundInfo;
			const refundInfo = refundOutcome.info
				? {
					...refundOutcome.info,
					processedById: incomingRefundInfo?.processedById ?? null,
					processedByName: incomingRefundInfo?.processedByName ?? null,
				}
				: null;
			sanitized.cancelledAt = Timestamp.fromDate(cancellationDate);
			sanitized.refundInfo = formatRefundInfoForWrite(refundInfo);
			walletAdjustment = refundOutcome.walletAdjustment;
		}

		const assignLocationField = (field: keyof SubscriptionRequestSchema) => {
			if (Object.prototype.hasOwnProperty.call(updates, field)) {
				sanitized[field as string] = toStringOrNull((updates as Record<string, unknown>)[field as string]);
			}
		};

		assignLocationField('deliveryLocationId');
		assignLocationField('deliveryLocationName');
		assignLocationField('deliveryLocationAddress');
		assignLocationField('deliveryLocationCoordinates');
		assignLocationField('deliveryLocationLandmark');
		assignLocationField('deliveryLocationContactName');
		assignLocationField('deliveryLocationContactPhone');

		if (Object.prototype.hasOwnProperty.call(updates, 'paymentProofImageBase64')) {
			const raw = (updates as Record<string, unknown>).paymentProofImageBase64;
			if (typeof raw === 'string') {
				const trimmed = raw.trim();
				sanitized.paymentProofImageBase64 = trimmed.length > 0 ? trimmed : null;
			} else {
				sanitized.paymentProofImageBase64 = null;
			}
		}

		if (Object.prototype.hasOwnProperty.call(updates, 'paymentProofFileName')) {
			const raw = (updates as Record<string, unknown>).paymentProofFileName;
			if (typeof raw === 'string') {
				sanitized.paymentProofFileName = raw.trim() || null;
			} else {
				sanitized.paymentProofFileName = null;
			}
		}

		if (Object.prototype.hasOwnProperty.call(updates, 'customerShortId')) {
			sanitized.customerShortId = toStringOrNull((updates as Record<string, unknown>).customerShortId);
		}

		if (Object.prototype.hasOwnProperty.call(updates, 'pausedMeals')) {
			const nextPaused = normalizePausedMeals((updates as Record<string, unknown>).pausedMeals);
			const currentPaused = normalizePausedMeals(existingRequest.pausedMeals ?? []);
			sanitized.pausedMeals = nextPaused;

			const makeKey = (pm: PausedMeal) => `${pm.date}__${pm.mealType}`;
			const currentSet = new Set(currentPaused.map(makeKey));
			const nextSet = new Set(nextPaused.map(makeKey));

			let addedCount = 0;
			let removedCount = 0;

			for (const key of nextSet) {
				if (!currentSet.has(key)) {
					addedCount += 1;
				}
			}

			for (const key of currentSet) {
				if (!nextSet.has(key)) {
					removedCount += 1;
				}
			}

			const perMealCoins = computePerMealValueInCoins(existingRequest);
			if (perMealCoins > 0 && existingRequest.userId) {
				const netMeals = addedCount - removedCount;
				const netCoins = netMeals * perMealCoins;
				if (netCoins !== 0) {
					walletAdjustment = {
						userId: existingRequest.userId,
						amount: netCoins,
						source: 'coins',
					};
				}
			}
		}

		Object.keys(sanitized).forEach((key) => {
			if (sanitized[key] === undefined) {
				delete sanitized[key];
			}
		});

		const payload: DocumentData = {
			...sanitized,
			updatedAt: serverTimestamp(),
		};

		try {
			if (walletAdjustment && walletAdjustment.amount !== 0) {
				await WalletModel.addCoins(walletAdjustment.userId, walletAdjustment.amount);
				walletAdjustmentApplied = true;
			}

			await updateDoc(ref, payload);
		} catch (error) {
			if (walletAdjustmentApplied && walletAdjustment) {
				try {
					await WalletModel.addCoins(walletAdjustment.userId, -walletAdjustment.amount);
				} catch (rollbackError) {
					console.error('Failed to rollback wallet refund after cancellation error', rollbackError);
				}
			}
			throw error;
		}
	}

	// Server-side paginated search
	static async searchPaginated(
		pagination: PaginationParams,
		search: SearchParams | null = null
	): Promise<{ data: SubscriptionRequestSchema[]; total: number }> {
		const rawData = await executeSearchQuery<DocumentData>(
			this.collectionName,
			search,
			pagination
		);
		// Map the raw document data through mapDoc to properly deserialize dates and other fields
		const data = rawData.map((doc) => mapDoc(doc.id as string, doc as Record<string, unknown>));
		const total = await executeSearchQueryCount(
			this.collectionName,
			search
		);
		return { data, total };
	}
}

