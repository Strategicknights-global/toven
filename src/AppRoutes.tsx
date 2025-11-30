import { Routes, Route, Link } from 'react-router-dom';
import LoginModal from './components/LoginModal';
import SignupModal, { type DeliveryLocationSignupPayload } from './components/SignupModal';
import Toast from './components/Toast';
import ScrollToTop from './components/ScrollToTop';
import RolesPage from './pages/RolesPage';
import UsersPage from './pages/UsersPage';
import AdminDashboard from './pages/AdminDashboard';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/ProfilePage';
import { useLoginModalStore } from './stores/loginModalStore';
import { useSignupModalStore } from './stores/signupModalStore';
import { useToastStore, OFFLINE_TOAST_ID } from './stores/toastStore';
import { useUserRoleStore } from './stores/userRoleStore';
import { useAddonCartStore } from './stores/addonCartStore';
import { UserModel, RoleModel, ConfigModel, WalletModel, ReferralModel, CustomerLoginModel, UserDeliveryLocationModel } from './firestore';
import { PERMISSIONS } from './permissions';
import { auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useEffect, useCallback } from 'react';
import { generateUniqueReferralCode, validateReferralCode } from './utils/referralUtils';
import { getFirebaseErrorMessage } from './utils/firebaseErrorHandler';
import LandingPage from './pages/LandingPage';
import DeliveryStatusPage from './pages/DeliveryStatusPage';
import AdminDeliveryStatusPage from './pages/AdminDeliveryStatusPage';
import AddonsPage from './pages/AddonsPage';
import AddonCartPage from './pages/AddonCartPage';
import WalletPage from './pages/WalletPage';
import AdminWalletPage from './pages/AdminWalletPage';
import ProtectedRoute from './components/ProtectedRoute';
import SidebarLayout from './layouts/SidebarLayout';
import AboutPage from './pages/AboutPage';
import PartyOrdersPage from './pages/PartyOrdersPage';
import ContactPage from './pages/ContactPage';
import TermsPage from './pages/TermsPage';
import SubscriptionPage from './pages/SubscriptionPage';
import { useNavigate } from 'react-router-dom';
import CustomersPage from './pages/CustomersPage';
import ProductsListPage from './pages/ProductsListPage';
import FoodItemsListPage from './pages/FoodItemsListPage';
import PackagesPage from './pages/PackagesPage';
import CategoriesPage from './pages/CategoriesPage';
import TeamPage from './pages/TeamPage';
import SubscriptionCheckoutPage from './pages/SubscriptionCheckoutPage';
import VerificationLocationsPage from './pages/VerificationLocationsPage';
import DaysAndDiscountsPage from './pages/DaysAndDiscountsPage';
import CouponsPage from './pages/CouponsPage';
import CouponUsageReportPage from './pages/CouponUsageReportPage';
import SiteSettingsPage from './pages/SiteSettingsPage';
import ExpensesListPage from './pages/ExpensesListPage';
import GRNPage from './pages/GRNPage';
import SubscriptionRequestsPage from './pages/SubscriptionRequestsPage';
import SubscribersPage from './pages/SubscribersPage';
import AddonCategoriesPage from './pages/AddonCategoriesPage';
import AddonRequestsPage from './pages/AddonRequestsPage';
import ApprovedAddonsPage from './pages/ApprovedAddonsPage';
import StudentVerifyPage from './pages/StudentVerifyPage';
import CoinRequestsPage from './pages/CoinRequestsPage';
import KitchenDashboardPage from './pages/KitchenDashboardPage';
import OrderDashboardPage from './pages/OrderDashboardPage';
import UserSubscriptionsPage from './pages/UserSubscriptionsPage';
import UserAddonsPage from './pages/UserAddonsPage';
import GroupUsersPage from './pages/GroupUsersPage';
import ReferralPage from './pages/ReferralPage';
import AdminReferralsPage from './pages/AdminReferralsPage';
import AdminRefundPolicyPage from './pages/AdminRefundPolicyPage';
import BannersPage from './pages/BannersPage';
import AssignDeliveryPage from './pages/AssignDeliveryPage';
import DeliveryDetailsPage from './pages/DeliveryDetailsPage';
import CancelledMealsPage from './pages/CancelledMealsPage';
import PausedMealsPage from './pages/PausedMealsPage';
import RatingsPage from './pages/RatingsPage';
import CustomerInquiriesPage from './pages/CustomerInquiriesPage';
import PublicDisplayRatingsPage from './pages/PublicDisplayRatingsPage';

