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
import type { CategoryCreateInput, CategorySchema, CategoryUpdateInput, CategoryStatus } from '../schemas/CategorySchema';
import { executeSearchQuery, executeSearchQueryCount, type SearchParams, type PaginationParams } from '../utils/firestoreSearch';

const COLLECTION_NAME = 'categories';

const VALID_STATUS: CategoryStatus[] = ['Available', 'Unavailable'];

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const normalizeHexColor = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return HEX_COLOR_REGEX.test(trimmed) ? trimmed : null;
};

const mapDoc = (docId: string, data: Record<string, unknown>): CategorySchema => {
  const toDate = (value: unknown): Date | undefined => {
    if (value instanceof Timestamp) {
      return value.toDate();
    }
    if (value instanceof Date) {
      return value;
    }
    return undefined;
  };

  const status = VALID_STATUS.includes(data.status as CategoryStatus)
    ? (data.status as CategoryStatus)
    : 'Available';

  const price = typeof data.price === 'number' ? data.price : 0;

  let accentFrom = normalizeHexColor(data.accentFrom);
  let accentTo = normalizeHexColor(data.accentTo);

  if (!accentFrom && !accentTo) {
    const legacyAccent = normalizeHexColor((data as Record<string, unknown>).accentColor);
    if (legacyAccent) {
      accentFrom = legacyAccent;
      accentTo = legacyAccent;
    }
  }

  return {
    id: docId,
    name: String(data.name ?? ''),
    price,
    status,
    description: typeof data.description === 'string' && data.description.trim()
      ? data.description.trim()
      : null,
    accentFrom,
    accentTo,
    imageBase64: typeof data.imageBase64 === 'string' ? data.imageBase64 : undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
};

export class CategoryModel {
  static collectionName = COLLECTION_NAME;

  static async findAll(): Promise<CategorySchema[]> {
    const snapshot = await getDocs(collection(db, this.collectionName));
    return snapshot.docs.map((docSnap) => mapDoc(docSnap.id, docSnap.data())) as CategorySchema[];
  }

  static async findById(id: string): Promise<CategorySchema | null> {
    const ref = doc(db, this.collectionName, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    return mapDoc(snap.id, snap.data());
  }

  static async create(input: CategoryCreateInput): Promise<string> {
    const payload: DocumentData = {
      name: input.name.trim(),
      price: Number.isFinite(input.price) ? Number(input.price) : 0,
      status: VALID_STATUS.includes(input.status) ? input.status : 'Available',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (typeof input.imageBase64 === 'string' && input.imageBase64.trim()) {
      payload.imageBase64 = input.imageBase64.trim();
    }

    if (typeof input.description === 'string') {
      const trimmed = input.description.trim();
      if (trimmed) {
        payload.description = trimmed;
      }
    }

    if (input.description === null) {
      payload.description = null;
    }

    const accentFrom = normalizeHexColor(input.accentFrom ?? undefined);
    const accentTo = normalizeHexColor(input.accentTo ?? undefined);
    if (accentFrom) {
      payload.accentFrom = accentFrom;
    } else if (input.accentFrom === null) {
      payload.accentFrom = null;
    }
    if (accentTo) {
      payload.accentTo = accentTo;
    } else if (input.accentTo === null) {
      payload.accentTo = null;
    }

    const docRef = await addDoc(collection(db, this.collectionName), payload);
    return docRef.id;
  }

  static async update(id: string, input: CategoryUpdateInput): Promise<void> {
    const payload: DocumentData = {
      updatedAt: serverTimestamp(),
    };

    if (typeof input.name === 'string') {
      payload.name = input.name.trim();
    }
    if (typeof input.price === 'number' && Number.isFinite(input.price)) {
      payload.price = Number(input.price);
    }
    if (input.status && VALID_STATUS.includes(input.status)) {
      payload.status = input.status;
    }
    if (input.description !== undefined) {
      if (input.description === null) {
        payload.description = null;
      } else if (typeof input.description === 'string') {
        const trimmed = input.description.trim();
        payload.description = trimmed || null;
      }
    }
    if (input.accentFrom !== undefined) {
      if (input.accentFrom === null) {
        payload.accentFrom = null;
      } else {
        const normalizedFrom = normalizeHexColor(input.accentFrom);
        payload.accentFrom = normalizedFrom ?? null;
      }
    }
    if (input.accentTo !== undefined) {
      if (input.accentTo === null) {
        payload.accentTo = null;
      } else {
        const normalizedTo = normalizeHexColor(input.accentTo);
        payload.accentTo = normalizedTo ?? null;
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
  ): Promise<{ data: CategorySchema[]; total: number }> {
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
