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
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { ExpenseCreateInput, ExpenseSchema, ExpenseUpdateInput } from '../schemas/ExpenseSchema';
import { executeSearchQuery, executeSearchQueryCount, type SearchParams, type PaginationParams } from '../utils/firestoreSearch';

const COLLECTION_NAME = 'expenses';

const toDate = (value: unknown): Date | undefined => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'number') {
    const asDate = new Date(value);
    return Number.isNaN(asDate.getTime()) ? undefined : asDate;
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

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const mapDoc = (docId: string, data: Record<string, unknown>): ExpenseSchema => {
  const expenseDate = toDate(data.expenseDate) ?? toDate(data.createdAt) ?? new Date();
  return {
    id: docId,
    description: typeof data.description === 'string' ? data.description : '',
    amount: toNumber(data.amount),
    category: data.category === 'purchase' ? 'purchase' : 'general',
    expenseDate,
    sourceId: typeof data.sourceId === 'string' ? data.sourceId : null,
    sourceType: data.sourceType === 'grn' ? 'grn' : 'manual',
    invoiceImageBase64: toStringOrNull(data.invoiceImageBase64),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
};

export class ExpenseModel {
  static collectionName = COLLECTION_NAME;

  static async findAll(): Promise<ExpenseSchema[]> {
    const expenseQuery = query(collection(db, this.collectionName), orderBy('expenseDate', 'desc'));
    const snapshot = await getDocs(expenseQuery);
    return snapshot.docs.map((docSnap) => mapDoc(docSnap.id, docSnap.data()));
  }

  static async findById(id: string): Promise<ExpenseSchema | null> {
    const ref = doc(db, this.collectionName, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    return mapDoc(snap.id, snap.data());
  }

  static async create(input: ExpenseCreateInput): Promise<string> {
    const payload: DocumentData = {
      description: input.description.trim(),
      amount: toNumber(input.amount),
      category: 'general',
      expenseDate: Timestamp.fromDate(input.expenseDate),
      sourceType: 'manual',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (typeof input.invoiceImageBase64 === 'string' && input.invoiceImageBase64.trim().length > 0) {
      payload.invoiceImageBase64 = input.invoiceImageBase64.trim();
    }

    const ref = await addDoc(collection(db, this.collectionName), payload);
    return ref.id;
  }

  static async update(id: string, input: ExpenseUpdateInput): Promise<void> {
    const payload: DocumentData = {
      updatedAt: serverTimestamp(),
    };

    if (typeof input.description === 'string') {
      payload.description = input.description.trim();
    }
    if (input.amount != null) {
      payload.amount = toNumber(input.amount);
    }
    if (input.expenseDate instanceof Date) {
      payload.expenseDate = Timestamp.fromDate(input.expenseDate);
    }
    if (input.invoiceImageBase64 !== undefined) {
      payload.invoiceImageBase64 = toStringOrNull(input.invoiceImageBase64) ?? undefined;
    }
    if (input.sourceId !== undefined) {
      payload.sourceId = input.sourceId ?? null;
    }
    if (input.sourceType !== undefined) {
      payload.sourceType = input.sourceType;
    }
    if (input.category !== undefined) {
      payload.category = input.category;
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
  ): Promise<{ data: ExpenseSchema[]; total: number }> {
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
