export type StudentVerificationStatus = 'pending' | 'approved' | 'rejected';

export const STUDENT_VERIFICATION_STATUSES: readonly StudentVerificationStatus[] = [
  'pending',
  'approved',
  'rejected',
] as const;

export interface StudentVerificationSchema {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string | null;
  userPhone?: string | null;
  
  // Student information
  studentId: string;
  institutionName: string;
  course: string;
  yearOfStudy: string;
  expectedGraduation?: string | null;
  
  // Document uploads (base64 or URLs)
  studentIdCardImage?: string | null;
  enrollmentCertificate?: string | null;
  additionalDocument?: string | null;
  verificationLocationId?: string | null;
  verificationLocationName?: string | null;
  
  // Verification status
  status: StudentVerificationStatus;
  statusNote?: string | null;
  reviewedBy?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: Date | null;
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export type StudentVerificationCreateInput = {
  userId: string;
  userName: string;
  userEmail?: string | null;
  userPhone?: string | null;
  studentId: string;
  institutionName: string;
  course: string;
  yearOfStudy: string;
  expectedGraduation?: string | null;
  studentIdCardImage?: string | null;
  enrollmentCertificate?: string | null;
  additionalDocument?: string | null;
  verificationLocationId?: string | null;
  verificationLocationName?: string | null;
};

export type StudentVerificationStatusUpdateInput = {
  status: StudentVerificationStatus;
  statusNote?: string | null;
  reviewedBy: string;
  reviewedByName?: string | null;
};

const toStringSafe = (value: unknown, fallback = ''): string => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeStudentVerificationInput = (
  input: StudentVerificationCreateInput
): StudentVerificationCreateInput => ({
  userId: toStringSafe(input.userId),
  userName: toStringSafe(input.userName),
  userEmail: toStringOrNull(input.userEmail),
  userPhone: toStringOrNull(input.userPhone),
  studentId: toStringSafe(input.studentId),
  institutionName: toStringSafe(input.institutionName),
  course: toStringSafe(input.course),
  yearOfStudy: toStringSafe(input.yearOfStudy),
  expectedGraduation: toStringOrNull(input.expectedGraduation),
  studentIdCardImage: toStringOrNull(input.studentIdCardImage),
  enrollmentCertificate: toStringOrNull(input.enrollmentCertificate),
  additionalDocument: toStringOrNull(input.additionalDocument),
  verificationLocationId: toStringOrNull(input.verificationLocationId),
  verificationLocationName: toStringOrNull(input.verificationLocationName),
});
