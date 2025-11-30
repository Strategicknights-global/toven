export interface UserDeliveryLocationSchema {
  id?: string;
  userId: string;
  userName?: string | null;
  
  // Location details
  locationName: string; // e.g., "Home", "Office", "Mom's Place"
  address: string;
  coordinates: string; // MANDATORY: "lat,lng" format
  landmark?: string | null;
  
  // Contact info
  contactPhone?: string | null;
  contactName?: string | null;
  
  // Default flag
  isDefault: boolean;
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserDeliveryLocationCreateInput = {
  userId: string;
  userName?: string | null;
  locationName: string;
  address: string;
  coordinates: string; // MANDATORY
  landmark?: string | null;
  contactPhone?: string | null;
  contactName?: string | null;
  isDefault?: boolean;
};

export type UserDeliveryLocationUpdateInput = {
  locationName?: string;
  address?: string;
  coordinates?: string; // Can be updated
  landmark?: string | null;
  contactPhone?: string | null;
  contactName?: string | null;
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

export const normalizeUserDeliveryLocationInput = (
  input: UserDeliveryLocationCreateInput
): UserDeliveryLocationCreateInput => ({
  userId: toStringSafe(input.userId),
  userName: toStringOrNull(input.userName),
  locationName: toStringSafe(input.locationName),
  address: toStringSafe(input.address),
  coordinates: toStringSafe(input.coordinates), // Now mandatory
  landmark: toStringOrNull(input.landmark),
  contactPhone: toStringOrNull(input.contactPhone),
  contactName: toStringOrNull(input.contactName),
  isDefault: Boolean(input.isDefault),
});

export const normalizeUserDeliveryLocationUpdateInput = (
  input: UserDeliveryLocationUpdateInput
): UserDeliveryLocationUpdateInput => {
  const normalized: UserDeliveryLocationUpdateInput = {};
  
  if (input.locationName !== undefined) {
    normalized.locationName = toStringSafe(input.locationName);
  }
  if (input.address !== undefined) {
    normalized.address = toStringSafe(input.address);
  }
  if (input.coordinates !== undefined) {
    normalized.coordinates = toStringSafe(input.coordinates);
  }
  if (input.landmark !== undefined) {
    normalized.landmark = toStringOrNull(input.landmark);
  }
  if (input.contactPhone !== undefined) {
    normalized.contactPhone = toStringOrNull(input.contactPhone);
  }
  if (input.contactName !== undefined) {
    normalized.contactName = toStringOrNull(input.contactName);
  }
  
  return normalized;
};
