import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface CustomerLoginRecord {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  loginAt?: Date;
  createdAt?: Date;
}

const COLLECTION_NAME = 'customerLogins';

const toDate = (value: unknown): Date | undefined => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return undefined;
};

const mapDoc = (docId: string, data: Record<string, unknown>): CustomerLoginRecord => ({
  id: docId,
  userId: typeof data.userId === 'string' ? data.userId : null,
  userEmail: typeof data.userEmail === 'string' ? data.userEmail : null,
  userName: typeof data.userName === 'string' ? data.userName : null,
  loginAt: toDate(data.loginAt),
  createdAt: toDate(data.createdAt),
});

export class CustomerLoginModel {
  static collectionName = COLLECTION_NAME;

  static async recordLogin(input: { userId?: string | null; userEmail?: string | null; userName?: string | null }): Promise<void> {
    await addDoc(collection(db, this.collectionName), {
      userId: input.userId ?? null,
      userEmail: input.userEmail ?? null,
      userName: input.userName ?? null,
      loginAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  }

  static async findBetween(start?: Date, end?: Date): Promise<CustomerLoginRecord[]> {
    const baseCollection = collection(db, this.collectionName);
    const constraints: QueryConstraint[] = [orderBy('loginAt', 'desc')];

    if (start) {
      constraints.push(where('loginAt', '>=', Timestamp.fromDate(start)));
    }
    if (end) {
      constraints.push(where('loginAt', '<=', Timestamp.fromDate(end)));
    }

    const snapshot = await getDocs(query(baseCollection, ...constraints));
    return snapshot.docs.map((docSnap) => mapDoc(docSnap.id, docSnap.data() as Record<string, unknown>));
  }

  static async countSince(start: Date): Promise<{ total: number; uniqueCustomers: number }> {
    const records = await this.findBetween(start, undefined);
    const uniqueIds = new Set(records.map((record) => record.userId).filter((value): value is string => Boolean(value)));
    return {
      total: records.length,
      uniqueCustomers: uniqueIds.size,
    };
  }
}
