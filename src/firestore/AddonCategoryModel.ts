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
  AddonCategoryCreateInput,
  AddonCategorySchema,
  AddonCategoryUpdateInput,
} from '../schemas/AddonCategorySchema';
import { executeSearchQuery, executeSearchQueryCount, type SearchParams, type PaginationParams } from '../utils/firestoreSearch';

const COLLECTION_NAME = 'addonCategories';

const toDate = (value: unknown): Date | undefined => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return undefined;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
};

const uniqueStrings = (values: string[]): string[] => Array.from(new Set(values));

const mapDoc = (docId: string, data: Record<string, unknown>): AddonCategorySchema => ({
  id: docId,
  name: typeof data.name === 'string' ? data.name.trim() : '',
  addonIds: uniqueStrings(toStringArray(data.addonIds)),
  createdAt: toDate(data.createdAt),
  updatedAt: toDate(data.updatedAt),
});

export class AddonCategoryModel {
  static collectionName = COLLECTION_NAME;

  static async findAll(): Promise<AddonCategorySchema[]> {
    const snapshot = await getDocs(collection(db, this.collectionName));
    return snapshot.docs.map((docSnap) => mapDoc(docSnap.id, docSnap.data() as Record<string, unknown>));
  }

  static async findById(id: string): Promise<AddonCategorySchema | null> {
    const ref = doc(db, this.collectionName, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    return mapDoc(snap.id, snap.data() as Record<string, unknown>);
  }

  static async create(input: AddonCategoryCreateInput): Promise<string> {
    const payload: DocumentData = {
      name: input.name.trim(),
      addonIds: uniqueStrings(input.addonIds.map((id) => id.trim()).filter((id) => id.length > 0)),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, this.collectionName), payload);
    return docRef.id;
  }

  static async update(id: string, input: AddonCategoryUpdateInput): Promise<void> {
    const payload: DocumentData = {
      updatedAt: serverTimestamp(),
    };

    if (typeof input.name === 'string') {
      payload.name = input.name.trim();
    }

    if (Array.isArray(input.addonIds)) {
      payload.addonIds = uniqueStrings(
        input.addonIds.map((value) => (typeof value === 'string' ? value.trim() : '')).filter((value) => value.length > 0),
      );
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
  ): Promise<{ data: AddonCategorySchema[]; total: number }> {
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
