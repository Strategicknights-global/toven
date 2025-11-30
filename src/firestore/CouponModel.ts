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
  query,
  orderBy,
  where,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { CouponCreateInput, CouponSchema, CouponUpdateInput, CouponDiscountType } from '../schemas/CouponSchema';
import { executeSearchQuery, executeSearchQueryCount, type SearchParams, type PaginationParams } from '../utils/firestoreSearch';

const COLLECTION_NAME = 'coupons';

const normalizeCode = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed.toUpperCase();
};

const sanitizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const sanitizeNullableNumber = (value: unknown): number | null | undefined => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const sanitizeNumber = (value: unknown): number | undefined => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  value.forEach((item) => {
    if (typeof item !== 'string') {
      return;
    }
    const trimmed = item.trim();
    if (!trimmed) {
      return;
    }
    seen.add(trimmed);
  });
  return Array.from(seen);
};

const sanitizeDate = (value: unknown): Timestamp | null | undefined => {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    return Timestamp.fromDate(value);
  }
  if (value instanceof Timestamp) {
    return value;
  }
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return Timestamp.fromDate(date);
};

const normalizeDiscountType = (value: unknown): CouponDiscountType => {
  return value === 'flat' ? 'flat' : 'percentage';
};

const toDate = (value: unknown): Date | null | undefined => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return undefined;
};

const mapDoc = (docId: string, data: Record<string, unknown>): CouponSchema => {
  const activeValue = typeof data.active === 'boolean' ? data.active : true;
  const requiredPackages = normalizeStringArray(data.requiredPackageIds);
  const studentOnly = typeof data.requireStudentVerification === 'boolean' ? data.requireStudentVerification : false;

  return {
    id: docId,
    code: normalizeCode(data.code),
    description: sanitizeString(data.description) ?? undefined,
    discountType: normalizeDiscountType(data.discountType),
    discountValue: sanitizeNumber(data.discountValue) ?? 0,
    maxRedemptions: sanitizeNullableNumber(data.maxRedemptions) ?? null,
    maxRedemptionsPerUser: sanitizeNullableNumber(data.maxRedemptionsPerUser) ?? null,
    minOrderValue: sanitizeNullableNumber(data.minOrderValue) ?? null,
    validFrom: toDate(data.validFrom) ?? null,
    validUntil: toDate(data.validUntil) ?? null,
    active: activeValue,
    requiredPackageIds: requiredPackages.length > 0 ? requiredPackages : [],
    requireStudentVerification: studentOnly,
    createdAt: toDate(data.createdAt) ?? undefined,
    updatedAt: toDate(data.updatedAt) ?? undefined,
  };
};

export class CouponModel {
  static collectionName = COLLECTION_NAME;

  static async findAll(): Promise<CouponSchema[]> {
    const snapshot = await getDocs(query(collection(db, this.collectionName), orderBy('code', 'asc')));
    return snapshot.docs.map((docSnap) => mapDoc(docSnap.id, docSnap.data()));
  }

  static async findById(id: string): Promise<CouponSchema | null> {
    const ref = doc(db, this.collectionName, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    return mapDoc(snap.id, snap.data());
  }

  static async findByCode(code: string): Promise<CouponSchema | null> {
    const normalized = normalizeCode(code);
    if (!normalized) {
      return null;
    }

    const couponQuery = query(
      collection(db, this.collectionName),
      where('code', '==', normalized),
      limit(1),
    );
    const snapshot = await getDocs(couponQuery);
    if (snapshot.empty) {
      return null;
    }
    const docSnap = snapshot.docs[0];
    return mapDoc(docSnap.id, docSnap.data());
  }

  static async create(input: CouponCreateInput): Promise<string> {
    const payload: DocumentData = {
      code: normalizeCode(input.code),
      description: sanitizeString(input.description) ?? '',
      discountType: normalizeDiscountType(input.discountType),
      discountValue: sanitizeNumber(input.discountValue) ?? 0,
      maxRedemptions: sanitizeNullableNumber(input.maxRedemptions) ?? null,
      maxRedemptionsPerUser: sanitizeNullableNumber(input.maxRedemptionsPerUser) ?? null,
      minOrderValue: sanitizeNullableNumber(input.minOrderValue) ?? null,
      validFrom: sanitizeDate(input.validFrom) ?? null,
      validUntil: sanitizeDate(input.validUntil) ?? null,
      active: typeof input.active === 'boolean' ? input.active : true,
      requiredPackageIds: normalizeStringArray(input.requiredPackageIds),
      requireStudentVerification: Boolean(input.requireStudentVerification),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, this.collectionName), payload);
    return docRef.id;
  }

  static async update(id: string, input: CouponUpdateInput): Promise<void> {
    const payload: DocumentData = {
      updatedAt: serverTimestamp(),
    };

    if (input.code !== undefined) {
      payload.code = normalizeCode(input.code);
    }

    if (input.description !== undefined) {
      payload.description = sanitizeString(input.description) ?? '';
    }

    if (input.discountType !== undefined) {
      payload.discountType = normalizeDiscountType(input.discountType);
    }

    if (input.discountValue !== undefined) {
      payload.discountValue = sanitizeNumber(input.discountValue) ?? 0;
    }

    if (input.maxRedemptions !== undefined) {
      payload.maxRedemptions = sanitizeNullableNumber(input.maxRedemptions) ?? null;
    }

    if (input.maxRedemptionsPerUser !== undefined) {
      payload.maxRedemptionsPerUser = sanitizeNullableNumber(input.maxRedemptionsPerUser) ?? null;
    }

    if (input.minOrderValue !== undefined) {
      payload.minOrderValue = sanitizeNullableNumber(input.minOrderValue) ?? null;
    }

    if (input.validFrom !== undefined) {
      payload.validFrom = sanitizeDate(input.validFrom) ?? null;
    }

    if (input.validUntil !== undefined) {
      payload.validUntil = sanitizeDate(input.validUntil) ?? null;
    }

    if (input.active !== undefined) {
      payload.active = Boolean(input.active);
    }

    if (input.requiredPackageIds !== undefined) {
      payload.requiredPackageIds = normalizeStringArray(input.requiredPackageIds);
    }

    if (input.requireStudentVerification !== undefined) {
      payload.requireStudentVerification = Boolean(input.requireStudentVerification);
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
  ): Promise<{ data: CouponSchema[]; total: number }> {
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
