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
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { CancelledMealCreateInput, CancelledMealSchema } from '../schemas/CancelledMealSchema';
import type { MealType } from '../schemas/FoodItemSchema';
import { executeSearchQuery, executeSearchQueryCount, type SearchParams, type PaginationParams } from '../utils/firestoreSearch';

const COLLECTION_NAME = 'cancelledMeals';
const VALID_MEAL_TYPES: readonly MealType[] = ['Breakfast', 'Lunch', 'Dinner'];

const toDate = (value: unknown): Date | undefined => {
  if (!value) {
    return undefined;
  }
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    // Support ISO strings without time (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const parsed = new Date(`${trimmed}T00:00:00`);
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  if (typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  return undefined;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : null;
  }
  return null;
};

const toStringSafe = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const toStringOptional = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeMealType = (value: unknown): MealType | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return VALID_MEAL_TYPES.includes(normalized as MealType) ? (normalized as MealType) : null;
};

const mapDoc = (docId: string, data: Record<string, unknown>): CancelledMealSchema => {
  const cancelledAt = toDate(data.cancelledAt ?? data.cancellationTime ?? data.createdAt) ?? null;
  const mealDate = toDate(data.mealDate) ?? null;

  return {
    id: docId,
    subscriptionId: toStringOptional(data.subscriptionId),
    customerId: toStringSafe(data.customerId),
    customerShortId: toStringOptional(data.customerShortId),
    customerName: toStringSafe(data.customerName),
    customerPhone: toStringOptional(data.customerPhone),
    customerEmail: toStringOptional(data.customerEmail),
    packageId: toStringOptional(data.packageId),
    packageName: toStringOptional(data.packageName),
    mealType: normalizeMealType(data.mealType),
    mealDate,
    cancelledAt,
    price: toNumber(data.price),
    currency: toStringOptional(data.currency) ?? 'INR',
    reason: toStringOptional(data.reason),
    recordedById: toStringOptional(data.recordedById),
    recordedByName: toStringOptional(data.recordedByName),
  } satisfies CancelledMealSchema;
};

const mapCreateInput = (input: CancelledMealCreateInput): DocumentData => {
  const payload: DocumentData = {
    subscriptionId: input.subscriptionId ?? null,
    customerId: input.customerId,
    customerName: input.customerName,
    customerShortId: input.customerShortId ?? null,
    customerPhone: input.customerPhone ?? null,
    customerEmail: input.customerEmail ?? null,
    packageId: input.packageId ?? null,
    packageName: input.packageName ?? null,
    mealType: input.mealType ?? null,
    mealDate: input.mealDate ? Timestamp.fromDate(input.mealDate) : null,
    cancelledAt: input.cancelledAt ? Timestamp.fromDate(input.cancelledAt) : serverTimestamp(),
    price: typeof input.price === 'number' ? Math.round(input.price * 100) / 100 : input.price ?? null,
    currency: input.currency ?? 'INR',
    reason: input.reason ?? null,
    recordedById: input.recordedById ?? null,
    recordedByName: input.recordedByName ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } satisfies DocumentData;

  return payload;
};

export class CancelledMealModel {
  static collectionName = COLLECTION_NAME;

  static async findAll(): Promise<CancelledMealSchema[]> {
    const cancelledMealsQuery = query(
      collection(db, this.collectionName),
      orderBy('cancelledAt', 'desc'),
    );

    const snapshot = await getDocs(cancelledMealsQuery);
    return snapshot.docs.map((docSnap) => mapDoc(docSnap.id, docSnap.data()));
  }

  static async findById(id: string): Promise<CancelledMealSchema | null> {
    const ref = doc(db, this.collectionName, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    return mapDoc(snap.id, snap.data() as Record<string, unknown>);
  }

  static async create(input: CancelledMealCreateInput): Promise<string> {
    const payload = mapCreateInput(input);
    const ref = await addDoc(collection(db, this.collectionName), payload);
    return ref.id;
  }

  // Server-side paginated search
  static async searchPaginated(
    pagination: PaginationParams,
    search: SearchParams | null = null
  ): Promise<{ data: CancelledMealSchema[]; total: number }> {
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
