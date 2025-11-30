// Central permissions configuration for RBAC
// Define all possible permissions as constants for consistency and validation
// Format: 'resource:action' (e.g., 'dashboard:view', 'roles:manage')

export const PERMISSIONS = {
  // Authenticated user self-service
  USER_DASHBOARD_VIEW: 'user-dashboard:view' as const,
  USER_PROFILE_VIEW: 'user-profile:view' as const,
  USER_PROFILE_MANAGE: 'user-profile:manage' as const,
  USER_DELIVERY_STATUS_VIEW: 'user-delivery-status:view' as const,
  USER_WALLET_VIEW: 'user-wallet:view' as const,
  USER_WALLET_MANAGE: 'user-wallet:manage' as const,
  USER_SUBSCRIPTIONS_VIEW: 'user-subscriptions:view' as const,
  USER_SUBSCRIPTIONS_MANAGE: 'user-subscriptions:manage' as const,
  USER_ADDONS_VIEW: 'user-addons:view' as const,
  USER_ADDONS_MANAGE: 'user-addons:manage' as const,
  USER_REFERRAL_VIEW: 'user-referral:view' as const,
  USER_SUBSCRIPTION_CHECKOUT: 'user-subscription-checkout:manage' as const,

  // Admin dashboard & shared utilities
  ADMIN_DASHBOARD_VIEW: 'admin-dashboard:view' as const,
  ADMIN_DASHBOARD_MANAGE: 'admin-dashboard:manage' as const,
  ADMIN_SECTIONS_VIEW: 'admin-sections:view' as const,

  // User & role management
  ADMIN_USERS_VIEW: 'admin-users:view' as const,
  ADMIN_USERS_MANAGE: 'admin-users:manage' as const,
  ADMIN_ROLES_VIEW: 'admin-roles:view' as const,
  ADMIN_ROLES_MANAGE: 'admin-roles:manage' as const,
  ADMIN_CUSTOMERS_VIEW: 'admin-customers:view' as const,
  ADMIN_CUSTOMERS_MANAGE: 'admin-customers:manage' as const,
  ADMIN_TEAM_VIEW: 'admin-team:view' as const,
  ADMIN_TEAM_MANAGE: 'admin-team:manage' as const,
  ADMIN_CUSTOMER_INQUIRIES_VIEW: 'admin-customer-inquiries:view' as const,
  ADMIN_CUSTOMER_INQUIRIES_MANAGE: 'admin-customer-inquiries:manage' as const,

  // Delivery operations
  ADMIN_DELIVERY_ASSIGN_VIEW: 'admin-delivery-assign:view' as const,
  ADMIN_DELIVERY_ASSIGN_MANAGE: 'admin-delivery-assign:manage' as const,
  ADMIN_DELIVERY_STATUS_VIEW: 'admin-delivery-status:view' as const,
  ADMIN_DELIVERY_DETAILS_VIEW: 'admin-delivery-details:view' as const,
  ADMIN_DELIVERY_DETAILS_MANAGE: 'admin-delivery-details:manage' as const,
  ADMIN_DELIVERY_GROUPS_VIEW: 'admin-delivery-groups:view' as const,
  ADMIN_DELIVERY_GROUPS_MANAGE: 'admin-delivery-groups:manage' as const,

  // Site operations & marketing
  ADMIN_SITE_SETTINGS_VIEW: 'admin-site-settings:view' as const,
  ADMIN_SITE_SETTINGS_MANAGE: 'admin-site-settings:manage' as const,
  ADMIN_BANNERS_VIEW: 'admin-banners:view' as const,
  ADMIN_BANNERS_MANAGE: 'admin-banners:manage' as const,
  ADMIN_WALLET_VIEW: 'admin-wallet:view' as const,
  ADMIN_WALLET_MANAGE: 'admin-wallet:manage' as const,
  ADMIN_COIN_REQUESTS_VIEW: 'admin-coin-requests:view' as const,
  ADMIN_COIN_REQUESTS_MANAGE: 'admin-coin-requests:manage' as const,
  ADMIN_REFERRALS_VIEW: 'admin-referrals:view' as const,
  ADMIN_REFERRALS_MANAGE: 'admin-referrals:manage' as const,
  ADMIN_REFUND_POLICIES_VIEW: 'admin-refund-policies:view' as const,
  ADMIN_REFUND_POLICIES_MANAGE: 'admin-refund-policies:manage' as const,
  ADMIN_PUBLIC_RATINGS_VIEW: 'admin-public-ratings:view' as const,
  ADMIN_PUBLIC_RATINGS_MANAGE: 'admin-public-ratings:manage' as const,

  // Commerce & catalog management
  ADMIN_PRODUCTS_VIEW: 'admin-products:view' as const,
  ADMIN_PRODUCTS_MANAGE: 'admin-products:manage' as const,
  ADMIN_CATEGORIES_VIEW: 'admin-categories:view' as const,
  ADMIN_CATEGORIES_MANAGE: 'admin-categories:manage' as const,
  ADMIN_PACKAGES_VIEW: 'admin-packages:view' as const,
  ADMIN_PACKAGES_MANAGE: 'admin-packages:manage' as const,
  ADMIN_FOOD_ITEMS_VIEW: 'admin-food-items:view' as const,
  ADMIN_FOOD_ITEMS_MANAGE: 'admin-food-items:manage' as const,
  ADMIN_ADDON_CATEGORIES_VIEW: 'admin-addon-categories:view' as const,
  ADMIN_ADDON_CATEGORIES_MANAGE: 'admin-addon-categories:manage' as const,
  ADMIN_ADDON_REQUESTS_VIEW: 'admin-addon-requests:view' as const,
  ADMIN_ADDON_REQUESTS_MANAGE: 'admin-addon-requests:manage' as const,
  ADMIN_APPROVED_ADDONS_VIEW: 'admin-approved-addons:view' as const,
  ADMIN_APPROVED_ADDONS_MANAGE: 'admin-approved-addons:manage' as const,

  // Subscription ecosystem
  ADMIN_SUBSCRIBERS_VIEW: 'admin-subscribers:view' as const,
  ADMIN_SUBSCRIBERS_MANAGE: 'admin-subscribers:manage' as const,
  ADMIN_SUBSCRIPTION_REQUESTS_VIEW: 'admin-subscription-requests:view' as const,
  ADMIN_SUBSCRIPTION_REQUESTS_MANAGE: 'admin-subscription-requests:manage' as const,
  ADMIN_PAUSED_MEALS_VIEW: 'admin-paused-meals:view' as const,
  ADMIN_PAUSED_MEALS_MANAGE: 'admin-paused-meals:manage' as const,
  ADMIN_CANCELLED_MEALS_VIEW: 'admin-cancelled-meals:view' as const,
  ADMIN_CANCELLED_MEALS_MANAGE: 'admin-cancelled-meals:manage' as const,

  // Verification & compliance
  ADMIN_STUDENT_VERIFICATIONS_VIEW: 'admin-student-verifications:view' as const,
  ADMIN_STUDENT_VERIFICATIONS_MANAGE: 'admin-student-verifications:manage' as const,
  ADMIN_VERIFICATION_LOCATIONS_VIEW: 'admin-verification-locations:view' as const,
  ADMIN_VERIFICATION_LOCATIONS_MANAGE: 'admin-verification-locations:manage' as const,

  // Finance & inventory
  ADMIN_EXPENSES_VIEW: 'admin-expenses:view' as const,
  ADMIN_EXPENSES_MANAGE: 'admin-expenses:manage' as const,
  ADMIN_GRN_VIEW: 'admin-grn:view' as const,
  ADMIN_GRN_MANAGE: 'admin-grn:manage' as const,
  ADMIN_DAYS_DISCOUNTS_VIEW: 'admin-days-discounts:view' as const,
  ADMIN_DAYS_DISCOUNTS_MANAGE: 'admin-days-discounts:manage' as const,
  ADMIN_COUPONS_VIEW: 'admin-coupons:view' as const,
  ADMIN_COUPONS_MANAGE: 'admin-coupons:manage' as const,
  ADMIN_COUPON_REPORTS_VIEW: 'admin-coupon-reports:view' as const,
  ADMIN_COUPON_REPORTS_MANAGE: 'admin-coupon-reports:manage' as const,

  // Operational insights
  ADMIN_KITCHEN_DASHBOARD_VIEW: 'admin-kitchen-dashboard:view' as const,
  ADMIN_KITCHEN_DASHBOARD_MANAGE: 'admin-kitchen-dashboard:manage' as const,
  ADMIN_ORDER_DASHBOARD_VIEW: 'admin-order-dashboard:view' as const,
  ADMIN_ORDER_DASHBOARD_MANAGE: 'admin-order-dashboard:manage' as const,

  // Wildcard for full access
  ALL: '*' as const,
} as const;

// Type for permissions (helps with autocomplete and type safety)
export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Array of all permissions for validation (e.g., in RoleModel create)
export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);
