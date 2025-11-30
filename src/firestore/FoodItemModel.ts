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
  type DocumentData
} from 'firebase/firestore';
import { db } from '../firebase';
import type { FoodItemCreateInput, FoodItemSchema, FoodItemUpdateInput } from '../schemas/FoodItemSchema';
import { executeSearchQuery, executeSearchQueryCount, type SearchParams, type PaginationParams } from '../utils/firestoreSearch';

const COLLECTION_NAME = 'foodItems';

const mapDoc = (docId: string, data: Record<string, unknown>): FoodItemSchema => {
  const toDate = (value: unknown): Date | undefined => {
    if (value instanceof Timestamp) {
      return value.toDate();
    }
    if (value instanceof Date) {
      return value;
    }
    return undefined;
  };

  const coins = typeof data.coins === 'number' ? data.coins : 0;
  const discountCoins = typeof data.discountCoins === 'number' ? data.discountCoins : 0;
  const isAddon = data.isAddon === true;
  const addonDescription = typeof data.addonDescription === 'string' && data.addonDescription.trim().length > 0
    ? data.addonDescription.trim()
    : null;
  const addonAccentFrom = typeof data.addonAccentFrom === 'string' && data.addonAccentFrom.trim().length > 0
    ? data.addonAccentFrom.trim()
    : null;
  const addonAccentTo = typeof data.addonAccentTo === 'string' && data.addonAccentTo.trim().length > 0
    ? data.addonAccentTo.trim()
    : null;

  return {
    id: docId,
    name: String(data.name ?? ''),
    category: (data.category === 'Veg' || data.category === 'Non-Veg') ? data.category : 'Veg',
    mealType:
      data.mealType === 'Breakfast' || data.mealType === 'Lunch' || data.mealType === 'Dinner'
        ? data.mealType
        : 'Breakfast',
    coins,
    discountCoins,
    isAddon,
        addonDescription,
    addonAccentFrom,
    addonAccentTo,
    imageBase64: typeof data.imageBase64 === 'string' ? data.imageBase64 : undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
};

export class FoodItemModel {
  static collectionName = COLLECTION_NAME;

  static async findAll(): Promise<FoodItemSchema[]> {
    const snapshot = await getDocs(collection(db, this.collectionName));
    return snapshot.docs.map((docSnap) => mapDoc(docSnap.id, docSnap.data())) as FoodItemSchema[];
  }

  static async findById(id: string): Promise<FoodItemSchema | null> {
    const ref = doc(db, this.collectionName, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    return mapDoc(snap.id, snap.data());
  }

  static async create(input: FoodItemCreateInput): Promise<string> {
    const payload: DocumentData = {
      name: input.name.trim(),
      category: input.category,
      mealType: input.mealType,
      coins: Number.isFinite(input.coins) ? Number(input.coins) : 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (input.discountCoins !== undefined) {
      payload.discountCoins = Number.isFinite(input.discountCoins)
        ? Number(input.discountCoins)
        : 0;
    } else {
      payload.discountCoins = 0;
    }

    if (typeof input.imageBase64 === 'string' && input.imageBase64.trim()) {
      payload.imageBase64 = input.imageBase64.trim();
    }

    payload.isAddon = Boolean(input.isAddon);
    if (typeof input.addonDescription === 'string') {
      const trimmed = input.addonDescription.trim();
      if (trimmed.length > 0) {
        payload.addonDescription = trimmed;
      }
    }
    if (typeof input.addonAccentFrom === 'string') {
      const trimmed = input.addonAccentFrom.trim();
      if (trimmed.length > 0) {
        payload.addonAccentFrom = trimmed;
      }
    }
    if (typeof input.addonAccentTo === 'string') {
      const trimmed = input.addonAccentTo.trim();
      if (trimmed.length > 0) {
        payload.addonAccentTo = trimmed;
      }
    }

    const docRef = await addDoc(collection(db, this.collectionName), payload);
    return docRef.id;
  }

  static async update(id: string, input: FoodItemUpdateInput): Promise<void> {
    const payload: DocumentData = {
      updatedAt: serverTimestamp(),
    };

    if (typeof input.name === 'string') {
      payload.name = input.name.trim();
    }
    if (input.category) {
      payload.category = input.category;
    }
    if (input.mealType) {
      payload.mealType = input.mealType;
    }
    if (typeof input.coins === 'number' && Number.isFinite(input.coins)) {
      payload.coins = Number(input.coins);
    }
    if (input.discountCoins !== undefined) {
      if (input.discountCoins === null) {
        payload.discountCoins = 0;
      } else if (Number.isFinite(input.discountCoins)) {
        payload.discountCoins = Number(input.discountCoins);
      } else {
        payload.discountCoins = 0;
      }
    }
    if (input.imageBase64 !== undefined) {
      if (input.imageBase64 === null || (typeof input.imageBase64 === 'string' && input.imageBase64.trim() === '')) {
        payload.imageBase64 = null;
      } else if (typeof input.imageBase64 === 'string') {
        payload.imageBase64 = input.imageBase64.trim();
      }
    }
    if (typeof input.isAddon === 'boolean') {
      payload.isAddon = input.isAddon;
    }
    if (input.addonDescription !== undefined) {
      if (input.addonDescription === null) {
        payload.addonDescription = null;
      } else if (typeof input.addonDescription === 'string') {
        const trimmed = input.addonDescription.trim();
        payload.addonDescription = trimmed.length > 0 ? trimmed : null;
      }
    }
    if (input.addonAccentFrom !== undefined) {
      if (input.addonAccentFrom === null) {
        payload.addonAccentFrom = null;
      } else if (typeof input.addonAccentFrom === 'string') {
        const trimmed = input.addonAccentFrom.trim();
        payload.addonAccentFrom = trimmed.length > 0 ? trimmed : null;
      }
    }
    if (input.addonAccentTo !== undefined) {
      if (input.addonAccentTo === null) {
        payload.addonAccentTo = null;
      } else if (typeof input.addonAccentTo === 'string') {
        const trimmed = input.addonAccentTo.trim();
        payload.addonAccentTo = trimmed.length > 0 ? trimmed : null;
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
  ): Promise<{ data: FoodItemSchema[]; total: number }> {
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
