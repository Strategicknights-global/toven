import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, serverTimestamp, CollectionReference, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { RoleSchema } from '../schemas/RoleSchema';
import { RoleCreate, RoleUpdate } from '../schemas/RoleSchema';
import { type as ark } from 'arktype';
import { executeSearchQuery, executeSearchQueryCount, type SearchParams, type PaginationParams } from '../utils/firestoreSearch';

const toDate = (value: unknown): Date | undefined => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return undefined;
};

const mapDoc = (docId: string, data: Record<string, unknown>): RoleSchema => ({
  id: docId,
  name: typeof data.name === 'string' ? data.name : '',
  permissions: Array.isArray(data.permissions) ? data.permissions.map(p => String(p)) : [],
  createdAt: toDate(data.createdAt),
  updatedAt: toDate(data.updatedAt),
});

// Mongoose-like model for Role collection
export class RoleModel {
  static collectionName = 'roles';

  // Create a new role document
  static async create(data: Partial<RoleSchema>): Promise<string> {
    // Validate create input
    const parsed = RoleCreate(data as any);
    if (parsed instanceof ark.errors) {
      throw new Error(`Role validation failed: ${String(parsed)}`);
    }
    const validatedData = parsed as Pick<RoleSchema, 'name' | 'permissions'>;

    const docRef = await addDoc(collection(db, this.collectionName) as CollectionReference<RoleSchema>, {
      ...validatedData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  }

  // Get role by ID
  static async findById(id: string): Promise<RoleSchema | null> {
    const docSnap = await getDoc(doc(db, this.collectionName, id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as RoleSchema;
    }
    return null;
  }

  // Get all roles
  static async findAll(): Promise<RoleSchema[]> {
    const querySnapshot = await getDocs(collection(db, this.collectionName) as CollectionReference<RoleSchema>);
    return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as RoleSchema));
  }

  // Update role by ID
  static async updateById(id: string, data: Partial<RoleSchema>): Promise<void> {
    const parsed = RoleUpdate(data as any);
    if (parsed instanceof ark.errors) {
      throw new Error(`Role validation failed: ${String(parsed)}`);
    }
    const updateData: any = { updatedAt: serverTimestamp() };
    Object.keys(parsed as object).forEach(key => {
      if ((parsed as any)[key] !== undefined) {
        updateData[key] = (parsed as any)[key];
      }
    });

    await updateDoc(doc(db, this.collectionName, id), updateData);
  }

  // Delete role by ID
  static async deleteById(id: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, id));
  }

  // Find role by name
  static async findByName(name: string): Promise<RoleSchema | null> {
    const q = query(collection(db, this.collectionName) as CollectionReference<RoleSchema>, where('name', '==', name));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as RoleSchema;
    }
    return null;
  }

  // Server-side paginated search
  static async searchPaginated(
    pagination: PaginationParams,
    search: SearchParams | null = null
  ): Promise<{ data: RoleSchema[]; total: number }> {
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
