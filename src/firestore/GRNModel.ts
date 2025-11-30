import {
  addDoc,
  collection,
  deleteDoc,
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
import type { GrnCreateInput, GrnSchema, GrnUpdateInput } from '../schemas/GRNSchema';
import { executeSearchQuery, executeSearchQueryCount, type SearchParams, type PaginationParams } from '../utils/firestoreSearch';

const COLLECTION_NAME = 'grns';

const toDate = (value: unknown): Date | undefined => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
};

const toNumber = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.round(numeric * 100) / 100;
};

const toString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
  return fallback;
};

const toStringOrNull = (value: unknown): string | null => {
  const str = toString(value);
  return str.length > 0 ? str : null;
};

const mapDoc = (docId: string, data: Record<string, unknown>): GrnSchema => {
  return {
    id: docId,
    productId: toString(data.productId),
    productName: toString(data.productName),
    productUnit: toString(data.productUnit, undefined as unknown as string),
    quantity: toNumber(data.quantity),
    purchaseDate: toDate(data.purchaseDate) ?? new Date(),
    receivedById: toString(data.receivedById),
    receivedByName: toString(data.receivedByName),
    totalPrice: toNumber(data.totalPrice),
    invoiceImageBase64: toStringOrNull(data.invoiceImageBase64),
    notes: toStringOrNull(data.notes),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
};

export class GrnModel {
  static collectionName = COLLECTION_NAME;

  static async findAll(): Promise<GrnSchema[]> {
    const grnQuery = query(collection(db, this.collectionName), orderBy('purchaseDate', 'desc'));
    const snapshot = await getDocs(grnQuery);
    return snapshot.docs.map((docSnap) => mapDoc(docSnap.id, docSnap.data()));
  }

  static async findById(id: string): Promise<GrnSchema | null> {
    const ref = doc(db, this.collectionName, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    return mapDoc(snap.id, snap.data());
  }

  static async create(input: GrnCreateInput): Promise<string> {
    const payload: DocumentData = {
      productId: input.productId,
      productName: input.productName,
      productUnit: input.productUnit ?? null,
      quantity: toNumber(input.quantity),
      purchaseDate: Timestamp.fromDate(input.purchaseDate),
      receivedById: input.receivedById,
      receivedByName: input.receivedByName,
      totalPrice: toNumber(input.totalPrice),
      invoiceImageBase64:
        typeof input.invoiceImageBase64 === 'string' && input.invoiceImageBase64.trim().length > 0
          ? input.invoiceImageBase64.trim()
          : null,
      notes:
        typeof input.notes === 'string' && input.notes.trim().length > 0 ? input.notes.trim() : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const ref = await addDoc(collection(db, this.collectionName), payload);
    return ref.id;
  }

  static async update(id: string, input: GrnUpdateInput): Promise<void> {
    const payload: DocumentData = {
      updatedAt: serverTimestamp(),
    };

    if (input.productId !== undefined) {
      payload.productId = input.productId;
    }
    if (input.productName !== undefined) {
      payload.productName = input.productName;
    }
    if (input.productUnit !== undefined) {
      payload.productUnit = input.productUnit;
    }
    if (input.quantity !== undefined) {
      payload.quantity = toNumber(input.quantity);
    }
    if (input.purchaseDate instanceof Date) {
      payload.purchaseDate = Timestamp.fromDate(input.purchaseDate);
    }
    if (input.receivedById !== undefined) {
      payload.receivedById = input.receivedById;
    }
    if (input.receivedByName !== undefined) {
      payload.receivedByName = input.receivedByName;
    }
    if (input.totalPrice !== undefined) {
      payload.totalPrice = toNumber(input.totalPrice);
    }
    if (input.invoiceImageBase64 !== undefined) {
      payload.invoiceImageBase64 = toStringOrNull(input.invoiceImageBase64);
    }
    if (input.notes !== undefined) {
      payload.notes = toStringOrNull(input.notes);
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
  ): Promise<{ data: GrnSchema[]; total: number }> {
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
