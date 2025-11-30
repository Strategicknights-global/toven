import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUserRoleStore } from '../stores/userRoleStore';
import { PERMISSIONS } from '../permissions';
import type { Permission } from '../permissions';
import {
  Home,
  User,
  Truck,
  Plus,
  Wallet,
  Coins,
  Users,
  ArrowLeftRight,
  ChevronDown,
  ClipboardList,
  Package,
  UtensilsCrossed,
  Boxes,
  Layers,
  Puzzle,
  MessageSquare,
  ChefHat,
  Receipt,
  PhoneCall,
  BadgePercent,
  Image,
  Calendar,
  MapPin,
  GraduationCap,
  Settings,
  Star,
  Sparkles,
} from 'lucide-react';
import { ROUTES } from '../AppRoutes';
import type { LucideIcon } from 'lucide-react';

const Sidebar: React.FC<{
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}> = ({ sidebarOpen, setSidebarOpen }) => {
  const hasPermission = useUserRoleStore((state) => state.hasPermission);
  const roleLoading = useUserRoleStore((state) => state.loading);
  const location = useLocation();
  const navigate = useNavigate();

  const isAdminRoute = location.pathname.startsWith('/admin');

  type PermissionGuard = Permission | Permission[];
  type NormalMenuItem = {
    to: string;
    label: string;
    icon: LucideIcon;
    requiredPermission?: PermissionGuard;
  };

  const normalMenuItems = React.useMemo<NormalMenuItem[]>(
    () => [
      { to: ROUTES.DASHBOARD, label: 'Dashboard', icon: Home, requiredPermission: PERMISSIONS.USER_DASHBOARD_VIEW },
      { to: ROUTES.PROFILE, label: 'Profile Page', icon: User, requiredPermission: PERMISSIONS.USER_PROFILE_VIEW },
      { to: ROUTES.MY_SUBSCRIPTIONS, label: 'My Subscriptions', icon: Package, requiredPermission: PERMISSIONS.USER_SUBSCRIPTIONS_VIEW },
      { to: ROUTES.DELIVERY_STATUS, label: 'Delivery Status', icon: Truck, requiredPermission: PERMISSIONS.USER_DELIVERY_STATUS_VIEW },
      { to: ROUTES.MY_ADDONS, label: 'My Add-ons', icon: Plus, requiredPermission: PERMISSIONS.USER_ADDONS_VIEW },
      { to: ROUTES.WALLET, label: 'Wallet', icon: Wallet, requiredPermission: PERMISSIONS.USER_WALLET_VIEW },
      { to: ROUTES.REFERRAL, label: 'Referral', icon: Users, requiredPermission: PERMISSIONS.USER_REFERRAL_VIEW },
    ],
    []
  );

  type AdminMenuChild = {
    key: string;
    label: string;
    to?: string;
    badge?: string;
    requiredPermission?: PermissionGuard;
  };

  type AdminMenuEntry =
    | {
        type: 'group';
        key: string;
        label: string;
        icon: LucideIcon;
        requiredPermission?: PermissionGuard;
        children: AdminMenuChild[];
      }
    | ({ type: 'link'; icon: LucideIcon } & AdminMenuChild & { to: string });

  const adminMenuItems = React.useMemo<AdminMenuEntry[]>(
    () => [
      {
        type: 'link',
        key: 'dashboard',
        label: 'Dashboard',
        icon: Home,
        to: ROUTES.ADMIN_DASHBOARD,
        requiredPermission: PERMISSIONS.ADMIN_DASHBOARD_VIEW,
      },
      {
        type: 'group',
        key: 'user-management',
        label: 'User Management',
        icon: Users,
        children: [
          { key: 'users', label: 'Users', to: ROUTES.ADMIN_USERS, requiredPermission: PERMISSIONS.ADMIN_USERS_MANAGE },
          { key: 'roles', label: 'Roles', to: ROUTES.ADMIN_ROLES, requiredPermission: PERMISSIONS.ADMIN_ROLES_MANAGE },
        ],
      },
      {
        type: 'group',
        key: 'contacts',
        label: 'Contacts',
        icon: PhoneCall,
        children: [
          { key: 'customers', label: 'Customers', to: ROUTES.ADMIN_CUSTOMERS, requiredPermission: PERMISSIONS.ADMIN_CUSTOMERS_MANAGE },
          { key: 'team', label: 'Team', to: ROUTES.ADMIN_TEAM, requiredPermission: PERMISSIONS.ADMIN_TEAM_MANAGE },
        ],
      },
      {
        type: 'group',
        key: 'products',
        label: 'Products',
        icon: Package,
        children: [
          { key: 'products-list', label: 'List Products', to: ROUTES.ADMIN_PRODUCTS_LIST, requiredPermission: PERMISSIONS.ADMIN_PRODUCTS_MANAGE },
        ],
      },
      {
        type: 'group',
        key: 'food-packages',
        label: 'Food & Packages',
        icon: UtensilsCrossed,
        children: [
          { key: 'food-packages-categories', label: 'Categories', to: ROUTES.ADMIN_CATEGORIES, requiredPermission: PERMISSIONS.ADMIN_CATEGORIES_MANAGE },
          { key: 'food-packages-food-items', label: 'List Food Items', to: ROUTES.ADMIN_FOOD_ITEMS, requiredPermission: PERMISSIONS.ADMIN_FOOD_ITEMS_MANAGE },
          { key: 'food-packages-list', label: 'List Packages', to: ROUTES.ADMIN_PACKAGES, requiredPermission: PERMISSIONS.ADMIN_PACKAGES_MANAGE },
        ],
      },
      {
        type: 'group',
        key: 'inventory',
        label: 'Inventory',
        icon: Boxes,
        children: [
          { key: 'inventory-grn', label: 'GRN', to: ROUTES.ADMIN_GRN, requiredPermission: PERMISSIONS.ADMIN_GRN_MANAGE },
        ],
      },
      {
        type: 'group',
        key: 'subscriptions',
        label: 'Subscriptions',
        icon: Layers,
        children: [
          { key: 'subscriptions-subscribers', label: 'Subscribers', to: ROUTES.ADMIN_SUBSCRIPTION_SUBSCRIBERS, requiredPermission: PERMISSIONS.ADMIN_SUBSCRIBERS_MANAGE },
          { key: 'subscriptions-requests', label: 'Subscription Requests', to: ROUTES.ADMIN_SUBSCRIPTION_REQUESTS, requiredPermission: PERMISSIONS.ADMIN_SUBSCRIPTION_REQUESTS_MANAGE },
          { key: 'subscriptions-paused-meals', label: 'Paused Meals', to: ROUTES.ADMIN_PAUSED_MEALS, requiredPermission: PERMISSIONS.ADMIN_PAUSED_MEALS_VIEW },
          { key: 'subscriptions-cancelled-meals', label: 'Cancelled Subscriptions', to: ROUTES.ADMIN_CANCELLED_MEALS, requiredPermission: PERMISSIONS.ADMIN_CANCELLED_MEALS_VIEW },
          { key: 'subscriptions-refund-policies', label: 'Refund Policies', to: ROUTES.ADMIN_REFUND_POLICIES, requiredPermission: PERMISSIONS.ADMIN_REFUND_POLICIES_MANAGE },
        ],
      },
      {
        type: 'group',
        key: 'addons',
        label: 'Addons',
        icon: Puzzle,
        children: [
          { key: 'addons-categories', label: 'Addon Categories', to: ROUTES.ADMIN_ADDON_CATEGORIES, requiredPermission: PERMISSIONS.ADMIN_ADDON_CATEGORIES_MANAGE },
          { key: 'addons-approved', label: 'Approved Addons', to: ROUTES.ADMIN_ADDON_APPROVED, requiredPermission: PERMISSIONS.ADMIN_APPROVED_ADDONS_MANAGE },
          { key: 'addons-requests', label: 'Add-on Requests', to: ROUTES.ADMIN_ADDON_REQUESTS, requiredPermission: PERMISSIONS.ADMIN_ADDON_REQUESTS_MANAGE },
        ],
      },
      {
        type: 'link',
        key: 'customer-inquiries',
        label: 'Customer Inquiries',
        icon: MessageSquare,
        to: ROUTES.ADMIN_CUSTOMER_INQUIRIES,
        requiredPermission: PERMISSIONS.ADMIN_CUSTOMER_INQUIRIES_MANAGE,
      },
      {
        type: 'link',
        key: 'ratings',
        label: 'Ratings & Feedback',
        icon: Star,
        to: ROUTES.ADMIN_RATINGS,
        requiredPermission: PERMISSIONS.ADMIN_DASHBOARD_VIEW,
      },
      {
        type: 'link',
        key: 'public-display-ratings',
        label: 'Public Display Ratings',
        icon: Sparkles,
        to: ROUTES.ADMIN_PUBLIC_RATINGS,
        requiredPermission: PERMISSIONS.ADMIN_PUBLIC_RATINGS_MANAGE,
      },
      {
        type: 'group',
        key: 'delivery',
        label: 'Delivery',
        icon: Truck,
        children: [
          { key: 'delivery-assign', label: 'Assign Delivery', to: ROUTES.ADMIN_DELIVERY_ASSIGN, requiredPermission: PERMISSIONS.ADMIN_DELIVERY_ASSIGN_MANAGE },
          { key: 'delivery-status', label: 'Status Overview', to: ROUTES.ADMIN_DELIVERY_STATUS, requiredPermission: PERMISSIONS.ADMIN_DELIVERY_STATUS_VIEW },
          { key: 'delivery-team', label: 'Team Directory', to: ROUTES.ADMIN_TEAM, requiredPermission: PERMISSIONS.ADMIN_TEAM_MANAGE },
          { key: 'delivery-groups', label: 'Group Users', to: ROUTES.ADMIN_GROUP_USERS, requiredPermission: PERMISSIONS.ADMIN_DELIVERY_GROUPS_MANAGE },
        ],
      },
      {
        type: 'link',
        key: 'wallet',
        label: 'Wallet',
        icon: Wallet,
        to: ROUTES.ADMIN_WALLET,
        requiredPermission: PERMISSIONS.ADMIN_WALLET_MANAGE,
      },
      {
        type: 'link',
        key: 'coin-requests',
        label: 'Coin Requests',
        icon: Coins,
        to: ROUTES.ADMIN_COIN_REQUESTS,
        requiredPermission: PERMISSIONS.ADMIN_COIN_REQUESTS_MANAGE,
      },
      {
        type: 'link',
        key: 'referrals',
        label: 'Referrals',
        icon: ArrowLeftRight,
        to: ROUTES.ADMIN_REFERRALS,
        requiredPermission: PERMISSIONS.ADMIN_REFERRALS_MANAGE,
      },
      {
        type: 'group',
        key: 'kitchen',
        label: 'Kitchen',
        icon: ChefHat,
        children: [
          { key: 'kitchen-dashboard', label: 'Kitchen Dashboard', to: ROUTES.ADMIN_KITCHEN_DASHBOARD, requiredPermission: PERMISSIONS.ADMIN_KITCHEN_DASHBOARD_VIEW },
          { key: 'kitchen-cooking-request', label: 'Order Dashboard', to: ROUTES.ADMIN_ORDER_DASHBOARD, requiredPermission: PERMISSIONS.ADMIN_ORDER_DASHBOARD_VIEW },
        ],
      },
      {
        type: 'group',
        key: 'expenses',
        label: 'Expenses',
        icon: Receipt,
        children: [
          { key: 'expenses-list', label: 'List Expenses', to: ROUTES.ADMIN_EXPENSES, requiredPermission: PERMISSIONS.ADMIN_EXPENSES_MANAGE },
        ],
      },
      {
        type: 'group',
        key: 'coupons',
        label: 'Coupons',
        icon: BadgePercent,
        children: [
          { key: 'coupons-codes', label: 'Coupon Code', to: ROUTES.ADMIN_COUPONS, requiredPermission: PERMISSIONS.ADMIN_COUPONS_MANAGE },
          { key: 'coupons-usage', label: 'Usage Report', to: ROUTES.ADMIN_COUPONS_USAGE, requiredPermission: PERMISSIONS.ADMIN_COUPON_REPORTS_VIEW },
        ],
      },
      {
        type: 'link',
        key: 'site-settings',
        label: 'Site Settings',
        icon: Settings,
        to: ROUTES.ADMIN_SITE_SETTINGS,
        requiredPermission: PERMISSIONS.ADMIN_SITE_SETTINGS_MANAGE,
      },
      {
        type: 'link',
        key: 'banner',
        label: 'Banners',
        icon: Image,
        to: ROUTES.ADMIN_BANNERS,
        requiredPermission: PERMISSIONS.ADMIN_BANNERS_MANAGE,
      },
      {
        type: 'link',
        key: 'days-discounts',
        label: 'Days and Discounts',
        icon: Calendar,
        to: ROUTES.ADMIN_DAYS_DISCOUNTS,
        requiredPermission: PERMISSIONS.ADMIN_DAYS_DISCOUNTS_MANAGE,
      },
      {
        type: 'link',
        key: 'verification-locations',
        label: 'Verification Locations',
        icon: MapPin,
        to: ROUTES.ADMIN_VERIFICATION_LOCATIONS,
        requiredPermission: PERMISSIONS.ADMIN_VERIFICATION_LOCATIONS_MANAGE,
      },
      {
        type: 'link',
        key: 'student-verify',
        label: 'Student Verify',
        icon: GraduationCap,
        to: ROUTES.ADMIN_STUDENT_VERIFY,
        requiredPermission: PERMISSIONS.ADMIN_STUDENT_VERIFICATIONS_MANAGE,
      },
      {
        type: 'link',
        key: 'delivery-details',
        label: 'Delivery Details',
        icon: ClipboardList,
        to: ROUTES.ADMIN_DELIVERY_DETAILS,
        requiredPermission: PERMISSIONS.ADMIN_DELIVERY_DETAILS_VIEW,
      },
    ],
    []
  );

  const hasAccess = React.useCallback(
    (permission?: PermissionGuard) => {
      if (!permission) return true;
      if (Array.isArray(permission)) {
        return permission.some((perm) => hasPermission(perm));
      }
      return hasPermission(permission);
    },
    [hasPermission]
  );

  const filteredNormalMenuItems = React.useMemo(() => {
    if (roleLoading) {
      return [];
    }
    return normalMenuItems.filter((item) => hasAccess(item.requiredPermission));
  }, [normalMenuItems, hasAccess, roleLoading]);

  const filteredAdminMenuItems = React.useMemo<AdminMenuEntry[]>(() => {
    return adminMenuItems.reduce<AdminMenuEntry[]>((acc, item) => {
      if (!hasAccess(item.requiredPermission)) {
        return acc;
      }
      if (item.type === 'link') {
        acc.push(item);
        return acc;
      }
      const visibleChildren = item.children.filter((child) => hasAccess(child.requiredPermission) && child.to);
      if (visibleChildren.length > 0) {
        acc.push({ ...item, children: visibleChildren });
      }
      return acc;
    }, []);
  }, [adminMenuItems, hasAccess]);

  const filteredAdminGroups = React.useMemo(
    () => filteredAdminMenuItems.filter((item): item is Extract<AdminMenuEntry, { type: 'group' }> => item.type === 'group'),
    [filteredAdminMenuItems]
  );

  const firstAccessibleAdminPath = React.useMemo(() => {
    for (const item of filteredAdminMenuItems) {
      if (item.type === 'link') {
        return item.to;
      }
      const firstChild = item.children.find((child) => child.to);
      if (firstChild && firstChild.to) {
        return firstChild.to;
      }
    }
    return null;
  }, [filteredAdminMenuItems]);

  const firstAccessibleUserPath = React.useMemo(() => {
    return filteredNormalMenuItems.length > 0 ? filteredNormalMenuItems[0].to : null;
  }, [filteredNormalMenuItems]);

  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});

  const isPathActive = React.useCallback(
    (path?: string) => {
      if (!path) return false;
      return location.pathname === path || location.pathname.startsWith(`${path}/`);
    },
    [location.pathname]
  );

  React.useEffect(() => {
    setOpenGroups((prev) => {
      const next: Record<string, boolean> = {};
      filteredAdminGroups.forEach((group) => {
        const hasActiveChild = group.children.some((child) => child.to && isPathActive(child.to));
        next[group.key] = hasActiveChild || prev[group.key] || false;
      });
      return next;
    });
  }, [filteredAdminGroups, isPathActive]);

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const canAccessAdmin = filteredAdminMenuItems.length > 0;

  const renderAdminMenu = () => (
    <ul className="space-y-2">
      {filteredAdminMenuItems.map((item) => {
        if (item.type === 'link') {
          const active = isPathActive(item.to);
          return (
            <li key={item.key}>
              <Link
                to={item.to}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                  active ? 'bg-purple-100 text-purple-700 font-medium' : 'hover:bg-gray-200 text-gray-700'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="flex items-center space-x-3">
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </span>
                {item.badge ? (
                  <span
                    className={`ml-3 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      active ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        }

        const group = item;
        const groupActive = group.children.some((child) => isPathActive(child.to));

        return (
          <li key={group.key}>
            <button
              type="button"
              onClick={() => toggleGroup(group.key)}
              className={`flex w-full items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                groupActive ? 'bg-purple-100 text-purple-700 font-medium' : 'hover:bg-gray-200 text-gray-700'
              }`}
            >
              <span className="flex items-center space-x-3">
                <group.icon size={20} />
                <span>{group.label}</span>
              </span>
              <ChevronDown size={16} className={`transition-transform ${openGroups[group.key] ? 'rotate-180' : ''}`} />
            </button>
            {openGroups[group.key] && (
              <ul className="mt-1 space-y-1 pl-9">
                {group.children.length > 0 ? (
                  group.children.map((child) => (
                    <li key={child.key}>
                      {child.to ? (
                        <Link
                          to={child.to}
                          className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                            isPathActive(child.to)
                              ? 'bg-purple-50 text-purple-700 font-medium'
                              : 'hover:bg-gray-200 text-gray-600'
                          }`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <span>{child.label}</span>
                        </Link>
                      ) : (
                        <div className="px-3 py-1.5 text-xs italic text-gray-500">Coming soon</div>
                      )}
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-1.5 text-xs italic text-gray-500">Coming soon</li>
                )}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );

  const handleDashboardSwitch = () => {
    if (isAdminRoute) {
      navigate(firstAccessibleUserPath ?? ROUTES.DASHBOARD);
    } else {
      if (firstAccessibleAdminPath) {
        navigate(firstAccessibleAdminPath);
      } else {
        navigate(ROUTES.ADMIN_DASHBOARD);
      }
    }
  };

  return (
    <>
      {/* Sidebar */}
  <div className={`w-64 !bg-gray-100 text-gray-800 h-screen min-h-screen flex flex-col flex-none border-r border-gray-200 fixed inset-y-0 left-0 z-[60] transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} xl:static xl:translate-x-0 transition-transform duration-300 ease-in-out overflow-y-auto`}>
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <Link
            to={ROUTES.ROOT}
            className="flex items-center"
            onClick={() => setSidebarOpen(false)}
            aria-label="Toven home"
          >
            <img src="/toven.png" alt="Toven logo" className="h-10 w-auto object-contain" />
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 lg:hidden"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>
        {canAccessAdmin && (
          <div className="px-4 mb-4">
            <button
              onClick={handleDashboardSwitch}
              className="flex items-center space-x-2 text-sm px-3 py-2 rounded-md hover:bg-gray-200 transition-colors w-full"
            >
              <ArrowLeftRight size={20} />
              <span>{isAdminRoute ? 'Switch to User' : 'Switch to Admin'}</span>
            </button>
          </div>
        )}
        <nav className="flex-1 px-4">
          {isAdminRoute
            ? renderAdminMenu()
            : roleLoading ? (
                <div className="rounded-md bg-gray-50 px-3 py-4 text-sm text-gray-600">
                  Loading your access…
                </div>
              ) : filteredNormalMenuItems.length > 0 ? (
                <ul className="space-y-2">
                  {filteredNormalMenuItems.map((item) => (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                          location.pathname.startsWith(item.to)
                            ? 'bg-purple-100 text-purple-700 font-medium'
                            : 'hover:bg-gray-200 text-gray-700'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-md bg-gray-50 px-3 py-4 text-sm text-gray-600">
                  You don't have access to any user sections yet.
                </div>
              )}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;