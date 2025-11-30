import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '../AppRoutes';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  user: any;
  authLoading: boolean;
  openLogin: () => void;
  openSignup: () => void;
  handleLogout: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Navbar: React.FC<NavbarProps> = ({
  user,
  authLoading,
  openLogin,
  openSignup,
  handleLogout,
  sidebarOpen,
  setSidebarOpen,
}) => {
  const location = useLocation();
  
  // Check if current route is a dashboard (user or admin)
  const isDashboardRoute = React.useMemo(() => {
    const path = location.pathname;
    // User dashboard routes
    const userDashboardRoutes = [
      ROUTES.DASHBOARD,
      ROUTES.PROFILE,
      ROUTES.DELIVERY_STATUS,
      ROUTES.WALLET,
      ROUTES.MY_SUBSCRIPTIONS,
      ROUTES.MY_ADDONS,
      ROUTES.REFERRAL,
    ];
    // Admin dashboard routes
    const adminDashboardRoutes = [
      ROUTES.ADMIN_DASHBOARD,
      ROUTES.ADMIN_USERS,
      ROUTES.ADMIN_ROLES,
      ROUTES.ADMIN_CUSTOMERS,
      ROUTES.ADMIN_TEAM,
      ROUTES.ADMIN_CUSTOMER_INQUIRIES,
      ROUTES.ADMIN_DELIVERY_ASSIGN,
      ROUTES.ADMIN_DELIVERY_DETAILS,
      ROUTES.ADMIN_GROUP_USERS,
      ROUTES.ADMIN_SITE_SETTINGS,
      ROUTES.ADMIN_BANNERS,
      ROUTES.ADMIN_WALLET,
      ROUTES.ADMIN_COIN_REQUESTS,
      ROUTES.ADMIN_COUPONS,
      ROUTES.ADMIN_COUPONS_USAGE,
      ROUTES.ADMIN_PRODUCTS_LIST,
      ROUTES.ADMIN_CATEGORIES,
      ROUTES.ADMIN_PACKAGES,
      ROUTES.ADMIN_ADDON_CATEGORIES,
      ROUTES.ADMIN_ADDON_REQUESTS,
      ROUTES.ADMIN_ADDON_APPROVED,
      ROUTES.ADMIN_STUDENT_VERIFY,
      ROUTES.ADMIN_SUBSCRIPTION_REQUESTS,
      ROUTES.ADMIN_SUBSCRIPTION_SUBSCRIBERS,
      ROUTES.ADMIN_PAUSED_MEALS,
      ROUTES.ADMIN_CANCELLED_MEALS,
      ROUTES.ADMIN_EXPENSES,
      ROUTES.ADMIN_GRN,
      ROUTES.ADMIN_FOOD_ITEMS,
      ROUTES.ADMIN_VERIFICATION_LOCATIONS,
      ROUTES.ADMIN_DAYS_DISCOUNTS,
      ROUTES.ADMIN_KITCHEN_DASHBOARD,
      ROUTES.ADMIN_ORDER_DASHBOARD,
      ROUTES.ADMIN_REFERRALS,
      ROUTES.ADMIN_REFUND_POLICIES,
      ROUTES.ADMIN_RATINGS,
      ROUTES.ADMIN_PUBLIC_RATINGS,
    ];
    
    const allDashboardRoutes = [...userDashboardRoutes, ...adminDashboardRoutes];
    return allDashboardRoutes.some(route => path.startsWith(route));
  }, [location.pathname]);

  const navItems = React.useMemo(
    () => [
      { label: 'Home', to: ROUTES.ROOT },
      { label: 'About', to: ROUTES.ABOUT },
      { label: 'Contact', to: '/contact' },
      { label: 'Party Orders', to: ROUTES.PARTY_ORDERS },
      { label: 'Subscription', to: ROUTES.SUBSCRIPTION },
    ],
    []
  );

  return (
    <nav className="bg-white shadow-md p-4 shrink-0">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {/* Hamburger menu button - only show on mobile */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="xl:hidden p-2 rounded-md hover:bg-gray-100"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <Link
            to={ROUTES.ROOT}
            aria-label="Toven home"
            className={`${sidebarOpen ? 'hidden' : 'flex'} items-center xl:hidden`}
          >
            <img src="/toven.png" alt="Toven logo" className="h-9 w-auto object-contain" />
          </Link>
        </div>
        <div className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            const baseClasses = 'relative px-2 py-1 transition-colors after:absolute after:left-0 after:bottom-[-8px] after:h-[2px] after:bg-[#6a0dad] after:w-0 after:origin-left after:transition-all after:duration-300 after:ease-out hover:text-[#6a0dad] hover:after:w-full';
            const stateClasses = isActive ? 'text-[#6a0dad] font-semibold after:w-full' : 'text-gray-600';
            return (
              <Link key={item.label} to={item.to} className={`${baseClasses} ${stateClasses}`}>
                {item.label}
              </Link>
            );
          })}
        </div>
        {user ? (
          <div className="space-x-4 flex items-center">
            <span className="text-sm text-gray-500">
              Welcome, {user.displayName || 'User'}!
            </span>
            <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
              Logout
            </button>
          </div>
        ) : (
          <div className="space-x-4">
            <button onClick={openLogin} disabled={authLoading} className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50">
              Login
            </button>
            <button onClick={openSignup} disabled={authLoading} className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 disabled:opacity-50">
              Sign Up
            </button>
          </div>
        )}
      </div>
      <div className={`${isDashboardRoute ? 'hidden' : 'mt-3 flex xl:hidden items-center space-x-4 overflow-x-auto text-sm text-gray-600'}`}>
        {!isDashboardRoute && navItems.map((item) => {
          const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`relative px-1 pb-1 ${isActive ? 'text-[#6a0dad] font-semibold after:w-full' : ''} after:absolute after:left-0 after:bottom-0 after:h-[2px] after:bg-[#6a0dad] after:w-0 after:origin-left after:transition-all after:duration-300 after:ease-out hover:text-[#6a0dad] hover:after:w-full`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default Navbar;