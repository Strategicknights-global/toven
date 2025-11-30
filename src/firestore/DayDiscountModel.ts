import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  DayDiscountCreateInput,
  DayDiscountSchema,
  DayDiscountScope,
  DayDiscountType,
  DayDiscountUpdateInput,
  DayDiscountMatchType,
} from '../schemas/DayDiscountSchema';
import { executeSearchQuery, executeSearchQueryCount, type SearchParams, type PaginationParams } from '../utils/firestoreSearch';

const COLLECTION_NAME = 'dayDiscounts';

const sanitizeLabel = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
};

const sanitizePercentage = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  if (numeric < 0) {
    return 0;
  }
  if (numeric > 100) {
    return 100;
  }
  return Math.round(numeric * 100) / 100;
};

const sanitizeAmount = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  if (numeric < 0) {
    return 0;
  }
  return Math.round(numeric * 100) / 100;
};

const sanitizeDayCount = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 1;
  }
  if (numeric <= 0) {
    return 1;
  }
  const rounded = Math.round(numeric);
  return rounded > 0 ? rounded : 1;
};

const sanitizeStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const cleaned = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
  return cleaned.length > 0 ? cleaned : undefined;
};

const sanitizeDiscountType = (value: unknown): DayDiscountType => {
  return value === 'amount' ? 'amount' : 'percentage';
};

const sanitizeScope = (value: unknown): DayDiscountScope => {
  if (value === 'categories' || value === 'packages') {
    return value;
  }
  return 'all';
};

const sanitizeMatchType = (value: unknown): DayDiscountMatchType => {
  return value === 'any' ? 'any' : 'all';
};

const sanitizeDiscountValue = (value: unknown, type: DayDiscountType): number => {
  return type === 'amount' ? sanitizeAmount(value) : sanitizePercentage(value);
};

const sanitizeDescription = (value: unknown): string | null | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || null;
};

