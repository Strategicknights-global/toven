import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  limit,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  RefundPolicySchema,
  RefundPolicyCreateInput,
  RefundPolicyUpdateInput,
  RefundTierSchema,
} from '../schemas/RefundPolicySchema';
import { RefundPolicyCreate, RefundPolicyUpdate } from '../schemas/RefundPolicySchema';
import { type as ark } from 'arktype';
import { executeSearchQuery, executeSearchQueryCount, type SearchParams, type PaginationParams } from '../utils/firestoreSearch';

const COLLECTION_NAME = 'refundPolicies';

const toDate = (value: unknown): Date | undefined => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return undefined;
};

const sanitizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const sanitizeBoolean = (value: unknown, fallback: boolean): boolean => {
  return typeof value === 'boolean' ? value : fallback;
};

const sanitizeNumber = (value: unknown, fallback = 0): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const sanitizePositiveInt = (value: unknown, fallback = 0): number => {
  const numeric = sanitizeNumber(value, fallback);
  const rounded = Math.max(0, Math.round(numeric));
  return Number.isFinite(rounded) ? rounded : fallback;
};

const sanitizePercent = (value: unknown, fallback = 0): number => {
  const numeric = sanitizeNumber(value, fallback);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(100, Math.max(0, numeric));
};

const sanitizeStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const cleaned = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
  return cleaned.length > 0 ? cleaned : undefined;
};

const mapTier = (value: unknown, index: number): RefundTierSchema | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;

  const startDay = sanitizePositiveInt(record.startDay, index === 0 ? 0 : index);
  const tier: RefundTierSchema = {
    id: typeof record.id === 'string' && record.id.trim() ? record.id.trim() : undefined,
    label: sanitizeString(record.label),
    startDay,
    refundPercent: sanitizePercent(record.refundPercent, 0),
    refundSource: record.refundSource === 'coins' ? 'coins' : 'coins',
    notes: sanitizeString(record.notes),
  };

  if (record.endDay !== undefined && record.endDay !== null && record.endDay !== '') {
    tier.endDay = sanitizePositiveInt(record.endDay, startDay);
  }

  return tier;
};

const mapDoc = (docId: string, data: Record<string, unknown>): RefundPolicySchema => {
  const tiersValue = Array.isArray(data.tiers) ? data.tiers : [];
  const tiers = tiersValue
    .map((tier, index) => mapTier(tier, index))
    .filter((tier): tier is RefundTierSchema => Boolean(tier));

  return {
    id: docId,
    name: sanitizeString(data.name) ?? 'Untitled Policy',
    description: sanitizeString(data.description),
    subscriptionLengthDays: sanitizePositiveInt(data.subscriptionLengthDays, 0),
    subscriptionDayDiscountId: sanitizeString(data.subscriptionDayDiscountId),
    tiers,
    appliesToProductIds: sanitizeStringArray(data.appliesToProductIds),
    appliesToCategoryIds: sanitizeStringArray(data.appliesToCategoryIds),
    active: sanitizeBoolean(data.active, true),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
};

const formatTierForWrite = (tier: RefundTierSchema): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    label: tier.label ?? '',
    startDay: sanitizePositiveInt(tier.startDay, 0),
    endDay: tier.endDay !== undefined ? sanitizePositiveInt(tier.endDay, tier.startDay) : null,
    refundPercent: sanitizePercent(tier.refundPercent, 0),
    refundSource: tier.refundSource ?? 'coins',
    notes: tier.notes ?? '',
  };

  if (tier.id && tier.id.trim()) {
    payload.id = tier.id.trim();
  }

  return payload;
};

export class RefundPolicyModel {
  static collectionName = COLLECTION_NAME;

  static async findAll(): Promise<RefundPolicySchema[]> {
    const snapshot = await getDocs(collection(db, this.collectionName));
    return snapshot.docs.map((docSnap) => mapDoc(docSnap.id, docSnap.data()))
      .sort((a, b) => a.subscriptionLengthDays - b.subscriptionLengthDays);
  }

  static async findById(id: string): Promise<RefundPolicySchema | null> {
    const ref = doc(db, this.collectionName, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    return mapDoc(snap.id, snap.data());
  }

  static async findBySubscriptionLength(days: number): Promise<RefundPolicySchema | null> {
    const length = sanitizePositiveInt(days, 0);
    const policyQuery = query(
      collection(db, this.collectionName),
      where('subscriptionLengthDays', '==', length),
      limit(1),
    );
    const snapshot = await getDocs(policyQuery);
    if (snapshot.empty) {
      return null;
    }
    const docSnap = snapshot.docs[0];
    return mapDoc(docSnap.id, docSnap.data());
  }

  static async create(input: RefundPolicyCreateInput): Promise<string> {
    const validation = RefundPolicyCreate(input as unknown);
    if (validation instanceof ark.errors) {
      throw new Error(`RefundPolicy validation failed: ${String(validation)}`);
    }
    const payload: DocumentData = {
      name: sanitizeString(input.name) ?? 'Untitled Policy',
      description: sanitizeString(input.description) ?? '',
      subscriptionLengthDays: sanitizePositiveInt(input.subscriptionLengthDays, 0),
      subscriptionDayDiscountId: sanitizeString(input.subscriptionDayDiscountId) ?? null,
      tiers: (input.tiers ?? []).map(formatTierForWrite),
      appliesToProductIds: sanitizeStringArray(input.appliesToProductIds) ?? [],
      appliesToCategoryIds: sanitizeStringArray(input.appliesToCategoryIds) ?? [],
      active: sanitizeBoolean(input.active, true),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, this.collectionName), payload);
    return docRef.id;
  }

  static async update(id: string, input: RefundPolicyUpdateInput): Promise<void> {
    const validation = RefundPolicyUpdate(input as unknown);
    if (validation instanceof ark.errors) {
      throw new Error(`RefundPolicy update validation failed: ${String(validation)}`);
    }

    const payload: DocumentData = {
      updatedAt: serverTimestamp(),
    };

    if (input.name !== undefined) {
      payload.name = sanitizeString(input.name) ?? 'Untitled Policy';
    }

    if (input.description !== undefined) {
      payload.description = sanitizeString(input.description) ?? '';
    }

    if (input.subscriptionLengthDays !== undefined) {
      payload.subscriptionLengthDays = sanitizePositiveInt(input.subscriptionLengthDays, 0);
    }

    if (input.subscriptionDayDiscountId !== undefined) {
      payload.subscriptionDayDiscountId = sanitizeString(input.subscriptionDayDiscountId) ?? null;
    }

    if (input.tiers !== undefined) {
      payload.tiers = input.tiers.map(formatTierForWrite);
    }

    if (input.appliesToProductIds !== undefined) {
      payload.appliesToProductIds = sanitizeStringArray(input.appliesToProductIds) ?? [];
    }

    if (input.appliesToCategoryIds !== undefined) {
      payload.appliesToCategoryIds = sanitizeStringArray(input.appliesToCategoryIds) ?? [];
    }

    if (input.active !== undefined) {
      payload.active = sanitizeBoolean(input.active, true);
    }

    await updateDoc(doc(db, this.collectionName, id), payload);
  }

  static async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, id));
  }

  // Server-side paginated search
  static async searchPaginated(
    pagination: PaginationParams,
    search: SearchParams | null = null
  ): Promise<{ data: RefundPolicySchema[]; total: number }> {
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
