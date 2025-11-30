import { collection, getDocs, doc, getDoc, query, where, addDoc, serverTimestamp, updateDoc, deleteDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import type { ProductCreateInput, ProductSchema, ProductUpdateInput } from '../schemas/ProductSchema';
import { executeSearchQuery, executeSearchQueryCount, type SearchParams, type PaginationParams } from '../utils/firestoreSearch';

export class ProductModel {
  static collectionName = 'products';

  static async findAll(filter?: { unit?: string }): Promise<ProductSchema[]> {
    const baseCollection = collection(db, this.collectionName);
    const collQuery = filter?.unit
      ? query(baseCollection, where('unit', '==', filter.unit))
      : baseCollection;

    const snapshot = await getDocs(collQuery);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })) as ProductSchema[];
  }

  static async findById(id: string): Promise<ProductSchema | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return null;
    }
    return { id: docSnap.id, ...docSnap.data() } as ProductSchema;
  }

  static async create(data: ProductCreateInput): Promise<string> {
    const payload = {
      name: data.name.trim(),
      currentStock: Number.isFinite(data.currentStock) ? Number(data.currentStock) : 0,
      unit: data.unit,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, this.collectionName), payload);
    return docRef.id;
  }

  static async update(id: string, data: ProductUpdateInput): Promise<void> {
    const payload: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };

    if (typeof data.name === 'string') {
      payload.name = data.name.trim();
    }

    if (typeof data.currentStock === 'number' && Number.isFinite(data.currentStock)) {
      payload.currentStock = Number(data.currentStock);
    }

    if (data.unit) {
      payload.unit = data.unit;
    }

  await updateDoc(doc(db, this.collectionName, id), payload);
  }
  static async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, id));
  }

  static async adjustStock(id: string, delta: number): Promise<void> {
    await updateDoc(doc(db, this.collectionName, id), {
      currentStock: increment(delta),
      updatedAt: serverTimestamp(),
    });
  }

  // Server-side paginated search
  static async searchPaginated(
    pagination: PaginationParams,
    search: SearchParams | null = null
  ): Promise<{ data: ProductSchema[]; total: number }> {
    const rawData = await executeSearchQuery<ProductSchema>(
      this.collectionName,
      search,
      pagination
    );
    const data = rawData.map((doc) => ({ id: doc.id as string, ...doc }));
    const total = await executeSearchQueryCount(
      this.collectionName,
      search
    );
    return { data, total };
  }
}