// App Routes
// eslint-disable-next-line react-refresh/only-export-components
export const ROUTES = {
  ROOT: '/',
  ABOUT: '/about',
  PARTY_ORDERS: '/party-orders',
  CONTACT: '/contact',
  TERMS: '/terms',

  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  DELIVERY_STATUS: '/delivery-status',
  ADDONS: '/addons',
  ADDONS_CART: '/addons/cart',
  SUBSCRIPTION: '/subscription',
  SUBSCRIPTION_CHECKOUT: '/subscription/checkout/:categoryId',
  WALLET: '/wallet',
  MY_SUBSCRIPTIONS: '/my-subscriptions',
  MY_ADDONS: '/my-addons',
  REFERRAL: '/referral',

  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_USERS: '/admin/users',
  ADMIN_ROLES: '/admin/roles',
  ADMIN_CUSTOMERS: '/admin/customers',
  ADMIN_TEAM: '/admin/team',
  ADMIN_DELIVERY_ASSIGN: '/admin/delivery-assign',
  ADMIN_DELIVERY_DETAILS: '/admin/delivery-details',
  ADMIN_DELIVERY_STATUS: '/admin/delivery-status',
  ADMIN_PRODUCTS_LIST: '/admin/products-list',
  ADMIN_CATEGORIES: '/admin/categories',
  ADMIN_PACKAGES: '/admin/packages',
  ADMIN_ADDON_CATEGORIES: '/admin/addons/categories',
  ADMIN_ADDON_REQUESTS: '/admin/addons-requests',
  ADMIN_ADDON_APPROVED: '/admin/addons-approved',
  ADMIN_STUDENT_VERIFY: '/admin/student-verify',
  ADMIN_FOOD_ITEMS: '/admin/food-items',
  ADMIN_WALLET: '/admin/wallet',
  ADMIN_COIN_REQUESTS: '/admin/coin-requests',
  ADMIN_COUPONS: '/admin/coupons',
  ADMIN_COUPONS_USAGE: '/admin/coupons-usage',
  ADMIN_SITE_SETTINGS: '/admin/site-settings',
  ADMIN_BANNERS: '/admin/banner',
  ADMIN_VERIFICATION_LOCATIONS: '/admin/verification-locations',
  ADMIN_DAYS_DISCOUNTS: '/admin/days-and-discounts',
  ADMIN_EXPENSES: '/admin/expenses',
  ADMIN_GRN: '/admin/grn',
  ADMIN_SUBSCRIPTION_REQUESTS: '/admin/subscriptions-requests',
  ADMIN_SUBSCRIPTION_SUBSCRIBERS: '/admin/subscriptions-subscribers',
  ADMIN_PAUSED_MEALS: '/admin/paused-meals',
  ADMIN_CANCELLED_MEALS: '/admin/cancelled-meals',
  ADMIN_KITCHEN_DASHBOARD: '/admin/kitchen-dashboard',
  ADMIN_ORDER_DASHBOARD: '/admin/kitchen-cooking-request',
  ADMIN_GROUP_USERS: '/admin/delivery-group-users',
  ADMIN_REFERRALS: '/admin/referrals',
  ADMIN_REFUND_POLICIES: '/admin/refund-policies',
  ADMIN_CUSTOMER_INQUIRIES: '/admin/customer-inquiries',
  ADMIN_RATINGS: '/admin/ratings',
  ADMIN_PUBLIC_RATINGS: '/admin/public-ratings',
};

