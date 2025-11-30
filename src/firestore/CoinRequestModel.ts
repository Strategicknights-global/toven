import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  CoinRequestCreateInput,
  CoinRequestSchema,
  CoinRequestStatus,
  CoinRequestStatusUpdateInput,
} from '../schemas/CoinRequestSchema';
import { isCoinRequestStatus, normalizeCoinRequestInput } from '../schemas/CoinRequestSchema';
import { executeSearchQuery, executeSearchQueryCount, type SearchParams, type PaginationParams } from '../utils/firestoreSearch';

const COLLECTION_NAME = 'coinRequests';

const toDate = (value: unknown): Date | null => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return null;
};

const toStringSafe = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toNumber = (value: unknown): number => {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) && num >= 0 ? Math.round(num) : 0;
};

const fromFirestore = (docId: string, data: DocumentData): CoinRequestSchema => {
  const status = isCoinRequestStatus(data.status) ? (data.status as CoinRequestStatus) : 'pending';

  return {
    id: docId,
    userId: toStringSafe(data.userId),
    userName: toStringSafe(data.userName),
    userEmail: toStringOrNull(data.userEmail),
    userPhone: toStringOrNull(data.userPhone),
    coinsRequested: toNumber(data.coinsRequested),
    amountPaid: toNumber(data.amountPaid),
    invoiceImage: toStringSafe(data.invoiceImage),
    status,
    statusNote: toStringOrNull(data.statusNote),
    reviewedBy: toStringOrNull(data.reviewedBy),
    reviewedByName: toStringOrNull(data.reviewedByName),
    reviewedAt: toDate(data.reviewedAt),
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
  };
};

export const CoinRequestModel = {
  /**
   * Find all coin requests
   */
  async findAll(): Promise<CoinRequestSchema[]> {
    const collectionRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(collectionRef);
    return snapshot.docs.map((doc) => fromFirestore(doc.id, doc.data()));
  },

  /**
   * Find coin requests by user ID
   */
  async findByUserId(userId: string): Promise<CoinRequestSchema[]> {
    const collectionRef = collection(db, COLLECTION_NAME);
    const q = query(collectionRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => fromFirestore(doc.id, doc.data()));
  },

  /**
   * Find a coin request by ID
   */
  async findById(id: string): Promise<CoinRequestSchema | null> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return null;
    }
    return fromFirestore(docSnap.id, docSnap.data());
  },

  /**
   * Create a new coin request
   */
  async create(input: CoinRequestCreateInput): Promise<string> {
    const normalized = normalizeCoinRequestInput(input);
    // Auto-calculate amountPaid using configured coin price
    const { ConfigModel } = await import('./ConfigModel');
    const coinPrice = await ConfigModel.getCoinPrice();
    const amountPaid = normalized.coinsRequested * coinPrice;
    
    const collectionRef = collection(db, COLLECTION_NAME);
    const docData = {
      ...normalized,
      amountPaid,
      status: 'pending',
      statusNote: null,
      reviewedBy: null,
      reviewedByName: null,
      reviewedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collectionRef, docData);
    return docRef.id;
  },

  /**
   * Update coin request status
   */
  async updateStatus(id: string, input: CoinRequestStatusUpdateInput): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      status: input.status,
      statusNote: input.statusNote ?? null,
      reviewedBy: input.reviewedBy,
      reviewedByName: input.reviewedByName,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  // Server-side paginated search
  async searchPaginated(
    pagination: PaginationParams,
    search: SearchParams | null = null
  ): Promise<{ data: CoinRequestSchema[]; total: number }> {
    const data = await executeSearchQuery<CoinRequestSchema>(
      COLLECTION_NAME,
      search,
      pagination
    );
    const total = await executeSearchQueryCount(
      COLLECTION_NAME,
      search
    );
    return { data, total };
  },
};
