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
import type {
  AddonRequestCreateInput,
  AddonRequestItem,
  AddonRequestSchema,
  AddonRequestStatus,
  AddonRequestStatusUpdateInput,
} from '../schemas/AddonRequestSchema';
import {
  ADDON_REQUEST_STATUSES,
  normalizeAddonRequestItems,
  normalizeAddonRequestSummary,
} from '../schemas/AddonRequestSchema';
import { WalletModel } from './WalletModel';
import { executeSearchQuery, executeSearchQueryCount, type SearchParams, type PaginationParams } from '../utils/firestoreSearch';

const COLLECTION_NAME = 'addonRequests';

const toDate = (value: unknown): Date | undefined => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  if (typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return undefined;
};

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toStringSafe = (value: unknown, fallback = ''): string => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const clampNonNegative = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }
  return Math.round(numeric * 100) / 100;
};

const mapDoc = (docId: string, data: Record<string, unknown>): AddonRequestSchema => {
  const statusValue = typeof data.status === 'string' ? data.status : 'pending';
  const status: AddonRequestStatus = ADDON_REQUEST_STATUSES.includes(statusValue as AddonRequestStatus)
    ? (statusValue as AddonRequestStatus)
    : 'pending';

  const deliveryDateKey = toStringSafe(data.deliveryDateKey);
  const deliveryDate = toDate(data.deliveryDate) ?? (deliveryDateKey ? new Date(`${deliveryDateKey}T00:00:00`) : new Date());
  const itemsRaw = Array.isArray(data.items) ? (data.items as Record<string, unknown>[]) : [];
  const summaryRaw = (data.summary ?? {}) as Record<string, unknown>;

  const items = itemsRaw.map((item) => ({
    addonId: toStringSafe(item.addonId),
    addonName: toStringSafe(item.addonName),
  category: toStringSafe(item.category) as unknown as AddonRequestItem['category'],
  mealType: toStringSafe(item.mealType) as unknown as AddonRequestItem['mealType'],
    quantity: clampNonNegative(item.quantity),
    coinsPerUnit: clampNonNegative(item.coinsPerUnit),
    discountCoinsPerUnit: clampNonNegative(item.discountCoinsPerUnit),
    totalCoins: clampNonNegative(item.totalCoins),
    totalDiscountCoins: clampNonNegative(item.totalDiscountCoins),
  }));

  return {
    id: docId,
    userId: toStringSafe(data.userId),
    userName: toStringSafe(data.userName),
    userEmail: toStringOrNull(data.userEmail),
    userPhone: toStringOrNull(data.userPhone),
    deliveryDateKey,
    deliveryDate,
    items,
    summary: {
      totalQuantity: clampNonNegative(summaryRaw.totalQuantity),
      totalCoins: clampNonNegative(summaryRaw.totalCoins),
      totalDiscountCoins: clampNonNegative(summaryRaw.totalDiscountCoins),
    },
    status,
    statusNote: toStringOrNull(data.statusNote),
    reviewedBy: toStringOrNull(data.reviewedBy),
    reviewedByName: toStringOrNull(data.reviewedByName),
    reviewedAt: toDate(data.reviewedAt) ?? null,
    walletDebitedCoins: clampNonNegative(data.walletDebitedCoins),
    walletDebitedAt: toDate(data.walletDebitedAt) ?? null,
    walletRefundedCoins: clampNonNegative(data.walletRefundedCoins),
    walletRefundedAt: toDate(data.walletRefundedAt) ?? null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } satisfies AddonRequestSchema;
};

const mapItemsInput = (items: AddonRequestCreateInput['items']): Record<string, unknown>[] => {
  const normalized = normalizeAddonRequestItems(items);
  return normalized.map((item) => ({
    addonId: item.addonId,
    addonName: item.addonName,
    category: item.category,
    mealType: item.mealType,
    quantity: item.quantity,
    coinsPerUnit: item.coinsPerUnit,
    discountCoinsPerUnit: item.discountCoinsPerUnit,
    totalCoins: item.totalCoins,
    totalDiscountCoins: item.totalDiscountCoins,
  }));
};

export class AddonRequestModel {
  static collectionName = COLLECTION_NAME;

