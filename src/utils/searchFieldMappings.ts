/**
 * Search Field Mappings for All Schemas
 * Maps each schema to all its searchable fields with their types
 * This ensures consistency across all DataTable pages
 */

import type { SearchField } from './firestoreSearch';

export const SEARCH_FIELD_MAPPINGS: Record<string, SearchField[]> = {
  // User fields - all fields are searchable
  users: [
    { name: 'id', label: 'ID', type: 'text' },
    { name: 'customerId', label: 'Customer ID', type: 'text' },
    { name: 'fullName', label: 'Full Name', type: 'text' },
    { name: 'firstName', label: 'First Name', type: 'text' },
    { name: 'lastName', label: 'Last Name', type: 'text' },
    { name: 'email', label: 'Email', type: 'text' },
    { name: 'phone', label: 'Phone', type: 'text' },
    { name: 'contactNumber', label: 'Contact Number', type: 'text' },
    { name: 'userType', label: 'User Type', type: 'enum' },
    { name: 'roleType', label: 'Role Type', type: 'enum', options: ['Delivery', 'Chef', 'Admin'] },
    { name: 'prefix', label: 'Prefix', type: 'enum', options: ['Mr', 'Mrs', 'Ms'] },
    { name: 'vehicleNumber', label: 'Vehicle Number', type: 'text' },
    { name: 'vehicleModel', label: 'Vehicle Model', type: 'text' },
    { name: 'specialization', label: 'Specialization', type: 'text' },
    { name: 'experience', label: 'Experience', type: 'text' },
    { name: 'referralCode', label: 'Referral Code', type: 'text' },
    { name: 'groupId', label: 'Group ID', type: 'text' },
    { name: 'isActive', label: 'Active', type: 'enum', options: ['true', 'false'] },
    { name: 'createdAt', label: 'Created Date', type: 'date' },
    { name: 'updatedAt', label: 'Updated Date', type: 'date' },
  ],

  // Category fields
  categories: [
    { name: 'id', label: 'ID', type: 'text' },
    { name: 'name', label: 'Name', type: 'text' },
    { name: 'description', label: 'Description', type: 'text' },
    { name: 'price', label: 'Price', type: 'number' },
    { name: 'status', label: 'Status', type: 'enum', options: ['Available', 'Unavailable'] },
    { name: 'accentFrom', label: 'Accent From', type: 'text' },
    { name: 'accentTo', label: 'Accent To', type: 'text' },
    { name: 'createdAt', label: 'Created Date', type: 'date' },
    { name: 'updatedAt', label: 'Updated Date', type: 'date' },
  ],

  // Product fields
  products: [
    { name: 'id', label: 'ID', type: 'text' },
    { name: 'name', label: 'Name', type: 'text' },
    { name: 'currentStock', label: 'Current Stock', type: 'number' },
    { name: 'unit', label: 'Unit', type: 'enum', options: ['kg', 'grams', 'pcs', 'liters', 'ml'] },
    { name: 'createdAt', label: 'Created Date', type: 'date' },
    { name: 'updatedAt', label: 'Updated Date', type: 'date' },
  ],

  // Package fields
  packages: [
    { name: 'id', label: 'ID', type: 'text' },
    { name: 'name', label: 'Name', type: 'text' },
    { name: 'categoryId', label: 'Category ID', type: 'text' },
    { name: 'mealType', label: 'Meal Type', type: 'enum', options: ['Breakfast', 'Lunch', 'Dinner'] },
    { name: 'price', label: 'Price', type: 'number' },
    { name: 'status', label: 'Status', type: 'enum', options: ['Available', 'Unavailable'] },
    { name: 'menuDescription', label: 'Menu Description', type: 'text' },
    { name: 'createdAt', label: 'Created Date', type: 'date' },
    { name: 'updatedAt', label: 'Updated Date', type: 'date' },
  ],

  // AddonRequest fields
  addonRequests: [
    { name: 'id', label: 'ID', type: 'text' },
    { name: 'userId', label: 'User ID', type: 'text' },
    { name: 'userName', label: 'User Name', type: 'text' },
    { name: 'userEmail', label: 'User Email', type: 'text' },
    { name: 'userPhone', label: 'User Phone', type: 'text' },
    { name: 'deliveryDateKey', label: 'Delivery Date Key', type: 'text' },
    { name: 'deliveryDate', label: 'Delivery Date', type: 'date' },
    { name: 'status', label: 'Status', type: 'enum', options: ['pending', 'confirmed', 'cancelled'] },
    { name: 'statusNote', label: 'Status Note', type: 'text' },
    { name: 'reviewedBy', label: 'Reviewed By', type: 'text' },
    { name: 'reviewedByName', label: 'Reviewed By Name', type: 'text' },
    { name: 'reviewedAt', label: 'Reviewed Date', type: 'date' },
    { name: 'walletDebitedCoins', label: 'Wallet Debited Coins', type: 'number' },
    { name: 'walletDebitedAt', label: 'Wallet Debited Date', type: 'date' },
    { name: 'walletRefundedCoins', label: 'Wallet Refunded Coins', type: 'number' },
    { name: 'walletRefundedAt', label: 'Wallet Refunded Date', type: 'date' },
    { name: 'createdAt', label: 'Created Date', type: 'date' },
    { name: 'updatedAt', label: 'Updated Date', type: 'date' },
  ],

  // AddonCategory fields
  addonCategories: [
    { name: 'id', label: 'ID', type: 'text' },
    { name: 'name', label: 'Name', type: 'text' },
    { name: 'createdAt', label: 'Created Date', type: 'date' },
    { name: 'updatedAt', label: 'Updated Date', type: 'date' },
  ],

  // FoodItem fields
  foodItems: [
    { name: 'id', label: 'ID', type: 'text' },
    { name: 'name', label: 'Name', type: 'text' },
    { name: 'category', label: 'Category', type: 'enum', options: ['Veg', 'Non-Veg'] },
    { name: 'mealType', label: 'Meal Type', type: 'enum', options: ['Breakfast', 'Lunch', 'Dinner'] },
    { name: 'coins', label: 'Coins', type: 'number' },
    { name: 'discountCoins', label: 'Discount Coins', type: 'number' },
    { name: 'isAddon', label: 'Is Addon', type: 'enum', options: ['true', 'false'] },
    { name: 'addonDescription', label: 'Addon Description', type: 'text' },
    { name: 'addonAccentFrom', label: 'Addon Accent From', type: 'text' },
    { name: 'addonAccentTo', label: 'Addon Accent To', type: 'text' },
    { name: 'createdAt', label: 'Created Date', type: 'date' },
    { name: 'updatedAt', label: 'Updated Date', type: 'date' },
  ],

  // Role fields
  roles: [
    { name: 'id', label: 'ID', type: 'text' },
    { name: 'name', label: 'Name', type: 'text' },
    { name: 'description', label: 'Description', type: 'text' },
    { name: 'createdAt', label: 'Created Date', type: 'date' },
    { name: 'updatedAt', label: 'Updated Date', type: 'date' },
  ],

  // Coupon fields
  coupons: [
    { name: 'id', label: 'ID', type: 'text' },
    { name: 'code', label: 'Code', type: 'text' },
    { name: 'discountPercentage', label: 'Discount %', type: 'number' },
    { name: 'maxUses', label: 'Max Uses', type: 'number' },
    { name: 'currentUses', label: 'Current Uses', type: 'number' },
    { name: 'status', label: 'Status', type: 'enum', options: ['active', 'inactive'] },
    { name: 'createdAt', label: 'Created Date', type: 'date' },
    { name: 'updatedAt', label: 'Updated Date', type: 'date' },
  ],

  // DayDiscount fields
  dayDiscounts: [
    { name: 'id', label: 'ID', type: 'text' },
    { name: 'label', label: 'Label', type: 'text' },
    { name: 'dayCount', label: 'Day Count', type: 'number' },
    { name: 'discountType', label: 'Discount Type', type: 'enum', options: ['percentage', 'amount'] },
    { name: 'discountValue', label: 'Discount Value', type: 'number' },
    { name: 'scope', label: 'Scope', type: 'enum', options: ['all', 'categories', 'packages'] },
    { name: 'createdAt', label: 'Created Date', type: 'date' },
    { name: 'updatedAt', label: 'Updated Date', type: 'date' },
  ],

  // Expense fields
  expenses: [
    { name: 'id', label: 'ID', type: 'text' },
    { name: 'name', label: 'Name', type: 'text' },
    { name: 'description', label: 'Description', type: 'text' },
    { name: 'amount', label: 'Amount', type: 'number' },
    { name: 'expenseDate', label: 'Expense Date', type: 'date' },
    { name: 'createdAt', label: 'Created Date', type: 'date' },
    { name: 'updatedAt', label: 'Updated Date', type: 'date' },
  ],

  // GRN fields
  grns: [
    { name: 'id', label: 'ID', type: 'text' },
    { name: 'grnNumber', label: 'GRN Number', type: 'text' },
    { name: 'supplierName', label: 'Supplier Name', type: 'text' },
    { name: 'grnDate', label: 'GRN Date', type: 'date' },
    { name: 'createdAt', label: 'Created Date', type: 'date' },
    { name: 'updatedAt', label: 'Updated Date', type: 'date' },
  ],

  // SubscriptionRequest fields
  subscriptionRequests: [
    { name: 'id', label: 'ID', type: 'text' },
    { name: 'userId', label: 'User ID', type: 'text' },
    { name: 'userName', label: 'User Name', type: 'text' },
    { name: 'userEmail', label: 'User Email', type: 'text' },
    { name: 'packageId', label: 'Package ID', type: 'text' },
    { name: 'status', label: 'Status', type: 'enum' },
    { name: 'createdAt', label: 'Created Date', type: 'date' },
    { name: 'updatedAt', label: 'Updated Date', type: 'date' },
  ],

  // CoinRequest fields
  coinRequests: [
    { name: 'id', label: 'ID', type: 'text' },
    { name: 'userId', label: 'User ID', type: 'text' },
    { name: 'userName', label: 'User Name', type: 'text' },
    { name: 'userEmail', label: 'User Email', type: 'text' },
    { name: 'coins', label: 'Coins', type: 'number' },
    { name: 'status', label: 'Status', type: 'enum' },
    { name: 'createdAt', label: 'Created Date', type: 'date' },
    { name: 'updatedAt', label: 'Updated Date', type: 'date' },
  ],

  // CustomerInquiry fields
  customerInquiries: [
    { name: 'id', label: 'ID', type: 'text' },
    { name: 'userId', label: 'User ID', type: 'text' },
    { name: 'userName', label: 'User Name', type: 'text' },
    { name: 'userEmail', label: 'User Email', type: 'text' },
    { name: 'subject', label: 'Subject', type: 'text' },
    { name: 'message', label: 'Message', type: 'text' },
    { name: 'status', label: 'Status', type: 'enum' },
    { name: 'createdAt', label: 'Created Date', type: 'date' },
    { name: 'updatedAt', label: 'Updated Date', type: 'date' },
  ],

  // StudentVerification fields
  studentVerifications: [
    { name: 'id', label: 'ID', type: 'text' },
    { name: 'userId', label: 'User ID', type: 'text' },
    { name: 'userName', label: 'User Name', type: 'text' },
    { name: 'userEmail', label: 'User Email', type: 'text' },
    { name: 'status', label: 'Status', type: 'enum' },
    { name: 'createdAt', label: 'Created Date', type: 'date' },
    { name: 'updatedAt', label: 'Updated Date', type: 'date' },
  ],

  // VerificationLocation fields
  verificationLocations: [
    { name: 'id', label: 'ID', type: 'text' },
    { name: 'name', label: 'Name', type: 'text' },
    { name: 'address', label: 'Address', type: 'text' },
    { name: 'city', label: 'City', type: 'text' },
    { name: 'createdAt', label: 'Created Date', type: 'date' },
    { name: 'updatedAt', label: 'Updated Date', type: 'date' },
  ],

  // Banner fields
  banners: [
    { name: 'id', label: 'ID', type: 'text' },
    { name: 'placement', label: 'Placement', type: 'enum' },
    { name: 'title', label: 'Title', type: 'text' },
    { name: 'createdAt', label: 'Created Date', type: 'date' },
    { name: 'updatedAt', label: 'Updated Date', type: 'date' },
  ],

  // RefundPolicy fields
  refundPolicies: [
    { name: 'id', label: 'ID', type: 'text' },
    { name: 'title', label: 'Title', type: 'text' },
    { name: 'description', label: 'Description', type: 'text' },
    { name: 'createdAt', label: 'Created Date', type: 'date' },
    { name: 'updatedAt', label: 'Updated Date', type: 'date' },
  ],

  // Referral fields
  referrals: [
    { name: 'id', label: 'ID', type: 'text' },
    { name: 'referrerId', label: 'Referrer ID', type: 'text' },
    { name: 'referrerName', label: 'Referrer Name', type: 'text' },
    { name: 'referrerEmail', label: 'Referrer Email', type: 'text' },
    { name: 'referredUserId', label: 'Referred User ID', type: 'text' },
    { name: 'referredUserName', label: 'Referred User Name', type: 'text' },
    { name: 'referredUserEmail', label: 'Referred User Email', type: 'text' },
    { name: 'status', label: 'Status', type: 'enum' },
    { name: 'createdAt', label: 'Created Date', type: 'date' },
    { name: 'updatedAt', label: 'Updated Date', type: 'date' },
  ],

  // CancelledMeal fields
  cancelledMeals: [
    { name: 'id', label: 'ID', type: 'text' },
    { name: 'userId', label: 'User ID', type: 'text' },
    { name: 'userName', label: 'User Name', type: 'text' },
    { name: 'userEmail', label: 'User Email', type: 'text' },
    { name: 'mealDate', label: 'Meal Date', type: 'date' },
    { name: 'reason', label: 'Reason', type: 'text' },
    { name: 'createdAt', label: 'Created Date', type: 'date' },
    { name: 'updatedAt', label: 'Updated Date', type: 'date' },
  ],

  // PausedMeal fields
  pausedMeals: [
    { name: 'id', label: 'ID', type: 'text' },
    { name: 'userId', label: 'User ID', type: 'text' },
    { name: 'userName', label: 'User Name', type: 'text' },
    { name: 'userEmail', label: 'User Email', type: 'text' },
    { name: 'startDate', label: 'Start Date', type: 'date' },
    { name: 'endDate', label: 'End Date', type: 'date' },
    { name: 'reason', label: 'Reason', type: 'text' },
    { name: 'createdAt', label: 'Created Date', type: 'date' },
    { name: 'updatedAt', label: 'Updated Date', type: 'date' },
  ],

  // DeliveryAssignment fields
  deliveryAssignments: [
    { name: 'id', label: 'ID', type: 'text' },
    { name: 'customerId', label: 'Customer ID', type: 'text' },
    { name: 'customerName', label: 'Customer Name', type: 'text' },
    { name: 'packageName', label: 'Package Name', type: 'text' },
    { name: 'packageId', label: 'Package ID', type: 'text' },
    { name: 'mealType', label: 'Meal Type', type: 'enum', options: ['Breakfast', 'Lunch', 'Dinner'] },
    { name: 'mobileNumber', label: 'Mobile Number', type: 'text' },
    { name: 'address', label: 'Address', type: 'text' },
    { name: 'deliveryLocationName', label: 'Delivery Location', type: 'text' },
    { name: 'distanceKm', label: 'Distance (km)', type: 'number' },
    { name: 'groupNumber', label: 'Group Number', type: 'text' },
    { name: 'groupId', label: 'Group ID', type: 'text' },
    { name: 'groupName', label: 'Group Name', type: 'text' },
    { name: 'tripNumber', label: 'Trip Number', type: 'text' },
    { name: 'assignPersonId', label: 'Assigned Person ID', type: 'text' },
    { name: 'assignPersonName', label: 'Assigned Person Name', type: 'text' },
    { name: 'status', label: 'Status', type: 'enum', options: ['pending', 'assigned', 'picked-up', 'en-route', 'delivered', 'cancelled'] },
    { name: 'notes', label: 'Notes', type: 'text' },
    { name: 'createdAt', label: 'Created Date', type: 'date' },
    { name: 'updatedAt', label: 'Updated Date', type: 'date' },
  ],

  // Wallet fields
  wallets: [
    { name: 'id', label: 'ID', type: 'text' },
    { name: 'customerId', label: 'Customer ID', type: 'text' },
    { name: 'customerName', label: 'Customer Name', type: 'text' },
    { name: 'customerEmail', label: 'Customer Email', type: 'text' },
    { name: 'coins', label: 'Coins', type: 'number' },
    { name: 'createdAt', label: 'Created Date', type: 'date' },
    { name: 'updatedAt', label: 'Updated Date', type: 'date' },
  ],
};

/**
 * Get search fields for a collection
 */
export function getSearchFieldsForCollection(collectionName: string): SearchField[] {
  return SEARCH_FIELD_MAPPINGS[collectionName] || [];
}
