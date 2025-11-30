import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  CustomerInquiryCreateInput,
  CustomerInquirySchema,
  CustomerInquiryStatus,
  CustomerInquiryUpdateInput,
} from '../schemas/CustomerInquirySchema';
import { executeSearchQuery, executeSearchQueryCount, type SearchParams, type PaginationParams } from '../utils/firestoreSearch';

const COLLECTION_NAME = 'customerInquiries';

const sanitizeString = (value: unknown, { allowEmpty = false }: { allowEmpty?: boolean } = {}): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed && !allowEmpty) {
    return undefined;
  }
  return trimmed;
};

const normalizeStatus = (value: unknown): CustomerInquiryStatus => {
  if (value === 'in_progress' || value === 'resolved') {
    return value;
  }
  return 'new';
};

const toDate = (value: unknown): Date | undefined => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return undefined;
};

const mapDoc = (docId: string, data: Record<string, unknown>): CustomerInquirySchema => {
  const resolvedUserId = sanitizeString(data.userId, { allowEmpty: true }) ?? undefined;
  const resolvedShortId = sanitizeString(data.customerShortId, { allowEmpty: true }) ?? undefined;

  return {
    id: docId,
    name: sanitizeString(data.name, { allowEmpty: true }) ?? '',
    email: sanitizeString(data.email, { allowEmpty: true }) ?? '',
    subject: sanitizeString(data.subject, { allowEmpty: true }) ?? '',
    message: sanitizeString(data.message, { allowEmpty: true }) ?? '',
    status: normalizeStatus(data.status),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    userId: resolvedUserId && resolvedUserId.length > 0 ? resolvedUserId : undefined,
    customerShortId: resolvedShortId && resolvedShortId.length > 0 ? resolvedShortId : undefined,
  };
};

export class CustomerInquiryModel {
  static collectionName = COLLECTION_NAME;

  static async findAll(): Promise<CustomerInquirySchema[]> {
    const snapshot = await getDocs(
      query(collection(db, this.collectionName), orderBy('createdAt', 'desc'), limit(500)),
    );
    return snapshot.docs.map((docSnap) => mapDoc(docSnap.id, docSnap.data()));
  }

  static async findById(id: string): Promise<CustomerInquirySchema | null> {
    const ref = doc(db, this.collectionName, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    return mapDoc(snap.id, snap.data());
  }

  static async create(input: CustomerInquiryCreateInput): Promise<string> {
    const payload: DocumentData = {
      name: sanitizeString(input.name, { allowEmpty: true }) ?? '',
      email: sanitizeString(input.email, { allowEmpty: true }) ?? '',
      subject: sanitizeString(input.subject, { allowEmpty: true }) ?? '',
      message: sanitizeString(input.message, { allowEmpty: true }) ?? '',
      status: normalizeStatus(input.status),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, this.collectionName), payload);
    return docRef.id;
  }

  static async update(id: string, input: CustomerInquiryUpdateInput): Promise<void> {
    const payload: DocumentData = {
      updatedAt: serverTimestamp(),
    };

    if (input.name !== undefined) {
      payload.name = sanitizeString(input.name, { allowEmpty: true }) ?? '';
    }

    if (input.email !== undefined) {
      payload.email = sanitizeString(input.email, { allowEmpty: true }) ?? '';
    }

    if (input.subject !== undefined) {
      payload.subject = sanitizeString(input.subject, { allowEmpty: true }) ?? '';
    }

    if (input.message !== undefined) {
      payload.message = sanitizeString(input.message, { allowEmpty: true }) ?? '';
    }

    if (input.status !== undefined) {
      payload.status = normalizeStatus(input.status);
    }

    await updateDoc(doc(db, this.collectionName, id), payload);
  }

  // Server-side paginated search
  static async searchPaginated(
    pagination: PaginationParams,
    search: SearchParams | null = null
  ): Promise<{ data: CustomerInquirySchema[]; total: number }> {
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
