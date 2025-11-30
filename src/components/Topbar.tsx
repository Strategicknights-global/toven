import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '../AppRoutes';
import { useSignupModalStore } from '../stores/signupModalStore';
import { useUserRoleStore } from '../stores/userRoleStore';
import { Menu, X, Calendar, Sparkles, Package } from 'lucide-react';

interface TopbarProps {
  active?: string;
  variant?: 'landing' | 'default';
}

const Topbar: React.FC<TopbarProps> = ({ active, variant = 'default' }) => {
  const { open: openSignup } = useSignupModalStore();
  const { user } = useUserRoleStore();
  const location = useLocation();
  const pathname = location.pathname;
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const derivedActive = React.useMemo(() => {
    if (active) return active;
    if (pathname === ROUTES.ROOT) return 'Home';
    if (pathname.startsWith(ROUTES.ABOUT)) return 'About';
    if (pathname.startsWith('/contact')) return 'Contact';
    if (pathname.startsWith(ROUTES.SUBSCRIPTION)) return 'Subscription';
    if (pathname.startsWith(ROUTES.ADDONS)) return 'Addon';
    if (pathname.startsWith(ROUTES.PARTY_ORDERS)) return 'Party Order';
    return '';
  }, [active, pathname]);

  const items: { label: string; to?: string; highlighted?: boolean; icon?: React.ReactNode; }[] = [
    { label: 'Home', to: ROUTES.ROOT },
    { label: 'About', to: ROUTES.ABOUT },
    { label: 'Contact', to: '/contact' },
    { label: 'Subscription', to: ROUTES.SUBSCRIPTION, highlighted: true, icon: <Calendar className="h-4 w-4" /> },
    { label: 'Addon', to: ROUTES.ADDONS, highlighted: true, icon: <Package className="h-4 w-4" /> },
    { label: 'Party Order', to: ROUTES.PARTY_ORDERS, highlighted: true, icon: <Sparkles className="h-4 w-4" /> },
  ];

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleMobileMenu = () => setMobileOpen((prev) => !prev);

  const handleAuthClick = () => {
    setMobileOpen(false);
    openSignup();
  };

  return (
    <header className={`w-full bg-white/95 backdrop-blur border-b border-purple-100 fixed top-0 left-0 z-40 ${variant === 'landing' ? '' : ''}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-10 h-16">
        {/* Logo */}
        <Link to={ROUTES.ROOT} className="flex items-center" aria-label="Toven home">
          <img src="/toven.png" alt="Toven logo" className="h-10 w-auto object-contain" />
        </Link>

        {/* Mobile menu toggle */}
        <button
          type="button"
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileOpen}
          onClick={toggleMobileMenu}
          className="inline-flex items-center justify-center rounded-full border border-purple-100 bg-white p-2 text-[#6a0dad] shadow-sm transition hover:border-purple-200 hover:text-purple-800 md:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-4 text-sm font-medium">
          {items.map(item => {
            const pathActive = item.to ? pathname === item.to || pathname.startsWith(`${item.to}/`) : false;
            const isActive = pathActive || item.label === derivedActive;

            if (item.highlighted) {
              // Cadbury fixed color style
              const highlightedClasses = 'bg-[#5A2D82] border border-[#3D1A5F] text-white shadow-md';

              return (
                <Link
                  key={item.label}
                  to={item.to!}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 ${highlightedClasses}`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            }

            // Regular navigation items
            const baseClasses = 'relative px-4 py-2 transition-colors after:absolute after:left-0 after:bottom-0 after:h-[2px] after:bg-[#6a0dad] after:w-0 after:origin-left after:transition-all after:duration-300 after:ease-out hover:after:w-full';
            const activeClasses = isActive
              ? 'text-[#6a0dad] font-semibold after:w-full'
              : 'text-gray-700 hover:text-[#6a0dad]';
            const className = `${baseClasses} ${activeClasses}`;

            if (!item.to) {
              return <button key={item.label} className={className}>{item.label}</button>;
            }
            return <Link key={item.label} to={item.to} className={className}>{item.label}</Link>;
          })}

          {/* Login / Dashboard Button */}
          {user ? (
            <Link
              to={ROUTES.DASHBOARD}
              className="rounded-full border border-[#5A2D82] px-7 py-4 text-center text-sm font-semibold text-[#5A2D82] bg-transparent"
            >
              Dashboard
            </Link>
          ) : (
            <button
              onClick={openSignup}
              className="rounded-full border border-[#5A2D82] px-5 py-2 text-center text-medium font-semibold text-[#5A2D82] bg-transparent"

            >
              Login
            </button>
          )}
        </nav>
      </div>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <div className="md:hidden">
          <div className="absolute inset-x-0 top-16 border-b border-purple-100 bg-white/98 backdrop-blur shadow-lg">
            <div className="mx-auto max-w-7xl space-y-2 px-6 pb-6 pt-4 text-sm font-medium text-gray-700">
              {/* Regular nav items */}
              {items.filter(item => !item.highlighted).map((item) => {
                if (!item.to) return null;
                const isActive = item.label === derivedActive;

                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 transition hover:bg-purple-50 ${isActive ? 'text-[#6a0dad]' : ''}`}
                  >
                    {item.label}
                    {isActive && <span className="text-xs font-semibold">Active</span>}
                  </Link>
                );
              })}

              {/* Highlighted Buttons (stacked vertically) */}
              <div className="flex flex-col gap-2 pt-2">
                {items.filter(item => item.highlighted).map((item) => {
                  if (!item.to) return null;
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      className="flex items-center justify-center gap-2 rounded-full px-5 py-3 font-semibold text-sm bg-[#5A2D82] border border-[#3D1A5F] text-white shadow-md"
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Login / Dashboard Button */}
              <div className="flex flex-col gap-2 border-t border-purple-100 pt-4">
                {user ? (
                  <Link
                    to={ROUTES.DASHBOARD}
                    className="rounded-full border border-[#5A2D82] px-7 py-4 text-center text-sm font-semibold text-[#5A2D82] bg-transparent"

                  >
                    Dashboard
                  </Link>
                ) : (
                  <div
                    onClick={handleAuthClick}
                    className="rounded-full border border-[#5A2D82] px-7 py-4 text-center text-sm font-semibold text-[#5A2D82] bg-transparent"
                  >
                    Login
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Topbar;