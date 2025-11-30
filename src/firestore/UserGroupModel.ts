import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, serverTimestamp, CollectionReference, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { UserGroupSchema } from '../schemas/UserGroupSchema';
import { UserGroupCreate, UserGroupUpdate } from '../schemas/UserGroupSchema';
import { type as ark } from 'arktype';

export class UserGroupModel {
  static collectionName = 'userGroups';

  static async create(data: Partial<UserGroupSchema>): Promise<string> {
    const parsed = UserGroupCreate(data as any);
    if (parsed instanceof ark.errors) {
      throw new Error(`User group validation failed: ${String(parsed)}`);
    }

    const validated = parsed as Pick<UserGroupSchema, 'name' | 'description' | 'coveragePolygons'>;
    const docRef = await addDoc(collection(db, this.collectionName) as CollectionReference<UserGroupSchema>, {
      ...validated,
      coveragePolygons: validated.coveragePolygons ?? [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  }

  static async findAll(): Promise<UserGroupSchema[]> {
    const snapshot = await getDocs(collection(db, this.collectionName) as CollectionReference<UserGroupSchema>);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserGroupSchema));
  }

  static async findById(id: string): Promise<UserGroupSchema | null> {
    const docSnap = await getDoc(doc(db, this.collectionName, id));
    if (!docSnap.exists()) {
      return null;
    }
    return { id: docSnap.id, ...docSnap.data() } as UserGroupSchema;
  }

  static async findByName(name: string): Promise<UserGroupSchema | null> {
    const q = query(collection(db, this.collectionName) as CollectionReference<UserGroupSchema>, where('name', '==', name));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as UserGroupSchema;
  }

  static async updateById(id: string, data: Partial<UserGroupSchema>): Promise<void> {
    const parsed = UserGroupUpdate(data as any);
    if (parsed instanceof ark.errors) {
      throw new Error(`User group validation failed: ${String(parsed)}`);
    }
    const updateData: any = { updatedAt: serverTimestamp() };
    Object.keys(parsed as object).forEach(key => {
      if ((parsed as any)[key] !== undefined) {
        updateData[key] = (parsed as any)[key];
      }
    });
    await updateDoc(doc(db, this.collectionName, id), updateData);
  }

  static async deleteById(id: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, id));
  }
}
