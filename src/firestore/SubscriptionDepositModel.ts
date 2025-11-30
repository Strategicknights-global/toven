import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { SubscriptionDepositCreateInput, SubscriptionDepositSchema } from '../schemas/SubscriptionDepositSchema';

export class SubscriptionDepositModel {
  static collectionName = 'subscriptionDeposits';

  private static toDate(value: unknown): Date | undefined {
    if (value instanceof Timestamp) {
      return value.toDate();
    }
    if (value instanceof Date) {
      return value;
    }
    return undefined;
  }

  private static mapDoc(docId: string, data: Record<string, unknown>): SubscriptionDepositSchema {
    return {
      id: docId,
      userId: typeof data.userId === 'string' ? data.userId : undefined,
      amount: typeof data.amount === 'number' ? data.amount : 0,
      currency: typeof data.currency === 'string' ? data.currency : 'INR',
      paymentReference: typeof data.paymentReference === 'string' ? data.paymentReference : null,
      invoiceImageBase64: typeof data.invoiceImageBase64 === 'string' ? data.invoiceImageBase64 : null,
      invoiceFileName: typeof data.invoiceFileName === 'string' ? data.invoiceFileName : null,
      paidAt: this.toDate(data.paidAt),
      createdAt: this.toDate(data.createdAt),
      updatedAt: this.toDate(data.updatedAt),
    };
  }

  static async findByUserId(userId: string): Promise<SubscriptionDepositSchema | null> {
    const depositQuery = query(
      collection(db, this.collectionName),
      where('userId', '==', userId),
      limit(1),
    );

    const snapshot = await getDocs(depositQuery);
    if (snapshot.empty) {
      return null;
    }

    const docSnap = snapshot.docs[0];
    return this.mapDoc(docSnap.id, docSnap.data());
  }

  static async findById(id: string): Promise<SubscriptionDepositSchema | null> {
    const ref = doc(db, this.collectionName, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    return this.mapDoc(snap.id, snap.data() as Record<string, unknown>);
  }

  static async findAll(): Promise<SubscriptionDepositSchema[]> {
    const snapshot = await getDocs(query(collection(db, this.collectionName), orderBy('paidAt', 'desc')));
    return snapshot.docs.map((docSnap) => this.mapDoc(docSnap.id, docSnap.data() as Record<string, unknown>));
  }

  static async searchPaginated(pagination: { pageNumber: number; pageSize: number }): Promise<{ data: SubscriptionDepositSchema[]; total: number }> {
    const snapshot = await getDocs(query(collection(db, this.collectionName), orderBy('paidAt', 'desc')));
    const total = snapshot.size;
    const offset = (pagination.pageNumber - 1) * pagination.pageSize;
    const paginatedDocs = snapshot.docs.slice(offset, offset + pagination.pageSize);
    return {
      data: paginatedDocs.map((docSnap) => this.mapDoc(docSnap.id, docSnap.data() as Record<string, unknown>)),
      total,
    };
  }

  static async create(data: SubscriptionDepositCreateInput): Promise<string> {
    const payload = {
      userId: data.userId,
      amount: data.amount,
      currency: data.currency,
      paymentReference: data.paymentReference ?? null,
      invoiceImageBase64: data.invoiceImageBase64 ?? null,
      invoiceFileName: data.invoiceFileName ?? null,
      paidAt: data.paidAt ?? serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const ref = await addDoc(collection(db, this.collectionName), payload);
    return ref.id;
  }
}
