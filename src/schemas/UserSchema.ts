import { type } from "arktype";

export interface UserSchema {
  id?: string;
  customerId?: string; // Short customer ID like C-1, C-2, etc.
  fullName: string;
  phone: string;
  email: string;
  userType: string; // e.g., 'Student', 'Individual', 'Corporate'
  roles: string[]; // Array of role IDs
  groupId?: string;
  referralCode?: string; // User's own referral code
  verificationLocationId?: string | null;
  verificationLocationName?: string | null;
  // New fields for management UI
  prefix?: 'Mr' | 'Mrs' | 'Ms';
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  contactNumber?: string;
  roleType?: 'Delivery' | 'Chef' | 'Admin';
  // Delivery specific
  vehicleNumber?: string;
  vehicleModel?: string;
  // Chef specific
  specialization?: string;
  experience?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Create validator: required fields + sensible defaults for optional ones
export const UserCreate = type({
  fullName: "string",
  phone: "string",
  email: "string.email",
  userType: "string",
  // default empty array
  roles: type.string.array().default(() => [] as string[]),
  // default empty strings for optional text fields
  "groupId?": "string",
  "referralCode?": "string",
  "verificationLocationId?": "string",
  "verificationLocationName?": "string",
  "prefix?": "string",
  "firstName?": "string",
  "lastName?": "string",
  isActive: type.boolean.default(true),
  "contactNumber?": "string",
  "roleType?": "string",
  "vehicleNumber?": "string",
  "vehicleModel?": "string",
  "specialization?": "string",
  "experience?": "string",
});

// Update validator: all fields optional for partial updates
export const UserUpdate = type({
  "customerId?": "string",
  "fullName?": "string",
  "phone?": "string",
  "email?": "string.email",
  "userType?": "string",
  "roles?": type.string.array(),
  "groupId?": "string",
  "referralCode?": "string",
  "verificationLocationId?": "string",
  "verificationLocationName?": "string",
  "prefix?": "string",
  "firstName?": "string",
  "lastName?": "string",
  "isActive?": "boolean",
  "contactNumber?": "string",
  "roleType?": "string",
  "vehicleNumber?": "string",
  "vehicleModel?": "string",
  "specialization?": "string",
  "experience?": "string"
});