function AppRoutes() {
  const isLoginOpen = useLoginModalStore((state) => state.isOpen);
  const closeLoginModal = useLoginModalStore((state) => state.close);
  const clearLoginRedirect = useLoginModalStore((state) => state.clearRedirectPath);
  const consumeLoginRedirect = useLoginModalStore((state) => state.consumeRedirectPath);
  const { isOpen: isSignupOpen, close: closeSignup } = useSignupModalStore();
  const addToast = useToastStore((state) => state.addToast);
  const removeToast = useToastStore((state) => state.removeToast);
  const { roles, loading: roleLoading, initialize } = useUserRoleStore();
  const consumePendingAddonRequest = useAddonCartStore((state) => state.consumePendingRequest);
  const addAddonCartItem = useAddonCartStore((state) => state.addOrUpdateItem);
  const navigate = useNavigate();

  // Initialize the user role store
  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleOffline = () => {
      addToast('Network connection lost.', 'error');
    };

    const handleOnline = () => {
      removeToast(OFFLINE_TOAST_ID);
      addToast('Back online! Syncing your latest changes.', 'success');
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [addToast, removeToast]);

  const handleLogin = async (email: string, password: string) => {
    try {
      const credentials = await signInWithEmailAndPassword(auth, email, password);
      const userId = credentials.user.uid;

      let resolvedProfile: Awaited<ReturnType<typeof UserModel.findById>> | null = null;

      try {
        const existingWallet = await WalletModel.findByCustomerId(userId);
        if (!existingWallet) {
          let customerName: string | undefined;
          let customerEmail: string | undefined;

          try {
            resolvedProfile = await UserModel.findById(userId);
            customerName = resolvedProfile?.fullName ?? undefined;
            customerEmail = resolvedProfile?.email ?? undefined;
          } catch (profileError) {
            console.error('Failed to fetch user profile while ensuring wallet on login', profileError);
          }

          await WalletModel.create({
            customerId: userId,
            customerName: customerName ?? credentials.user.displayName ?? undefined,
            customerEmail: customerEmail ?? credentials.user.email ?? undefined,
            coins: 0,
          });
        }
      } catch (walletError) {
        console.error('Failed to ensure wallet exists on login', walletError);
      }

      try {
        await CustomerLoginModel.recordLogin({
          userId,
          userEmail: credentials.user.email ?? null,
          userName:
            resolvedProfile?.fullName ??
            credentials.user.displayName ??
            credentials.user.email ??
            null,
        });
      } catch (loginAuditError) {
        console.error('Failed to record customer login', loginAuditError);
      }

      addToast(`Login successful! Roles: ${roles.map((r) => r.name).join(', ') || 'None'}`, 'success');
      const pendingAddon = consumePendingAddonRequest();
      if (pendingAddon) {
        const { item, quantity } = pendingAddon;
        addAddonCartItem(item, quantity);

        let deliveryDateLabel = 'the upcoming delivery';
        if (item.deliveryDate) {
          const deliveryDate = new Date(`${item.deliveryDate}T00:00:00`);
          if (!Number.isNaN(deliveryDate.getTime())) {
            deliveryDateLabel = deliveryDate.toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            });
          }
        }

        addToast(`${item.name} saved for ${deliveryDateLabel} (${quantity} item${quantity > 1 ? 's' : ''}).`, 'success');
      }
      const redirectPath = consumeLoginRedirect() ?? ROUTES.DASHBOARD;
      closeLoginModal();
      navigate(redirectPath);
    } catch (error) {
      const errorMessage = getFirebaseErrorMessage(error);
      addToast(`Login failed: ${errorMessage}`, 'error');
    }
  };

  const handleSignup = async (
    fullName: string,
    phone: string,
    email: string,
    userType: string,
    password: string,
    deliveryLocation: DeliveryLocationSignupPayload,
    referredByCode?: string,
  ) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      
      // Generate unique referral code for new user
      let newUserReferralCode = '';
      try {
        newUserReferralCode = await generateUniqueReferralCode();
        console.log('Generated referral code:', newUserReferralCode);
      } catch (codeError) {
        console.error('Failed to generate referral code:', codeError);
        // Continue signup even if code generation fails
      }
      
      // Retrieve configured default role
      let defaultRoleId = '';
      try {
        const cfg = await ConfigModel.get();
        if (cfg.defaultRoleId) {
          defaultRoleId = cfg.defaultRoleId;
        }
      } catch {
        // ignore config fetch errors, fallback below
      }
      // Fallback: existing behavior search for role named 'User'
      if (!defaultRoleId) {
        const defaultRole = await RoleModel.findByName('User');
        defaultRoleId = defaultRole?.id || '';
      }

      // Create user with model
      const userData: Record<string, unknown> = {
        fullName,
        phone,
        email,
        userType,
        roles: defaultRoleId ? [defaultRoleId] : [],
      };
      
      // Only add referralCode if it was successfully generated
      if (newUserReferralCode) {
        userData.referralCode = newUserReferralCode;
      }
      
      await UserModel.create(userData, uid);

      // Create wallet for new user
      try {
        const existingWallet = await WalletModel.findByCustomerId(uid);
        if (!existingWallet) {
          await WalletModel.create({
            customerId: uid,
            customerName: fullName,
            customerEmail: email,
            coins: 0,
          });
        }
      } catch (walletError) {
        console.error('Failed to create wallet for new user', walletError);
      }

      // Create delivery location for new user
      try {
        await UserDeliveryLocationModel.create({
          userId: uid,
          userName: fullName,
          locationName: deliveryLocation.locationName,
          address: deliveryLocation.address,
          coordinates: deliveryLocation.coordinates,
          landmark: deliveryLocation.landmark,
          contactPhone: deliveryLocation.contactPhone,
          contactName: deliveryLocation.contactName,
          isDefault: true, // First location is automatically set as default
        });
      } catch (locationError) {
        console.error('Failed to create delivery location during signup', locationError);
        addToast(
          'Signup successful! However, we could not save your delivery location. Please add it from your profile.',
          'warning'
        );
      }

      if (userType === 'Student') {
        addToast(
          'Signup successful! Complete student verification from your profile to unlock student benefits.',
          'info'
        );
      }

      // Handle referral if code was provided
      if (referredByCode && referredByCode.trim() !== '') {
        try {
          const referrerId = await validateReferralCode(referredByCode);
          
          if (referrerId) {
            // Award coins to referrer (configurable, default 50 coins)
            const referralCoins = 50;
            await WalletModel.addCoins(referrerId, referralCoins);

            // Create referral record
            await ReferralModel.create({
              referralCode: referredByCode.trim().toUpperCase(),
              referrerId: referrerId,
              referredUserId: uid,
              referredUserName: fullName,
              referredUserEmail: email,
              coinsEarned: referralCoins,
              status: 'completed',
            });

            addToast(`Signup successful! Referral applied. ${referralCoins} coins awarded to referrer.`, 'success');
          } else {
            addToast('Signup successful! Invalid referral code provided.', 'success');
          }
        } catch (referralError) {
          console.error('Failed to process referral', referralError);
          addToast('Signup successful! Referral processing failed.', 'success');
        }
      } else {
        addToast('Signup successful!' + (defaultRoleId ? ' Role assigned.' : ''), 'success');
      }

      addToast('Your delivery location is saved. You can add more from the Profile page when needed.', 'info');

      closeSignup();
    } catch (error) {
      const errorMessage = getFirebaseErrorMessage(error);
      addToast(`Signup failed: ${errorMessage}`, 'error');
    }
  };

  const handleCloseLoginModal = useCallback(() => {
    clearLoginRedirect();
    closeLoginModal();
  }, [clearLoginRedirect, closeLoginModal]);

  if (roleLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Public routes */}
        <Route path={ROUTES.ROOT} element={<LandingPage />} />
        <Route path={ROUTES.ABOUT} element={<AboutPage />} />
        <Route path={ROUTES.PARTY_ORDERS} element={<PartyOrdersPage />} />
        <Route path={ROUTES.CONTACT} element={<ContactPage />} />
  <Route path={ROUTES.TERMS} element={<TermsPage />} />
        <Route path={ROUTES.SUBSCRIPTION} element={<SubscriptionPage />} />
        <Route
          path={ROUTES.SUBSCRIPTION_CHECKOUT}
          element={(
            <ProtectedRoute requiredPermission={PERMISSIONS.USER_SUBSCRIPTION_CHECKOUT}>
              <SubscriptionCheckoutPage />
            </ProtectedRoute>
          )}
        />
        <Route path={ROUTES.ADDONS} element={<AddonsPage />} />

        {/* Authenticated/layout routes */}
        <Route element={<SidebarLayout />}> {/* pathless layout route */}
          <Route
            path={ROUTES.DASHBOARD}
            element={(
              <ProtectedRoute requiredPermission={PERMISSIONS.USER_DASHBOARD_VIEW}>
                <Dashboard />
              </ProtectedRoute>
            )}
          />
          <Route
            path={ROUTES.PROFILE}
            element={(
              <ProtectedRoute requiredPermission={PERMISSIONS.USER_PROFILE_VIEW}>
                <ProfilePage />
              </ProtectedRoute>
            )}
          />
          <Route
            path={ROUTES.DELIVERY_STATUS}
            element={(
              <ProtectedRoute requiredPermission={PERMISSIONS.USER_DELIVERY_STATUS_VIEW}>
                <DeliveryStatusPage />
              </ProtectedRoute>
            )}
          />
          <Route
            path={ROUTES.WALLET}
            element={(
              <ProtectedRoute requiredPermission={PERMISSIONS.USER_WALLET_VIEW}>
                <WalletPage />
              </ProtectedRoute>
            )}
          />
          <Route
            path={ROUTES.MY_SUBSCRIPTIONS}
            element={(
              <ProtectedRoute requiredPermission={PERMISSIONS.USER_SUBSCRIPTIONS_VIEW}>
                <UserSubscriptionsPage />
              </ProtectedRoute>
            )}
          />
          <Route
            path={ROUTES.MY_ADDONS}
            element={(
              <ProtectedRoute requiredPermission={PERMISSIONS.USER_ADDONS_VIEW}>
                <UserAddonsPage />
              </ProtectedRoute>
            )}
          />
          <Route
            path={ROUTES.ADDONS_CART}
            element={(
              <ProtectedRoute requiredPermission={PERMISSIONS.USER_ADDONS_VIEW}>
                <AddonCartPage />
              </ProtectedRoute>
            )}
          />
          <Route
            path={ROUTES.REFERRAL}
            element={(
              <ProtectedRoute requiredPermission={PERMISSIONS.USER_REFERRAL_VIEW}>
                <ReferralPage />
              </ProtectedRoute>
            )}
          />
          <Route path={ROUTES.ADMIN_DASHBOARD} element={<ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_DASHBOARD_VIEW}><AdminDashboard /></ProtectedRoute>} />
          <Route path={ROUTES.ADMIN_USERS} element={<ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_USERS_MANAGE}><UsersPage /></ProtectedRoute>} />
          <Route path={ROUTES.ADMIN_ROLES} element={<ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_ROLES_MANAGE}><RolesPage /></ProtectedRoute>} />
          <Route path={ROUTES.ADMIN_CUSTOMERS} element={<ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_CUSTOMERS_MANAGE}><CustomersPage /></ProtectedRoute>} />
          <Route path={ROUTES.ADMIN_TEAM} element={<ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_TEAM_MANAGE}><TeamPage /></ProtectedRoute>} />
          <Route
            path={ROUTES.ADMIN_CUSTOMER_INQUIRIES}
            element={(
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_CUSTOMER_INQUIRIES_MANAGE}>
                <CustomerInquiriesPage />
              </ProtectedRoute>
            )}
          />
          <Route
            path={ROUTES.ADMIN_DELIVERY_ASSIGN}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_DELIVERY_ASSIGN_MANAGE}>
                <AssignDeliveryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_DELIVERY_STATUS}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_DELIVERY_STATUS_VIEW}>
                <AdminDeliveryStatusPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_DELIVERY_DETAILS}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_DELIVERY_DETAILS_VIEW}>
                <DeliveryDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_GROUP_USERS}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_DELIVERY_GROUPS_MANAGE}>
                <GroupUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_SITE_SETTINGS}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_SITE_SETTINGS_MANAGE}>
                <SiteSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_BANNERS}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_BANNERS_MANAGE}>
                <BannersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_WALLET}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_WALLET_MANAGE}>
                <AdminWalletPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_COIN_REQUESTS}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_COIN_REQUESTS_MANAGE}>
                <CoinRequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_COUPONS}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_COUPONS_MANAGE}>
                <CouponsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_COUPONS_USAGE}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_COUPON_REPORTS_VIEW}>
                <CouponUsageReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_PRODUCTS_LIST}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_PRODUCTS_MANAGE}>
                <ProductsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_CATEGORIES}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_CATEGORIES_MANAGE}>
                <CategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_PACKAGES}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_PACKAGES_MANAGE}>
                <PackagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_ADDON_CATEGORIES}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_ADDON_CATEGORIES_MANAGE}>
                <AddonCategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_ADDON_REQUESTS}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_ADDON_REQUESTS_MANAGE}>
                <AddonRequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_ADDON_APPROVED}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_APPROVED_ADDONS_MANAGE}>
                <ApprovedAddonsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_STUDENT_VERIFY}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_STUDENT_VERIFICATIONS_MANAGE}>
                <StudentVerifyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_SUBSCRIPTION_REQUESTS}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_SUBSCRIPTION_REQUESTS_MANAGE}>
                <SubscriptionRequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_SUBSCRIPTION_SUBSCRIBERS}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_SUBSCRIBERS_MANAGE}>
                <SubscribersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_PAUSED_MEALS}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_PAUSED_MEALS_VIEW}>
                <PausedMealsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_CANCELLED_MEALS}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_CANCELLED_MEALS_VIEW}>
                <CancelledMealsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_EXPENSES}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_EXPENSES_MANAGE}>
                <ExpensesListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_GRN}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_GRN_MANAGE}>
                <GRNPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_FOOD_ITEMS}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_FOOD_ITEMS_MANAGE}>
                <FoodItemsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_VERIFICATION_LOCATIONS}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_VERIFICATION_LOCATIONS_MANAGE}>
                <VerificationLocationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_DAYS_DISCOUNTS}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_DAYS_DISCOUNTS_MANAGE}>
                <DaysAndDiscountsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_KITCHEN_DASHBOARD}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_KITCHEN_DASHBOARD_VIEW}>
                <KitchenDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_ORDER_DASHBOARD}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_ORDER_DASHBOARD_VIEW}>
                <OrderDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_REFERRALS}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_REFERRALS_MANAGE}>
                <AdminReferralsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_REFUND_POLICIES}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_REFUND_POLICIES_MANAGE}>
                <AdminRefundPolicyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_RATINGS}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_DASHBOARD_VIEW}>
                <RatingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_PUBLIC_RATINGS}
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_PUBLIC_RATINGS_MANAGE}>
                <PublicDisplayRatingsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<div className="p-6 text-center">Page Not Found - <Link to={ROUTES.DASHBOARD} className="text-blue-600 hover:underline">Go to Dashboard</Link></div>} />
      </Routes>
  <LoginModal isOpen={isLoginOpen} onClose={handleCloseLoginModal} onLogin={handleLogin} />
      <SignupModal isOpen={isSignupOpen} onClose={closeSignup} onSignup={handleSignup} />
      <Toast />
    </>
  );
}

export default AppRoutes;