import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  StudentVerificationCreateInput,
  StudentVerificationSchema,
  StudentVerificationStatus,
  StudentVerificationStatusUpdateInput,
} from '../schemas/StudentVerificationSchema';
import {
  STUDENT_VERIFICATION_STATUSES,
  normalizeStudentVerificationInput,
} from '../schemas/StudentVerificationSchema';
import { executeSearchQuery, executeSearchQueryCount, type SearchParams, type PaginationParams } from '../utils/firestoreSearch';

const COLLECTION_NAME = 'studentVerifications';

const toDate = (value: unknown): Date | undefined => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  if (typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return undefined;
};

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toStringSafe = (value: unknown, fallback = ''): string => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const mapDoc = (docId: string, data: Record<string, unknown>): StudentVerificationSchema => {
  const statusValue = typeof data.status === 'string' ? data.status : 'pending';
  const status: StudentVerificationStatus = STUDENT_VERIFICATION_STATUSES.includes(statusValue as StudentVerificationStatus)
    ? (statusValue as StudentVerificationStatus)
    : 'pending';

  return {
    id: docId,
    userId: toStringSafe(data.userId),
    userName: toStringSafe(data.userName),
    userEmail: toStringOrNull(data.userEmail),
    userPhone: toStringOrNull(data.userPhone),
    studentId: toStringSafe(data.studentId),
    institutionName: toStringSafe(data.institutionName),
    course: toStringSafe(data.course),
    yearOfStudy: toStringSafe(data.yearOfStudy),
    expectedGraduation: toStringOrNull(data.expectedGraduation),
    studentIdCardImage: toStringOrNull(data.studentIdCardImage),
    enrollmentCertificate: toStringOrNull(data.enrollmentCertificate),
    additionalDocument: toStringOrNull(data.additionalDocument),
  verificationLocationId: toStringOrNull(data.verificationLocationId),
  verificationLocationName: toStringOrNull(data.verificationLocationName),
    status,
    statusNote: toStringOrNull(data.statusNote),
    reviewedBy: toStringOrNull(data.reviewedBy),
    reviewedByName: toStringOrNull(data.reviewedByName),
    reviewedAt: toDate(data.reviewedAt) ?? null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } satisfies StudentVerificationSchema;
};

export class StudentVerificationModel {
  static collectionName = COLLECTION_NAME;

  static async findAll(): Promise<StudentVerificationSchema[]> {
    const verificationsQuery = query(collection(db, this.collectionName), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(verificationsQuery);
    return snapshot.docs.map((docSnap) => mapDoc(docSnap.id, docSnap.data()));
  }

  static async findById(id: string): Promise<StudentVerificationSchema | null> {
    const ref = doc(db, this.collectionName, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    return mapDoc(snap.id, snap.data());
  }

  static async findByUserId(userId: string): Promise<StudentVerificationSchema[]> {
    const verificationsQuery = query(
      collection(db, this.collectionName),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(verificationsQuery);
    return snapshot.docs.map((docSnap) => mapDoc(docSnap.id, docSnap.data()));
  }

  static async create(input: StudentVerificationCreateInput): Promise<string> {
    const normalized = normalizeStudentVerificationInput(input);

    const payload: DocumentData = {
      userId: normalized.userId,
      userName: normalized.userName,
      userEmail: normalized.userEmail,
      userPhone: normalized.userPhone,
      studentId: normalized.studentId,
      institutionName: normalized.institutionName,
      course: normalized.course,
      yearOfStudy: normalized.yearOfStudy,
      expectedGraduation: normalized.expectedGraduation,
      studentIdCardImage: normalized.studentIdCardImage,
      enrollmentCertificate: normalized.enrollmentCertificate,
      additionalDocument: normalized.additionalDocument,
  verificationLocationId: normalized.verificationLocationId,
  verificationLocationName: normalized.verificationLocationName,
      status: 'pending',
      statusNote: null,
      reviewedBy: null,
      reviewedByName: null,
      reviewedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } satisfies DocumentData;

    const docRef = await addDoc(collection(db, this.collectionName), payload);
    return docRef.id;
  }

  static async updateStatus(id: string, input: StudentVerificationStatusUpdateInput): Promise<void> {
    const ref = doc(db, this.collectionName, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error('Student verification not found');
    }

    const statusValue: StudentVerificationStatus = STUDENT_VERIFICATION_STATUSES.includes(input.status)
      ? input.status
      : 'pending';

    const payload: DocumentData = {
      status: statusValue,
      statusNote: input.statusNote ? input.statusNote.trim() : null,
      reviewedBy: input.reviewedBy,
      reviewedByName: input.reviewedByName ? input.reviewedByName.trim() : null,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } satisfies DocumentData;

    await updateDoc(ref, payload);
  }

  // Server-side paginated search
  static async searchPaginated(
    pagination: PaginationParams,
    search: SearchParams | null = null
  ): Promise<{ data: StudentVerificationSchema[]; total: number }> {
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
