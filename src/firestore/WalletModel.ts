import { addDoc, collection, doc, getDoc, getDocs, limit, query, serverTimestamp, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { WalletCreateInput, WalletSchema } from '../schemas/WalletSchema';
import { executeSearchQuery, executeSearchQueryCount, type SearchParams, type PaginationParams } from '../utils/firestoreSearch';

export class WalletModel {
  static collectionName = 'wallets';

  private static toDate(value: unknown): Date | undefined {
    if (value instanceof Timestamp) {
      return value.toDate();
    }
    if (value instanceof Date) {
      return value;
    }
    return undefined;
  }

  private static mapDoc(docId: string, data: Record<string, unknown>): WalletSchema {
    return {
      id: docId,
      customerId: typeof data.customerId === 'string' ? data.customerId : undefined,
      customerName: typeof data.customerName === 'string' ? data.customerName : undefined,
      customerEmail: typeof data.customerEmail === 'string' ? data.customerEmail : undefined,
      coins: typeof data.coins === 'number' ? data.coins : 0,
      createdAt: this.toDate(data.createdAt),
      updatedAt: this.toDate(data.updatedAt),
    };
  }

  static async findAll(): Promise<WalletSchema[]> {
    const snapshot = await getDocs(collection(db, this.collectionName));
    return snapshot.docs.map((docSnap) => this.mapDoc(docSnap.id, docSnap.data()));
  }

  static async searchPaginated(
    pagination: PaginationParams,
    search: SearchParams | null = null
  ): Promise<{ data: WalletSchema[]; total: number }> {
    const rawData = await executeSearchQuery<Record<string, unknown>>(
      this.collectionName,
      search,
      pagination
    );
    const data = rawData.map((doc) => this.mapDoc(doc.id as string, doc));
    const total = await executeSearchQueryCount(
      this.collectionName,
      search
    );
    return { data, total };
  }

  static async findByCustomerId(customerId: string): Promise<WalletSchema | null> {
    const walletQuery = query(
      collection(db, this.collectionName),
      where('customerId', '==', customerId),
      limit(1),
    );

    const snapshot = await getDocs(walletQuery);
    if (snapshot.empty) {
      return null;
    }

    const docSnap = snapshot.docs[0];
    return this.mapDoc(docSnap.id, docSnap.data());
  }

  static async findById(id: string): Promise<WalletSchema | null> {
    const ref = doc(db, this.collectionName, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    return this.mapDoc(snap.id, snap.data());
  }

  static async create(data: WalletCreateInput): Promise<string> {
    const payload = {
      customerId: data.customerId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      coins: data.coins,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, this.collectionName), payload);
    return ref.id;
  }

  static async addCoins(customerId: string, coins: number): Promise<void> {
    const wallet = await this.findByCustomerId(customerId);
    
    if (!wallet || !wallet.id) {
      throw new Error('Wallet not found for customer');
    }

    const walletRef = doc(db, this.collectionName, wallet.id);
    const currentCoins = wallet.coins || 0;
    const newCoins = currentCoins + coins;

    await import('firebase/firestore').then(({ updateDoc }) =>
      updateDoc(walletRef, {
        coins: newCoins,
        updatedAt: serverTimestamp(),
      })
    );
  }

  static async updateCoins(walletId: string, operation: 'add' | 'reduce' | 'set', amount: number): Promise<void> {
    const wallet = await this.findById(walletId);
    
    if (!wallet || !wallet.id) {
      throw new Error('Wallet not found');
    }

    const walletRef = doc(db, this.collectionName, wallet.id);
    const currentCoins = wallet.coins || 0;
    
    let newCoins: number;
    if (operation === 'add') {
      newCoins = currentCoins + amount;
    } else if (operation === 'reduce') {
      newCoins = currentCoins - amount;
      if (newCoins < 0) {
        throw new Error('Insufficient coins. Cannot reduce below 0.');
      }
    } else if (operation === 'set') {
      newCoins = amount;
    } else {
      throw new Error('Invalid operation');
    }

    await import('firebase/firestore').then(({ updateDoc }) =>
      updateDoc(walletRef, {
        coins: newCoins,
        updatedAt: serverTimestamp(),
      })
    );
  }
}
