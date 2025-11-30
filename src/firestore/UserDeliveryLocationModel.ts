import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  UserDeliveryLocationSchema,
  UserDeliveryLocationCreateInput,
  UserDeliveryLocationUpdateInput,
} from '../schemas/UserDeliveryLocationSchema';
import {
  normalizeUserDeliveryLocationInput,
  normalizeUserDeliveryLocationUpdateInput,
} from '../schemas/UserDeliveryLocationSchema';

const COLLECTION_NAME = 'userDeliveryLocations';

const toDate = (value: unknown): Date | undefined => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return undefined;
};

const fromFirestore = (id: string, data: any): UserDeliveryLocationSchema => ({
  id,
  userId: data.userId || '',
  userName: data.userName || null,
  locationName: data.locationName || '',
  address: data.address || '',
  coordinates: data.coordinates || '0,0', // Mandatory field
  landmark: data.landmark || null,
  contactPhone: data.contactPhone || null,
  contactName: data.contactName || null,
  isDefault: Boolean(data.isDefault),
  createdAt: toDate(data.createdAt),
  updatedAt: toDate(data.updatedAt),
});

export class UserDeliveryLocationModel {
  /**
   * Find all delivery locations for a specific user
   * Results are sorted in memory (default first, then by creation date)
   */
  static async findByUserId(userId: string): Promise<UserDeliveryLocationSchema[]> {
    const collectionRef = collection(db, COLLECTION_NAME);
    const q = query(
      collectionRef,
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const locations = snapshot.docs.map((doc) => fromFirestore(doc.id, doc.data()));
    
    // Sort in memory: default locations first, then by creation date (newest first)
    return locations.sort((a, b) => {
      if (a.isDefault !== b.isDefault) {
        return a.isDefault ? -1 : 1;
      }
      const aTime = a.createdAt?.getTime() ?? 0;
      const bTime = b.createdAt?.getTime() ?? 0;
      return bTime - aTime;
    });
  }

  /**
   * Fetch all delivery locations across users
   */
  static async findAll(): Promise<UserDeliveryLocationSchema[]> {
    const collectionRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(collectionRef);
    return snapshot.docs.map((doc) => fromFirestore(doc.id, doc.data()));
  }

  /**
   * Find a specific delivery location by ID
   */
  static async findById(id: string): Promise<UserDeliveryLocationSchema | null> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return null;
    }
    return fromFirestore(docSnap.id, docSnap.data());
  }

  /**
   * Create a new delivery location
   * If isDefault is true, unset default flag on other locations for this user
   * If this is the first location for the user, automatically set it as default
   */
  static async create(input: UserDeliveryLocationCreateInput): Promise<UserDeliveryLocationSchema> {
    const normalized = normalizeUserDeliveryLocationInput(input);
    const now = Timestamp.now();

    // Check if this is the first location for the user
    const existingLocations = await this.findByUserId(normalized.userId);
    const isFirstLocation = existingLocations.length === 0;

    // If this is the first location, automatically make it default
    let isDefault = normalized.isDefault;
    if (isFirstLocation) {
      isDefault = true;
    }

    // If this is the default location, unset default on others first
    if (isDefault) {
      await this.unsetAllDefaults(normalized.userId);
    }

    const docData = {
      ...normalized,
      isDefault,
      createdAt: now,
      updatedAt: now,
    };

    const collectionRef = collection(db, COLLECTION_NAME);
    const docRef = await addDoc(collectionRef, docData);
    const newDoc = await getDoc(docRef);
    return fromFirestore(newDoc.id, newDoc.data()!);
  }

  /**
   * Update an existing delivery location
   */
  static async update(
    id: string,
    input: UserDeliveryLocationUpdateInput
  ): Promise<UserDeliveryLocationSchema | null> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    const normalized = normalizeUserDeliveryLocationUpdateInput(input);
    const updateData = {
      ...normalized,
      updatedAt: Timestamp.now(),
    };

    await updateDoc(docRef, updateData);
    const updated = await getDoc(docRef);
    return fromFirestore(updated.id, updated.data()!);
  }

  /**
   * Delete a delivery location
   */
  static async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }

  /**
   * Set a location as default
   * Unsets default flag on all other locations for this user
   */
  static async setAsDefault(id: string, userId: string): Promise<UserDeliveryLocationSchema | null> {
    // First, unset all defaults for this user
    await this.unsetAllDefaults(userId);

    // Then set this one as default
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      isDefault: true,
      updatedAt: Timestamp.now(),
    });

    const updated = await getDoc(docRef);
    if (!updated.exists()) {
      return null;
    }
    return fromFirestore(updated.id, updated.data()!);
  }

  /**
   * Unset default flag on all locations for a user
   */
  private static async unsetAllDefaults(userId: string): Promise<void> {
    const collectionRef = collection(db, COLLECTION_NAME);
    const q = query(collectionRef, where('userId', '==', userId), where('isDefault', '==', true));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        isDefault: false,
        updatedAt: Timestamp.now(),
      });
    });
    await batch.commit();
  }

  /**
   * Get the default delivery location for a user
   */
  static async getDefault(userId: string): Promise<UserDeliveryLocationSchema | null> {
    const collectionRef = collection(db, COLLECTION_NAME);
    const q = query(
      collectionRef,
      where('userId', '==', userId),
      where('isDefault', '==', true)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    return fromFirestore(snapshot.docs[0].id, snapshot.docs[0].data());
  }
}
