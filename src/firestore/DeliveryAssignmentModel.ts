import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type {
  DeliveryAssignmentSchema,
  DeliveryAssignmentStatus,
} from '../schemas/DeliveryAssignmentSchema';
import { DELIVERY_ASSIGNMENT_STATUSES } from '../schemas/DeliveryAssignmentSchema';
import type { SubscriptionRequestSchema } from '../schemas/SubscriptionRequestSchema';
import type { MealType } from '../schemas/FoodItemSchema';
import type { UserSchema } from '../schemas/UserSchema';
import type { UserGroupSchema } from '../schemas/UserGroupSchema';
import { ConfigModel } from './ConfigModel';
import { executeSearchQuery, executeSearchQueryCount, type SearchParams, type PaginationParams } from '../utils/firestoreSearch';

const COLLECTION_NAME = 'deliveryAssignments';

const toStringSafe = (value: unknown, fallback = ''): string => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const toNullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const toNullableNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toDate = (value: unknown): Date | null => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
};

const normalizeStatus = (value: unknown): DeliveryAssignmentStatus | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  const match = DELIVERY_ASSIGNMENT_STATUSES.find(
    (status) => status.toLowerCase() === normalized,
  );
  return match ?? null;
};

const VALID_MEAL_TYPES: readonly MealType[] = ['Breakfast', 'Lunch', 'Dinner'];

const toMealType = (value: unknown): MealType | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return VALID_MEAL_TYPES.includes(normalized as MealType)
    ? (normalized as MealType)
    : null;
};

const sanitizeIdSegment = (value: string): string => value.replace(/[^A-Za-z0-9_-]/g, '-');

const createAssignmentDocId = (subscriptionId: string, mealType?: MealType | null): string => {
  const safeSubscriptionId = sanitizeIdSegment(subscriptionId);
  const mealSegment = mealType ? sanitizeIdSegment(mealType.toLowerCase()) : 'general';
  return `${safeSubscriptionId}-${mealSegment}`;
};

const trimOrEmpty = (value: string | null | undefined): string => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const parseCoordinates = (
  value: string | null | undefined,
): { latitude: number | null; longitude: number | null } => {
  if (typeof value !== 'string') {
    return { latitude: null, longitude: null };
  }
  const [rawLat, rawLng] = value.split(',').map((segment) => segment.trim());
  const lat = rawLat ? Number.parseFloat(rawLat) : Number.NaN;
  const lng = rawLng ? Number.parseFloat(rawLng) : Number.NaN;
  return {
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lng) ? lng : null,
  };
};

const EARTH_RADIUS_KM = 6371;

const toRadians = (value: number): number => (value * Math.PI) / 180;

const haversineDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

const computeDistanceFromHub = (
  hubLatitude: number | null | undefined,
  hubLongitude: number | null | undefined,
  targetLatitude: number | null | undefined,
  targetLongitude: number | null | undefined,
): number => {
  if (
    typeof hubLatitude !== 'number' || !Number.isFinite(hubLatitude) ||
    typeof hubLongitude !== 'number' || !Number.isFinite(hubLongitude) ||
    typeof targetLatitude !== 'number' || !Number.isFinite(targetLatitude) ||
    typeof targetLongitude !== 'number' || !Number.isFinite(targetLongitude)
  ) {
    return 0;
  }
  const distance = haversineDistanceKm(hubLatitude, hubLongitude, targetLatitude, targetLongitude);
  return Number.isFinite(distance) ? Number(distance.toFixed(2)) : 0;
};

const formatTripLabel = (dateValue: Date | null | undefined): string => {
  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) {
    return 'TBD';
  }
  return dateValue.toISOString().split('T')[0];
};

const mapFromData = (
  id: string,
  data: DocumentData,
): DeliveryAssignmentSchema => {
  return {
    id,
    customerId: toStringSafe(data.customerId),
    customerShortId: toNullableString(data.customerShortId),
    customerName: toStringSafe(data.customerName),
    packageName: toStringSafe(data.packageName),
    packageId: toNullableString(data.packageId),
    mealType: toMealType(data.mealType),
    mobileNumber: toStringSafe(data.mobileNumber),
    address: toStringSafe(data.address),
    deliveryLocationName: toNullableString(data.deliveryLocationName),
    deliveryLocationId: toNullableString(data.deliveryLocationId),
    latitude: toNullableNumber(data.latitude),
    longitude: toNullableNumber(data.longitude),
    distanceKm: toNumber(data.distanceKm, 0),
  groupNumber: toStringSafe(data.groupNumber),
  groupId: toNullableString(data.groupId),
  groupName: toNullableString(data.groupName),
    tripNumber: toStringSafe(data.tripNumber),
    subscriptionRequestId: toNullableString(data.subscriptionRequestId),
    assignPersonId: toNullableString(data.assignPersonId),
    assignPersonName: toNullableString(data.assignPersonName),
    status: normalizeStatus(data.status),
    notes: toNullableString(data.notes),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } satisfies DeliveryAssignmentSchema;
};