  static async findAll(): Promise<AddonRequestSchema[]> {
    const requestsQuery = query(collection(db, this.collectionName), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(requestsQuery);
    return snapshot.docs.map((docSnap) => mapDoc(docSnap.id, docSnap.data()));
  }

  static async findById(id: string): Promise<AddonRequestSchema | null> {
    const ref = doc(db, this.collectionName, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    return mapDoc(snap.id, snap.data());
  }

  static async create(input: AddonRequestCreateInput, status: AddonRequestStatus = 'pending'): Promise<string> {
    const normalizedSummary = normalizeAddonRequestSummary(input.summary);
    const coinsToCharge = Math.max(0, normalizedSummary.totalCoins);

    if (coinsToCharge > 0) {
      const wallet = await WalletModel.findByCustomerId(input.userId);
      if (!wallet) {
        throw new Error('Wallet not found for this user. Please contact support.');
      }
      const currentBalance = wallet.coins ?? 0;
      if (currentBalance < coinsToCharge) {
        throw new Error('Insufficient wallet coins. Please top up your balance before placing this order.');
      }
    }

    let walletDebited = false;
    try {
      if (coinsToCharge > 0) {
        await WalletModel.addCoins(input.userId, -coinsToCharge);
        walletDebited = true;
      }

      const payload: DocumentData = {
        userId: input.userId,
        userName: input.userName.trim(),
        userEmail: input.userEmail ? input.userEmail.trim().toLowerCase() : null,
        userPhone: input.userPhone ? input.userPhone.trim() : null,
        deliveryDateKey: input.deliveryDateKey,
        deliveryDate: Timestamp.fromDate(input.deliveryDate),
        items: mapItemsInput(input.items),
        summary: normalizedSummary,
        status: status,
        statusNote: input.notes ? input.notes.trim() : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        reviewedAt: null,
        reviewedBy: null,
        reviewedByName: null,
        walletDebitedCoins: coinsToCharge > 0 ? coinsToCharge : 0,
        walletDebitedAt: coinsToCharge > 0 ? serverTimestamp() : null,
        walletRefundedCoins: 0,
        walletRefundedAt: null,
      } satisfies DocumentData;

      const docRef = await addDoc(collection(db, this.collectionName), payload);
      return docRef.id;
    } catch (error) {
      if (walletDebited && coinsToCharge > 0) {
        try {
          await WalletModel.addCoins(input.userId, coinsToCharge);
        } catch (rollbackError) {
          console.error('Failed to rollback wallet debit after addon order error', rollbackError);
        }
      }
      throw error;
    }
  }

  static async updateStatus(id: string, input: AddonRequestStatusUpdateInput): Promise<void> {
    const ref = doc(db, this.collectionName, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error('Addon request not found');
    }

    const existingRequest = mapDoc(snap.id, snap.data() as Record<string, unknown>);
    const previousStatus = existingRequest.status;

    const statusValue: AddonRequestStatus = ADDON_REQUEST_STATUSES.includes(input.status)
      ? input.status
      : 'pending';

    const payload: DocumentData = {
      status: statusValue,
      statusNote: input.statusNote ? input.statusNote.trim() : null,
      reviewedBy: input.reviewedBy,
      reviewedByName: input.reviewedByName ? input.reviewedByName.trim() : null,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } satisfies DocumentData;

    const shouldRefund = statusValue === 'cancelled'
      && previousStatus !== 'cancelled'
      && (existingRequest.walletRefundedCoins ?? 0) <= 0;

    const refundAmount = shouldRefund ? Math.max(0, existingRequest.walletDebitedCoins ?? existingRequest.summary.totalCoins ?? 0) : 0;

    let walletRefundApplied = false;

    try {
      if (refundAmount > 0 && existingRequest.userId) {
        await WalletModel.addCoins(existingRequest.userId, refundAmount);
        walletRefundApplied = true;
        payload.walletRefundedCoins = refundAmount;
        payload.walletRefundedAt = serverTimestamp();
      }

      await updateDoc(ref, payload);
    } catch (error) {
      if (walletRefundApplied && refundAmount > 0 && existingRequest.userId) {
        try {
          await WalletModel.addCoins(existingRequest.userId, -refundAmount);
        } catch (rollbackError) {
          console.error('Failed to rollback wallet refund after addon cancellation error', rollbackError);
        }
      }
      throw error;
    }
  }

  // Server-side paginated search
  static async searchPaginated(
    pagination: PaginationParams,
    search: SearchParams | null = null
  ): Promise<{ data: AddonRequestSchema[]; total: number }> {
    const rawData = await executeSearchQuery<Record<string, unknown>>(
      this.collectionName,
      search,
      pagination
    );
    const data = rawData.map((doc) => mapDoc(doc.id as string, doc));
    const total = await executeSearchQueryCount(
      this.collectionName,
      search
    );
    return { data, total };
  }
}