const mapDoc = (docId: string, data: Record<string, unknown>): DayDiscountSchema => {
  const toDate = (value: unknown): Date | undefined => {
    if (value instanceof Timestamp) {
      return value.toDate();
    }
    if (value instanceof Date) {
      return value;
    }
    return undefined;
  };

  const discountType = sanitizeDiscountType(data.discountType);
  let rawValue: unknown;
  if (typeof data.discountValue === 'number') {
    rawValue = data.discountValue;
  } else if (discountType === 'percentage' && typeof data.percentage === 'number') {
    rawValue = data.percentage;
  } else if (discountType === 'amount' && typeof data.amountOff === 'number') {
    rawValue = data.amountOff;
  }

  const scope = sanitizeScope(data.scope);
  const categoryIds = sanitizeStringArray(data.categoryIds);
  const packageIds = sanitizeStringArray(data.packageIds);
  const matchType = sanitizeMatchType(
    scope === 'packages' || scope === 'categories' ? data.matchType : undefined
  );

  return {
    id: docId,
    label: sanitizeLabel(data.label) ?? '',
    description: sanitizeDescription(data.description),
    dayCount: sanitizeDayCount(
      data.dayCount ?? (Array.isArray(data.days) ? (data.days as unknown[]).length : undefined),
    ),
    discountType,
    discountValue: sanitizeDiscountValue(rawValue, discountType),
    scope,
    categoryIds,
    packageIds,
    matchType,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
};

export class DayDiscountModel {
  static collectionName = COLLECTION_NAME;

  static async findAll(): Promise<DayDiscountSchema[]> {
    const snapshot = await getDocs(collection(db, this.collectionName));
    return snapshot.docs.map((docSnap) => mapDoc(docSnap.id, docSnap.data()));
  }

  static async findById(id: string): Promise<DayDiscountSchema | null> {
    const ref = doc(db, this.collectionName, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    return mapDoc(snap.id, snap.data());
  }

  static async create(input: DayDiscountCreateInput): Promise<string> {
    const label = sanitizeLabel(input.label) ?? '';
    if (!label) {
      throw new Error('Discount label is required.');
    }

    const dayCount = sanitizeDayCount(input.dayCount);
    const discountType = sanitizeDiscountType(input.discountType);
    const scope = sanitizeScope(input.scope);
    const value = sanitizeDiscountValue(input.discountValue, discountType);
    const categoryIds = sanitizeStringArray(input.categoryIds);
    const packageIds = sanitizeStringArray(input.packageIds);
    const matchType = sanitizeMatchType(
      scope === 'packages' || scope === 'categories' ? input.matchType : undefined
    );

    if (scope === 'categories' && (!categoryIds || categoryIds.length === 0)) {
      throw new Error('Select at least one category.');
    }

    if (scope === 'packages' && (!packageIds || packageIds.length === 0)) {
      throw new Error('Select at least one package.');
    }

    const payload: DocumentData = {
      label,
      description: input.description ?? null,
      dayCount,
      discountType,
      discountValue: value,
      scope,
      categoryIds: scope === 'categories' ? categoryIds ?? [] : [],
      packageIds: scope === 'packages' ? packageIds ?? [] : [],
      matchType,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (discountType === 'percentage') {
      payload.percentage = value;
    } else {
      payload.amountOff = value;
    }

    const docRef = await addDoc(collection(db, this.collectionName), payload);
    return docRef.id;
  }

  static async update(id: string, input: DayDiscountUpdateInput): Promise<void> {
    const payload: DocumentData = {
      updatedAt: serverTimestamp(),
    };

    if (input.label !== undefined) {
      payload.label = sanitizeLabel(input.label) ?? '';
    }
    if (input.description !== undefined) {
      payload.description = sanitizeDescription(input.description);
    }
    if (input.dayCount !== undefined) {
      payload.dayCount = sanitizeDayCount(input.dayCount);
    }
    if (input.discountType !== undefined) {
      const discountType = sanitizeDiscountType(input.discountType);
      payload.discountType = discountType;
      if (input.discountValue !== undefined) {
        const value = sanitizeDiscountValue(input.discountValue, discountType);
        payload.discountValue = value;
        if (discountType === 'percentage') {
          payload.percentage = value;
          payload.amountOff = null;
        } else {
          payload.amountOff = value;
          payload.percentage = null;
        }
      }
    } else if (input.discountValue !== undefined) {
      const existingType = sanitizeDiscountType(input.discountType);
      const value = sanitizeDiscountValue(input.discountValue, existingType);
      payload.discountValue = value;
      if (existingType === 'percentage') {
        payload.percentage = value;
        payload.amountOff = null;
      } else {
        payload.amountOff = value;
        payload.percentage = null;
      }
    }

    if (input.scope !== undefined) {
      const scope = sanitizeScope(input.scope);
      payload.scope = scope;
      if (scope === 'categories') {
        payload.categoryIds = sanitizeStringArray(input.categoryIds) ?? [];
        payload.packageIds = [];
        if (input.matchType !== undefined) {
          payload.matchType = sanitizeMatchType(input.matchType);
        } else {
          payload.matchType = 'all';
        }
      } else if (scope === 'packages') {
        payload.packageIds = sanitizeStringArray(input.packageIds) ?? [];
        payload.categoryIds = [];
        if (input.matchType !== undefined) {
          payload.matchType = sanitizeMatchType(input.matchType);
        } else {
          payload.matchType = 'all';
        }
      } else {
        payload.categoryIds = [];
        payload.packageIds = [];
        payload.matchType = 'all';
      }
    } else {
      if (input.categoryIds !== undefined) {
        payload.categoryIds = sanitizeStringArray(input.categoryIds) ?? [];
      }
      if (input.packageIds !== undefined) {
        payload.packageIds = sanitizeStringArray(input.packageIds) ?? [];
      }
      if (input.matchType !== undefined) {
        payload.matchType = sanitizeMatchType(input.matchType);
      }
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
  ): Promise<{ data: DayDiscountSchema[]; total: number }> {
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
