import { collection, doc, addDoc, getDoc, getDocs, updateDoc, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { ReferralSchema } from '../schemas/ReferralSchema';
import { ReferralCreate, ReferralUpdate } from '../schemas/ReferralSchema';
import { type as ark } from 'arktype';
import { executeSearchQuery, executeSearchQueryCount, type SearchParams, type PaginationParams } from '../utils/firestoreSearch';

export class ReferralModel {
  static collectionName = 'referrals';

  private static toDate(value: unknown): Date | undefined {
    if (value instanceof Timestamp) {
      return value.toDate();
    }
    if (value instanceof Date) {
      return value;
    }
    return undefined;
  }

  // Create a new referral document
  static async create(data: Partial<ReferralSchema>): Promise<string> {
    const parsed = ReferralCreate(data as any);
    if (parsed instanceof ark.errors) {
      throw new Error(`Referral validation failed: ${String(parsed)}`);
    }
    const validatedData = parsed as Omit<ReferralSchema, 'id' | 'createdAt' | 'updatedAt'>;

    const commonData = {
      ...validatedData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, this.collectionName), commonData);
    return docRef.id;
  }

  // Get referral by ID
  static async findById(id: string): Promise<ReferralSchema | null> {
    const docSnap = await getDoc(doc(db, this.collectionName, id));
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: this.toDate(data.createdAt),
        updatedAt: this.toDate(data.updatedAt),
      } as ReferralSchema;
    }
    return null;
  }

  // Get all referrals (with optional query)
  static async findAll(): Promise<ReferralSchema[]> {
    const snapshot = await getDocs(collection(db, this.collectionName));
    return snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: this.toDate(data.createdAt),
        updatedAt: this.toDate(data.updatedAt),
      } as ReferralSchema;
    });
  }

  // Find referrals by referrer ID
  static async findByReferrerId(referrerId: string): Promise<ReferralSchema[]> {
    const q = query(collection(db, this.collectionName), where('referrerId', '==', referrerId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: this.toDate(data.createdAt),
        updatedAt: this.toDate(data.updatedAt),
      } as ReferralSchema;
    });
  }

  // Find referral by referred user ID
  static async findByReferredUserId(referredUserId: string): Promise<ReferralSchema | null> {
    const q = query(collection(db, this.collectionName), where('referredUserId', '==', referredUserId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: this.toDate(data.createdAt),
        updatedAt: this.toDate(data.updatedAt),
      } as ReferralSchema;
    }
    return null;
  }

  // Update referral by ID
  static async updateById(id: string, data: Partial<ReferralSchema>): Promise<void> {
    const parsed = ReferralUpdate(data as any);
    if (parsed instanceof ark.errors) {
      throw new Error(`Referral validation failed: ${String(parsed)}`);
    }
    const updateData: any = { updatedAt: serverTimestamp() };
    Object.keys(parsed as object).forEach(key => {
      if ((parsed as any)[key] !== undefined) {
        updateData[key] = (parsed as any)[key];
      }
    });

    await updateDoc(doc(db, this.collectionName, id), updateData);
  }

  // Get referral statistics for a referrer
  static async getReferralStats(referrerId: string): Promise<{
    totalReferrals: number;
    totalCoinsEarned: number;
    completedReferrals: number;
  }> {
    const referrals = await this.findByReferrerId(referrerId);
    
    const totalReferrals = referrals.length;
    const totalCoinsEarned = referrals.reduce((sum, ref) => sum + (ref.coinsEarned || 0), 0);
    const completedReferrals = referrals.filter(ref => ref.status === 'completed').length;

    return {
      totalReferrals,
      totalCoinsEarned,
      completedReferrals,
    };
  }

  // Server-side paginated search
  static async searchPaginated(
    pagination: PaginationParams,
    search: SearchParams | null = null
  ): Promise<{ data: ReferralSchema[]; total: number }> {
    const rawData = await executeSearchQuery<Record<string, unknown>>(
      this.collectionName,
      search,
      pagination
    );
    const data = rawData.map((doc) => {
      const status: 'pending' | 'completed' | 'cancelled' = 
        (doc.status === 'pending' || doc.status === 'completed' || doc.status === 'cancelled') 
          ? doc.status 
          : 'completed';
      return {
        id: doc.id as string,
        referralCode: typeof doc.referralCode === 'string' ? doc.referralCode : '',
        referrerId: typeof doc.referrerId === 'string' ? doc.referrerId : '',
        referredUserId: typeof doc.referredUserId === 'string' ? doc.referredUserId : '',
        referredUserName: typeof doc.referredUserName === 'string' ? doc.referredUserName : undefined,
        referredUserEmail: typeof doc.referredUserEmail === 'string' ? doc.referredUserEmail : undefined,
        coinsEarned: typeof doc.coinsEarned === 'number' ? doc.coinsEarned : 0,
        status,
        createdAt: this.toDate(doc.createdAt),
        updatedAt: this.toDate(doc.updatedAt),
      };
    });
    const total = await executeSearchQueryCount(
      this.collectionName,
      search
    );
    return { data, total };
  }
}
