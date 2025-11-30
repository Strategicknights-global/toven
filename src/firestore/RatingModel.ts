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
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { RatingSchema } from '../schemas/RatingSchema';

export class RatingModel {
  static collectionName = 'ratings';

  static get collectionRef() {
    return collection(db, this.collectionName);
  }

  static docRef(id: string) {
    return doc(db, this.collectionName, id);
  }

  static mapDoc(docSnap: any): RatingSchema {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId: data.userId ?? '',
      userName: data.userName ?? '',
      userEmail: data.userEmail ?? '',
      rating: data.rating ?? 0,
      feedback: data.feedback ?? '',
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt ? new Date(data.updatedAt) : undefined,
      userRole: data.userRole ?? undefined,
      status: data.status ?? 'pending',
    };
  }

  static async create(data: Omit<RatingSchema, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(this.collectionRef, {
      ...data,
      createdAt: serverTimestamp(),
      status: data.status ?? 'pending',
    });
    return docRef.id;
  }

  static async getById(id: string): Promise<RatingSchema | null> {
    const docSnap = await getDoc(this.docRef(id));
    if (!docSnap.exists()) {
      return null;
    }
    return this.mapDoc(docSnap);
  }

  static async getAll(): Promise<RatingSchema[]> {
    const q = query(this.collectionRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => this.mapDoc(doc));
  }

  static async getByUserId(userId: string): Promise<RatingSchema[]> {
    const q = query(this.collectionRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => this.mapDoc(doc));
  }

  static async getByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<RatingSchema[]> {
    const q = query(this.collectionRef, where('status', '==', status), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => this.mapDoc(doc));
  }

  static async getApprovedRatings(): Promise<RatingSchema[]> {
    return this.getByStatus('approved');
  }

  static async update(id: string, data: Partial<RatingSchema>): Promise<void> {
    const updateData: any = { ...data };
    delete updateData.id;
    delete updateData.createdAt;
    updateData.updatedAt = serverTimestamp();
    await updateDoc(this.docRef(id), updateData);
  }

  static async updateStatus(id: string, status: 'pending' | 'approved' | 'rejected'): Promise<void> {
    await this.update(id, { status });
  }

  static async delete(id: string): Promise<void> {
    await deleteDoc(this.docRef(id));
  }

  static async getAverageRating(): Promise<number> {
    const ratings = await this.getApprovedRatings();
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return sum / ratings.length;
  }

  static async getRatingStats(): Promise<{ average: number; total: number; breakdown: Record<number, number> }> {
    const ratings = await this.getApprovedRatings();
    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    ratings.forEach((r) => {
      breakdown[r.rating] = (breakdown[r.rating] || 0) + 1;
    });

    const average = ratings.length > 0 ? ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length : 0;

    return {
      average,
      total: ratings.length,
      breakdown,
    };
  }
}
