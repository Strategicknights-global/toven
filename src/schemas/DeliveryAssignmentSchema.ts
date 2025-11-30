export type DeliveryAssignmentStatus =
  | 'pending'
  | 'assigned'
  | 'picked-up'
  | 'en-route'
  | 'delivered'
  | 'cancelled';

export const DELIVERY_ASSIGNMENT_STATUSES: readonly DeliveryAssignmentStatus[] = [
  'pending',
  'assigned',
  'picked-up',
  'en-route',
  'delivered',
  'cancelled',
] as const;

import type { MealType } from './FoodItemSchema';

export interface DeliveryAssignmentSchema {
  id: string;
  customerId: string;
  customerName: string;
  customerShortId?: string | null;
  packageName: string;
  packageId?: string | null;
  mealType?: MealType | null;
  mobileNumber: string;
  address: string;
  deliveryLocationName?: string | null;
  deliveryLocationId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm: number;
  groupNumber: string;
  groupId?: string | null;
  groupName?: string | null;
  tripNumber: string;
  subscriptionRequestId?: string | null;
  assignPersonId?: string | null;
  assignPersonName?: string | null;
  status?: DeliveryAssignmentStatus | null;
  notes?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export type DeliveryPersonSummary = {
  id: string;
  name: string;
  contactNumber?: string;
  activeTrips?: number;
};