export class DeliveryAssignmentModel {
  static collectionName = COLLECTION_NAME;

  static subscribeAll(
    onData: (records: DeliveryAssignmentSchema[]) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    const assignmentsCollection = collection(db, this.collectionName);
    return onSnapshot(
      assignmentsCollection,
      (snapshot) => {
  const assignments = snapshot.docs.map((docSnap) => mapFromData(docSnap.id, docSnap.data()));
        onData(assignments);
      },
      (error) => {
        console.error('DeliveryAssignmentModel.subscribeAll error', error);
        onError?.(error as Error);
      },
    );
  }

  static async findAll(): Promise<DeliveryAssignmentSchema[]> {
    const assignmentsCollection = collection(db, this.collectionName);
    const snapshot = await getDocs(assignmentsCollection);
    return snapshot.docs.map((docSnap) => mapFromData(docSnap.id, docSnap.data()));
  }

  static async getById(id: string): Promise<DeliveryAssignmentSchema | null> {
    const ref = doc(db, this.collectionName, id);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      return null;
    }
    return mapFromData(snapshot.id, snapshot.data() as DocumentData);
  }

  static async assignToPerson(
    id: string,
    person: { id: string; name: string },
    status: DeliveryAssignmentStatus = 'en-route',
  ): Promise<void> {
    const ref = doc(db, this.collectionName, id);
    await updateDoc(ref, {
      assignPersonId: person.id,
      assignPersonName: person.name,
      status,
      updatedAt: serverTimestamp(),
    });
  }

  static async clearAssignment(id: string): Promise<void> {
    const ref = doc(db, this.collectionName, id);
    await updateDoc(ref, {
      assignPersonId: null,
      assignPersonName: null,
      status: 'pending',
      updatedAt: serverTimestamp(),
    });
  }

  static async updateTripNumber(id: string, tripLabel: string | null): Promise<void> {
    const ref = doc(db, this.collectionName, id);
    const value = typeof tripLabel === 'string' ? tripLabel.trim() : '';
    await updateDoc(ref, {
      tripNumber: value.length > 0 ? value : null,
      updatedAt: serverTimestamp(),
    });
  }

  static async assignGroupToPerson(
    groupId: string,
    person: { id: string; name: string },
    status: DeliveryAssignmentStatus = 'assigned',
  ): Promise<number> {
    // Get all assignments for this group
    const allAssignments = await this.findAll();
    const groupAssignments = allAssignments.filter((assignment) => assignment.groupId === groupId);

    if (groupAssignments.length === 0) {
      return 0;
    }

    // Use batch write for atomic update
    const batch = writeBatch(db);
    const updateData = {
      assignPersonId: person.id,
      assignPersonName: person.name,
      status,
      updatedAt: serverTimestamp(),
    };

    groupAssignments.forEach((assignment) => {
      const ref = doc(db, this.collectionName, assignment.id);
      batch.update(ref, updateData);
    });

    await batch.commit();
    return groupAssignments.length;
  }

  static async markDelivered(id: string): Promise<void> {
    const ref = doc(db, this.collectionName, id);
    await updateDoc(ref, {
      status: 'delivered',
      updatedAt: serverTimestamp(),
    });
  }

  static async syncFromSubscriptionRequests(
    requests: SubscriptionRequestSchema[],
    users: UserSchema[] = [],
    groups: UserGroupSchema[] = [],
  ): Promise<void> {
    if (!Array.isArray(requests) || requests.length === 0) {
      return;
    }

    const approved = requests.filter((request) => request.status === 'approved' && request.selections.length > 0 && request.id);
    if (approved.length === 0) {
      return;
    }

    const config = await ConfigModel.get();
    const hubLatitude = typeof config.hubLatitude === 'number' && Number.isFinite(config.hubLatitude)
      ? config.hubLatitude
      : null;
    const hubLongitude = typeof config.hubLongitude === 'number' && Number.isFinite(config.hubLongitude)
      ? config.hubLongitude
      : null;

    const existingAssignments = await this.findAll();
    const existingById = new Map(existingAssignments.map((assignment) => [assignment.id, assignment]));

    const usersById = new Map(
      users
        .filter((user): user is UserSchema & { id: string } => typeof user.id === 'string' && user.id.trim().length > 0)
        .map((user) => [user.id as string, user]),
    );

    const groupNameById = new Map(
      groups
        .filter((group): group is UserGroupSchema & { id: string } => typeof group.id === 'string' && group.id.trim().length > 0)
        .map((group) => [group.id as string, group.name?.trim() ?? '']),
    );

    const batch = writeBatch(db);
    let hasChanges = false;

    for (const request of approved) {
      const subscriptionId = request.id as string;
      const contactNumber = trimOrEmpty(request.deliveryLocationContactPhone)
        || trimOrEmpty(request.userPhone);
      const address = trimOrEmpty(request.deliveryLocationAddress);
      const locationName = trimOrEmpty(request.deliveryLocationName) || null;
    const locationId = trimOrEmpty(request.deliveryLocationId) || null;
    const coordinatesRaw = trimOrEmpty(request.deliveryLocationCoordinates);
    const { latitude, longitude } = parseCoordinates(coordinatesRaw || null);
    const distanceKm = computeDistanceFromHub(hubLatitude, hubLongitude, latitude, longitude);
      const userRecord = usersById.get(request.userId);
      const groupId = trimOrEmpty(userRecord?.groupId ?? null) || null;
      const resolvedGroupName = groupId ? (groupNameById.get(groupId) || null) : null;
      const groupNumber = resolvedGroupName || locationName || trimOrEmpty(request.categoryName) || 'Ungrouped';
      const tripNumber = formatTripLabel(request.startDate);
      const customerShortId = trimOrEmpty(request.customerShortId ?? userRecord?.customerId ?? null) || null;
      const customerName = trimOrEmpty(request.userName);
      const mobileNumber = contactNumber;

      // Group selections by delivery time
      // Morning delivery: Breakfast + Lunch combined
      // Evening delivery: Dinner separate
      const morningMeals = request.selections.filter(
        (sel) => sel.mealType === 'Breakfast' || sel.mealType === 'Lunch'
      );
      const eveningMeals = request.selections.filter((sel) => sel.mealType === 'Dinner');

      // Create morning delivery assignment (combines Breakfast + Lunch)
      if (morningMeals.length > 0) {
        const assignmentId = createAssignmentDocId(subscriptionId, 'Breakfast'); // Use Breakfast as ID base
        const existing = existingById.get(assignmentId) ?? null;
        const docRef = doc(db, this.collectionName, assignmentId);

        // Combine package names
        const packageNames = morningMeals
          .map((sel) => `${sel.mealType}: ${trimOrEmpty(sel.packageName) || sel.mealType}`)
          .join(' + ');
        const mealTypes = morningMeals.map((sel) => sel.mealType).join(' + ');

        const payload: DocumentData = {
          subscriptionRequestId: subscriptionId,
          customerId: request.userId,
          customerName,
          customerShortId,
          packageName: packageNames || 'Morning Delivery',
          packageId: morningMeals[0].packageId, // Use first package ID
          mealType: mealTypes, // Combined meal types like "Breakfast + Lunch"
          mobileNumber,
          address,
          deliveryLocationName: locationName,
          deliveryLocationId: locationId,
          latitude,
          longitude,
          groupId,
          groupName: resolvedGroupName,
          groupNumber,
          tripNumber,
          distanceKm,
          updatedAt: serverTimestamp(),
        } satisfies DocumentData;

        if (!existing) {
          hasChanges = true;
          batch.set(
            docRef,
            {
              ...payload,
              assignPersonId: null,
              assignPersonName: null,
              status: 'pending',
              createdAt: serverTimestamp(),
            },
            { merge: true },
          );
        } else {
          const shouldUpdate = (existing.subscriptionRequestId ?? null) !== payload.subscriptionRequestId
            || existing.customerId !== payload.customerId
            || existing.customerName !== payload.customerName
            || (existing.customerShortId ?? null) !== (payload.customerShortId ?? null)
            || existing.packageName !== payload.packageName
            || (existing.packageId ?? null) !== (payload.packageId ?? null)
            || (existing.mealType ?? null) !== (payload.mealType ?? null)
            || existing.mobileNumber !== payload.mobileNumber
            || existing.address !== payload.address
            || (existing.deliveryLocationName ?? null) !== (payload.deliveryLocationName ?? null)
            || (existing.deliveryLocationId ?? null) !== (payload.deliveryLocationId ?? null)
            || (existing.latitude ?? null) !== (payload.latitude ?? null)
            || (existing.longitude ?? null) !== (payload.longitude ?? null)
            || existing.distanceKm !== payload.distanceKm
            || (existing.groupId ?? null) !== (payload.groupId ?? null)
            || (existing.groupName ?? null) !== (payload.groupName ?? null)
            || existing.groupNumber !== payload.groupNumber
            || existing.tripNumber !== payload.tripNumber;

          if (shouldUpdate) {
            hasChanges = true;
            batch.set(
              docRef,
              payload,
              { merge: true },
            );
          }
        }
      }

      // Create evening delivery assignment (Dinner separate)
      for (const selection of eveningMeals) {
        const assignmentId = createAssignmentDocId(subscriptionId, selection.mealType);
        const existing = existingById.get(assignmentId) ?? null;
        const docRef = doc(db, this.collectionName, assignmentId);

        const payload: DocumentData = {
          subscriptionRequestId: subscriptionId,
          customerId: request.userId,
          customerName,
          customerShortId,
          packageName: trimOrEmpty(selection.packageName) || selection.mealType || 'Package',
          packageId: selection.packageId,
          mealType: selection.mealType,
          mobileNumber,
          address,
          deliveryLocationName: locationName,
          deliveryLocationId: locationId,
          latitude,
          longitude,
          groupId,
          groupName: resolvedGroupName,
          groupNumber,
          tripNumber,
          distanceKm,
          updatedAt: serverTimestamp(),
        } satisfies DocumentData;

        if (!existing) {
          hasChanges = true;
          batch.set(
            docRef,
            {
              ...payload,
              assignPersonId: null,
              assignPersonName: null,
              status: 'pending',
              createdAt: serverTimestamp(),
            },
            { merge: true },
          );
        } else {
          const shouldUpdate = (existing.subscriptionRequestId ?? null) !== payload.subscriptionRequestId
            || existing.customerId !== payload.customerId
            || existing.customerName !== payload.customerName
            || (existing.customerShortId ?? null) !== (payload.customerShortId ?? null)
            || existing.packageName !== payload.packageName
            || (existing.packageId ?? null) !== (payload.packageId ?? null)
            || (existing.mealType ?? null) !== (payload.mealType ?? null)
            || existing.mobileNumber !== payload.mobileNumber
            || existing.address !== payload.address
            || (existing.deliveryLocationName ?? null) !== (payload.deliveryLocationName ?? null)
            || (existing.deliveryLocationId ?? null) !== (payload.deliveryLocationId ?? null)
            || (existing.latitude ?? null) !== (payload.latitude ?? null)
            || (existing.longitude ?? null) !== (payload.longitude ?? null)
            || existing.distanceKm !== payload.distanceKm
            || (existing.groupId ?? null) !== (payload.groupId ?? null)
            || (existing.groupName ?? null) !== (payload.groupName ?? null)
            || existing.groupNumber !== payload.groupNumber
            || existing.tripNumber !== payload.tripNumber;

          if (shouldUpdate) {
            hasChanges = true;
            batch.set(
              docRef,
              payload,
              { merge: true },
            );
          }
        }
      }

      // Clean up old standalone Lunch assignments (since Lunch is now combined with Breakfast)
      const oldLunchAssignmentId = createAssignmentDocId(subscriptionId, 'Lunch');
      if (existingById.has(oldLunchAssignmentId)) {
        hasChanges = true;
        const oldLunchRef = doc(db, this.collectionName, oldLunchAssignmentId);
        batch.delete(oldLunchRef);
      }
    }

    if (hasChanges) {
      await batch.commit();
    }
  }

  // Server-side paginated search
  static async searchPaginated(
    pagination: PaginationParams,
    search: SearchParams | null = null
  ): Promise<{ data: DeliveryAssignmentSchema[]; total: number }> {
    const rawData = await executeSearchQuery<Record<string, unknown>>(
      COLLECTION_NAME,
      search,
      pagination
    );
    const data = rawData.map((doc) => mapFromData(doc.id as string, doc));
    const total = await executeSearchQueryCount(
      COLLECTION_NAME,
      search
    );
    return { data, total };
  }
}
