import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserRoleStore } from '../stores/userRoleStore';
import { PERMISSIONS } from '../permissions';
import { ROUTES } from '../AppRoutes';
import { Calendar, Package, Clock, CheckCircle, Star } from 'lucide-react';
import { useSubscriptionRequestsStore } from '../stores/subscriptionRequestsStore';
import { auth } from '../firebase';
import SubmitRatingDialog from '../components/SubmitRatingDialog';
import { useAddonCartStore } from '../stores/addonCartStore';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useUserRoleStore();
  const { requests, loading, loadRequests } = useSubscriptionRequestsStore();
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const cartItemsMap = useAddonCartStore((state) => state.items);
  const totalCartItems = useAddonCartStore((state) => state.totalQuantity());
  const totalCartCoins = useAddonCartStore((state) => state.totalCoins());

  useEffect(() => {
    if (auth.currentUser) {
      void loadRequests();
    }
  }, [loadRequests]);

  // Get user's subscription requests
  const userRequests = useMemo(() => {
    if (!auth.currentUser) return [];
    return requests.filter(req => req.userId === auth.currentUser?.uid);
  }, [requests]);

  // Get active/approved subscriptions
  const activeSubscriptions = useMemo(() => {
    return userRequests.filter(req => req.status === 'approved');
  }, [userRequests]);

  // Get pending subscriptions
  const pendingSubscriptions = useMemo(() => {
    return userRequests.filter(req => req.status === 'pending');
  }, [userRequests]);

  const cartItems = useMemo(() => Object.values(cartItemsMap), [cartItemsMap]);

  // Format date for display
  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };

  // User Dashboard Content
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Dashboard</h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Subscription Period Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-purple-100">
          <div className="flex items-center mb-4">
            <div className="bg-purple-100 p-3 rounded-full mr-4">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-purple-800">My Subscriptions</h2>
              <p className="text-purple-600 text-sm">Active and pending plans</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading subscriptions...</p>
            </div>
          ) : activeSubscriptions.length === 0 && pendingSubscriptions.length === 0 ? (
            <>
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <Package className="h-12 w-12 mx-auto text-gray-300" />
                </div>
                <p className="text-lg font-medium text-gray-500">No subscriptions found</p>
              </div>
              <div className="text-center">
                <Link
                  to={ROUTES.SUBSCRIPTION}
                  className="inline-block bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  Browse Subscription Plans
                </Link>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {/* Active Subscriptions */}
              {activeSubscriptions.map((sub) => (
                <div key={sub.id} className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-900">Active Subscription</span>
                    </div>
                    <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                      {sub.summary.durationDays} days
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p><strong>Category:</strong> {sub.categoryName}</p>
                    <p><strong>Diet:</strong> {sub.dietPreference === 'pure-veg' ? 'Pure Veg' : 'Mixed'}</p>
                    <p><strong>Start Date:</strong> {formatDate(sub.startDate)}</p>
                    <p><strong>Meals:</strong> {sub.selections.map(s => s.mealType).join(', ')}</p>
                    <p><strong>Total:</strong> ₹{sub.summary.totalPayable.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}

              {/* Pending Subscriptions */}
              {pendingSubscriptions.map((sub) => (
                <div key={sub.id} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-yellow-600" />
                      <span className="font-semibold text-yellow-900">Pending Review</span>
                    </div>
                    <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">
                      {sub.summary.durationDays} days
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p><strong>Category:</strong> {sub.categoryName}</p>
                    <p><strong>Diet:</strong> {sub.dietPreference === 'pure-veg' ? 'Pure Veg' : 'Mixed'}</p>
                    <p><strong>Start Date:</strong> {formatDate(sub.startDate)}</p>
                    <p><strong>Meals:</strong> {sub.selections.map(s => s.mealType).join(', ')}</p>
                    <p><strong>Total:</strong> ₹{sub.summary.totalPayable.toLocaleString('en-IN')}</p>
                  </div>
                  <p className="text-xs text-yellow-700 mt-2">Your request is being reviewed by our team.</p>
                </div>
              ))}

              {/* Browse More Plans */}
              <div className="text-center pt-2">
                <Link
                  to={ROUTES.SUBSCRIPTION}
                  className="text-purple-600 hover:text-purple-800 text-sm font-medium underline"
                >
                  Browse more plans
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Today's Add-on Deliveries Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-green-100">
          <div className="flex items-center mb-4">
            <div className="bg-green-100 p-3 rounded-full mr-4">
              <Package className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-green-800">Today's Add-on Deliveries</h2>
              <p className="text-green-600 text-sm">Track your scheduled deliveries</p>
            </div>
          </div>
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <Calendar className="h-12 w-12 mx-auto text-gray-300" />
            </div>
            <p className="text-lg font-medium text-gray-500">No scheduled deliveries</p>
          </div>
          <div className="text-center">
            <Link
              to={ROUTES.ADDONS}
              className="text-green-600 hover:text-green-800 text-sm font-medium underline"
            >
              Schedule a delivery
            </Link>
          </div>
        </div>

        {/* Add-on Cart Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-purple-100 flex flex-col">
          <div className="flex items-center mb-4">
            <div className="bg-purple-100 p-3 rounded-full mr-4">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-purple-800">Add-on Cart</h2>
              <p className="text-purple-600 text-sm">Quick glance at your selections</p>
            </div>
          </div>
          {totalCartItems === 0 ? (
            <div className="flex-1 text-sm text-gray-600">
              <p>Your add-on cart is empty. Browse the latest add-ons and start building your order.</p>
            </div>
          ) : (
            <div className="flex-1 space-y-4 text-sm text-gray-700">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Items</span>
                  <span className="text-lg font-semibold text-slate-900">{totalCartItems}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Coins</span>
                  <span className="text-lg font-semibold text-slate-900">{totalCartCoins}</span>
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Highlights</span>
                <ul className="space-y-1">
                  {cartItems.slice(0, 3).map((item) => (
                    <li key={item.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                      <span className="font-medium text-slate-800">{item.name}</span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {item.quantity} × {item.mealType}
                      </span>
                    </li>
                  ))}
                </ul>
                {cartItems.length > 3 ? (
                  <p className="text-xs text-slate-400">and {cartItems.length - 3} more selections…</p>
                ) : null}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => navigate(ROUTES.ADDONS_CART)}
            className="mt-6 inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
          >
            {totalCartItems === 0 ? 'Browse add-ons' : 'Review cart'}
          </button>
        </div>
      </div>

      {/* Rate Us Section */}
      <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-purple-900 mb-1">How was your experience?</h3>
            <p className="text-sm text-purple-700">Share your feedback and help us improve!</p>
          </div>
          <button
            type="button"
            onClick={() => setShowRatingDialog(true)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-semibold text-white transition hover:from-purple-700 hover:to-pink-700"
          >
            <Star className="h-5 w-5" />
            Rate Us
          </button>
        </div>
      </div>

      {/* Admin Links if permitted */}
  {hasPermission(PERMISSIONS.ADMIN_DASHBOARD_VIEW) && (
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Admin Panel</h3>
          <div className="space-x-4">
            <Link to={ROUTES.ADMIN_USERS} className="bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 inline-block">
              Manage Users
            </Link>
            <Link to={ROUTES.ADMIN_ROLES} className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 inline-block">
              Manage Roles
            </Link>
          </div>
        </div>
      )}

      {/* Rating Dialog */}
      <SubmitRatingDialog isOpen={showRatingDialog} onClose={() => setShowRatingDialog(false)} />
    </div>
  );
};

export default Dashboard;