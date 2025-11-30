import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { UserSchema } from '../schemas/UserSchema';
import { UserCreate, UserUpdate } from '../schemas/UserSchema';
import { type as ark } from 'arktype';
import { generateUniqueReferralCode } from '../utils/referralUtils';
import { executeSearchQuery, executeSearchQueryCount, type SearchParams, type PaginationParams } from '../utils/firestoreSearch';
import { generateNextCustomerId } from '../utils/customerIdGenerator';

const toDate = (value: unknown): Date | undefined => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return undefined;
};

const mapDoc = (docId: string, data: Record<string, unknown>): UserSchema => ({
  id: docId,
  customerId: typeof data.customerId === 'string' ? data.customerId : undefined,
  fullName: typeof data.fullName === 'string' ? data.fullName : '',
  email: typeof data.email === 'string' ? data.email : '',
  phone: typeof data.phone === 'string' ? data.phone : '',
  userType: typeof data.userType === 'string' ? data.userType : '',
  roles: Array.isArray(data.roles) ? data.roles.map(r => String(r)) : [],
  verificationLocationId: typeof data.verificationLocationId === 'string' ? data.verificationLocationId : undefined,
  verificationLocationName: typeof data.verificationLocationName === 'string' ? data.verificationLocationName : undefined,
  referralCode: typeof data.referralCode === 'string' ? data.referralCode : undefined,
  groupId: typeof data.groupId === 'string' ? data.groupId : undefined,
  prefix: data.prefix === 'Mr' || data.prefix === 'Mrs' || data.prefix === 'Ms' ? data.prefix : undefined,
  firstName: typeof data.firstName === 'string' ? data.firstName : undefined,
  lastName: typeof data.lastName === 'string' ? data.lastName : undefined,
  isActive: typeof data.isActive === 'boolean' ? data.isActive : undefined,
  contactNumber: typeof data.contactNumber === 'string' ? data.contactNumber : undefined,
  roleType: data.roleType === 'Delivery' || data.roleType === 'Chef' || data.roleType === 'Admin' ? data.roleType : undefined,
  vehicleNumber: typeof data.vehicleNumber === 'string' ? data.vehicleNumber : undefined,
  vehicleModel: typeof data.vehicleModel === 'string' ? data.vehicleModel : undefined,
  specialization: typeof data.specialization === 'string' ? data.specialization : undefined,
  experience: typeof data.experience === 'string' ? data.experience : undefined,
  createdAt: toDate(data.createdAt),
  updatedAt: toDate(data.updatedAt),
});

// Mongoose-like model for User collection
export class UserModel {
  static collectionName = 'users';

  // Create a new user document
  static async create(data: Partial<UserSchema>, id?: string): Promise<string> {
    // Validate and apply defaults for create
    const parsed = UserCreate(data as any);
    if (parsed instanceof ark.errors) {
      throw new Error(`User validation failed: ${String(parsed)}`);
    }
    const validatedData = parsed as Omit<UserSchema, 'id' | 'createdAt' | 'updatedAt'>;

    // Generate customer ID for customers (users with userType not 'Admin', 'Delivery', 'Chef')
    let customerId: string | undefined;
    const roleType = validatedData.roleType?.toLowerCase();
    
    // Check if this is a customer (not admin/delivery/chef)
    const isCustomer = !roleType || 
                       (roleType !== 'admin' && roleType !== 'delivery' && roleType !== 'chef');
    
    if (isCustomer && !validatedData.customerId) {
      try {
        customerId = await generateNextCustomerId();
      } catch (error) {
        console.error('Failed to generate customer ID:', error);
        // Continue without customerId if generation fails
      }
    }

    const commonData = {
      ...validatedData,
      ...(customerId ? { customerId } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    let docId: string;
    if (id) {
      await setDoc(doc(db, this.collectionName, id), commonData);
      docId = id;
    } else {
      const docRef = await addDoc(collection(db, this.collectionName), commonData);
      docId = docRef.id;
    }

    return docId;
  }

  // Get user by ID
  static async findById(id: string): Promise<UserSchema | null> {
    const docSnap = await getDoc(doc(db, this.collectionName, id));
    if (docSnap.exists()) {
      return mapDoc(docSnap.id, docSnap.data());
    }
    return null;
  }

  // Get all users (with optional query)
  static async findAll(queryParams?: { email?: string }): Promise<UserSchema[]> {
    const coll = collection(db, this.collectionName);
    const snapshot = await getDocs(
      queryParams?.email ? query(coll, where('email', '==', queryParams.email)) : coll
    );
    return snapshot.docs.map(d => mapDoc(d.id, d.data()));
  }

  // Update user by ID
  static async updateById(id: string, data: Partial<UserSchema>): Promise<void> {
    // Validate partial update: only provided fields
    const parsed = UserUpdate(data as any);
    if (parsed instanceof ark.errors) {
      throw new Error(`User validation failed: ${String(parsed)}`);
    }
    const updateData: any = { updatedAt: serverTimestamp() };
    Object.keys(parsed as object).forEach(key => {
      if ((parsed as any)[key] !== undefined) {
        updateData[key] = (parsed as any)[key];
      }
    });

    await updateDoc(doc(db, this.collectionName, id), updateData);
  }

  // Delete user by ID
  static async deleteById(id: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, id));
  }

  // Example: Find user by email
  static async findByEmail(email: string): Promise<UserSchema | null> {
    const coll = collection(db, this.collectionName);
    const q = query(coll, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      return mapDoc(docSnap.id, docSnap.data());
    }
    return null;
  }

  static async generateReferralCode(id: string): Promise<string> {
    const referralCode = await generateUniqueReferralCode();
    await updateDoc(doc(db, this.collectionName, id), {
      referralCode,
      updatedAt: serverTimestamp(),
    });
    return referralCode;
  }

  // Server-side paginated search
  static async searchPaginated(
    pagination: PaginationParams,
    search: SearchParams | null = null
  ): Promise<{ data: UserSchema[]; total: number }> {
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
