import { type } from "arktype";

export interface RoleSchema {
  id?: string;
  name: string;  // e.g., 'Admin', 'User'
  permissions: string[];  // e.g., ['user-dashboard:view', 'user-profile:manage', '*']
  createdAt?: Date;
  updatedAt?: Date;
}

// Create validator: require name and permissions
export const RoleCreate = type({
  name: "string",
  permissions: type.string.array()
});

// Update validator: all fields optional for partial updates
export const RoleUpdate = type({
  "name?": "string",
  "permissions?": type.string.array()
});
