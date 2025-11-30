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
  PackageCreateInput,
  PackageDateMenuEntry,
  PackageDateMenuEntryInput,
  PackageSchema,
  PackageStatus,
  PackageUpdateInput,
} from '../schemas/PackageSchema';
import { normalizeDateMenuEntries, createDefaultDateMenus, normalizeMenuDescription } from '../schemas/PackageSchema';
import type { MealType } from '../schemas/FoodItemSchema';
import { executeSearchQuery, executeSearchQueryCount, type SearchParams, type PaginationParams } from '../utils/firestoreSearch';

const COLLECTION_NAME = 'packages';

const VALID_STATUS: PackageStatus[] = ['Available', 'Unavailable'];
const VALID_MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner'];

const coerceDateMenus = (
  value: unknown,
  opts: { allowEmpty?: boolean } = {},
): PackageDateMenuEntry[] => {
  if (!Array.isArray(value)) {
    return opts.allowEmpty ? [] : createDefaultDateMenus();
  }

  return normalizeDateMenuEntries(value as PackageDateMenuEntryInput[], {
    allowEmpty: opts.allowEmpty ?? false,
  });
};

// Helper to remove undefined values from date menu entries before saving to Firestore
const cleanDateMenusForFirestore = (dateMenus: PackageDateMenuEntry[]): Record<string, unknown>[] => {
  return dateMenus.map((entry) => {
    const cleaned: Record<string, unknown> = {
      date: entry.date,
      foodItemIds: entry.foodItemIds,
    };
    
    // Only include foodItemQuantities if it has values
    if (entry.foodItemQuantities && Object.keys(entry.foodItemQuantities).length > 0) {
      cleaned.foodItemQuantities = entry.foodItemQuantities;
    }
    
    // Only include description if it's not undefined
    if (entry.description !== undefined) {
      cleaned.description = entry.description;
    }
    
    return cleaned;
  });
};

const mapDoc = (docId: string, data: Record<string, unknown>): PackageSchema => {
  const toDate = (value: unknown): Date | undefined => {
    if (value instanceof Timestamp) {
      return value.toDate();
    }
    if (value instanceof Date) {
      return value;
    }
    return undefined;
  };

  const mealType = VALID_MEAL_TYPES.includes(data.mealType as MealType)
    ? (data.mealType as MealType)
    : 'Breakfast';
  const status = VALID_STATUS.includes(data.status as PackageStatus)
    ? (data.status as PackageStatus)
    : 'Available';

  const price = typeof data.price === 'number' ? data.price : 0;

  const categoryId = typeof data.categoryId === 'string' ? data.categoryId : '';

  const dateMenus = coerceDateMenus(data.dateMenus, { allowEmpty: true });

  return {
    id: docId,
    name: String(data.name ?? ''),
    categoryId,
    mealType,
    price,
    status,
    dateMenus: dateMenus.length > 0 ? dateMenus : createDefaultDateMenus(),
    menuDescription: normalizeMenuDescription(data.menuDescription as string | undefined),
    imageBase64: typeof data.imageBase64 === 'string' ? data.imageBase64 : undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
};

export class PackageModel {
  static collectionName = COLLECTION_NAME;

  static async findAll(): Promise<PackageSchema[]> {
    const snapshot = await getDocs(collection(db, this.collectionName));
    return snapshot.docs.map((docSnap) => mapDoc(docSnap.id, docSnap.data())) as PackageSchema[];
  }

  static async findById(id: string): Promise<PackageSchema | null> {
    const ref = doc(db, this.collectionName, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    return mapDoc(snap.id, snap.data());
  }

  static async create(input: PackageCreateInput): Promise<string> {
    const normalizedDateMenus = normalizeDateMenuEntries(input.dateMenus, { allowEmpty: true });
    const payload: DocumentData = {
      name: input.name.trim(),
      categoryId: input.categoryId,
      mealType: VALID_MEAL_TYPES.includes(input.mealType) ? input.mealType : 'Breakfast',
      price: Number.isFinite(input.price) ? Number(input.price) : 0,
      status: VALID_STATUS.includes(input.status) ? input.status : 'Available',
      dateMenus: cleanDateMenusForFirestore(normalizedDateMenus),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const description = normalizeMenuDescription(input.menuDescription);
    if (description) {
      payload.menuDescription = description;
    }

    if (typeof input.imageBase64 === 'string' && input.imageBase64.trim()) {
      payload.imageBase64 = input.imageBase64.trim();
    }

    const docRef = await addDoc(collection(db, this.collectionName), payload);
    return docRef.id;
  }

  static async update(id: string, input: PackageUpdateInput): Promise<void> {
    const payload: DocumentData = {
      updatedAt: serverTimestamp(),
    };

    if (typeof input.name === 'string') {
      payload.name = input.name.trim();
    }
    if (typeof input.categoryId === 'string') {
      payload.categoryId = input.categoryId;
    }
    if (input.mealType && VALID_MEAL_TYPES.includes(input.mealType)) {
      payload.mealType = input.mealType;
    }
    if (typeof input.price === 'number' && Number.isFinite(input.price)) {
      payload.price = Number(input.price);
    }
    if (input.status && VALID_STATUS.includes(input.status)) {
      payload.status = input.status;
    }
    if (input.dateMenus !== undefined) {
      const normalizedDateMenus = normalizeDateMenuEntries(input.dateMenus, { allowEmpty: true });
      payload.dateMenus = cleanDateMenusForFirestore(normalizedDateMenus);
    }
    if (input.menuDescription !== undefined) {
      if (input.menuDescription === null) {
        payload.menuDescription = null;
      } else {
        const normalized = normalizeMenuDescription(input.menuDescription);
        payload.menuDescription = normalized ?? null;
      }
    }
    if (input.imageBase64 !== undefined) {
      if (input.imageBase64 === null || (typeof input.imageBase64 === 'string' && input.imageBase64.trim() === '')) {
        payload.imageBase64 = null;
      } else if (typeof input.imageBase64 === 'string') {
        payload.imageBase64 = input.imageBase64.trim();
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
  ): Promise<{ data: PackageSchema[]; total: number }> {
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
