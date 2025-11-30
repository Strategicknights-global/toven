import React, { useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LogIn,
  TrendingUp,
  ArrowDownCircle,
  ShoppingBag,
  Package,
  RefreshCcw,
} from 'lucide-react';
import { ROUTES } from '../AppRoutes';
import { useAdminDashboardMetricsStore } from '../stores/adminDashboardMetricsStore';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('en-IN');

const AdminDashboard: React.FC = () => {
  const {
    loading,
    error,
    lastUpdated,
    loginsThisMonth,
    uniqueLoginCustomersThisMonth,
    revenueThisMonth,
    expensesThisMonth,
    subscribersByProduct,
    addonForecast,
    refresh,
  } = useAdminDashboardMetricsStore();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const netRevenue = useMemo(() => revenueThisMonth - expensesThisMonth, [revenueThisMonth, expensesThisMonth]);
  const totalSubscribersTracked = useMemo(
    () => subscribersByProduct.reduce((sum, entry) => sum + entry.subscriberCount, 0),
    [subscribersByProduct],
  );
  const topAddon = addonForecast[0];

  const metricCards = [
    {
      key: 'logins',
      title: 'Customer logins (this month)',
      value: numberFormatter.format(loginsThisMonth),
      subtitle: `${numberFormatter.format(uniqueLoginCustomersThisMonth)} unique customers`,
      icon: LogIn,
      bg: 'bg-purple-100',
      fg: 'text-purple-700',
    },
    {
      key: 'revenue',
      title: 'Revenue (this month)',
      value: currencyFormatter.format(revenueThisMonth),
      subtitle: netRevenue >= 0
        ? `Net +${currencyFormatter.format(Math.abs(netRevenue))}`
        : `Net -${currencyFormatter.format(Math.abs(netRevenue))}`,
      icon: TrendingUp,
      bg: 'bg-emerald-100',
      fg: 'text-emerald-700',
    },
    {
      key: 'expenses',
      title: 'Expenses (this month)',
      value: currencyFormatter.format(expensesThisMonth),
      subtitle: `${numberFormatter.format(totalSubscribersTracked)} active product subscriptions`,
      icon: ArrowDownCircle,
      bg: 'bg-rose-100',
      fg: 'text-rose-700',
    },
    {
      key: 'addon',
      title: 'Top add-on forecast',
      value: topAddon ? `${numberFormatter.format(topAddon.totalQuantity)} units` : '—',
      subtitle: topAddon
        ? `Next delivery ${topAddon.nextDeliveryDate?.toLocaleDateString() ?? 'TBD'}`
        : 'No upcoming add-on orders',
      icon: ShoppingBag,
      bg: 'bg-amber-100',
      fg: 'text-amber-700',
    },
  ];

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="mt-2 text-base text-slate-600">
            Stay on top of customer engagement, subscription momentum, monthly finances, and high-demand add-ons.
          </p>
          {lastUpdated ? (
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
              Last refreshed {lastUpdated.toLocaleString()}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          disabled={loading}
        >
          <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Refreshing…' : 'Refresh data'}
        </button>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <div key={card.key} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.title}</p>
                <p className="mt-3 text-3xl font-bold text-slate-900">{card.value}</p>
                <p className="mt-1 text-sm text-slate-500">{card.subtitle}</p>
              </div>
              <span className={`rounded-full p-3 ${card.bg} ${card.fg}`}>
                <card.icon size={22} />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">Product traction</p>
              <h2 className="text-xl font-semibold text-slate-900">Subscribers by product</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ranking based on approved subscriptions. Track top-performing meal packages and associated revenue.
              </p>
            </div>
            <span className="rounded-full bg-purple-100 p-3 text-purple-700">
              <Package size={20} />
            </span>
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                    Package
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium text-slate-600">
                    Subscribers
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium text-slate-600">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscribersByProduct.slice(0, 6).map((entry) => (
                  <tr key={entry.packageId || entry.packageName} className="hover:bg-purple-50/30">
                    <td className="px-4 py-3 text-slate-700">{entry.packageName}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {numberFormatter.format(entry.subscriberCount)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {currencyFormatter.format(entry.totalRevenue)}
                    </td>
                  </tr>
                ))}
                {subscribersByProduct.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-500">
                      No approved subscriptions yet. Encourage customers to complete checkout to populate this view.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Demand planning</p>
              <h2 className="text-xl font-semibold text-slate-900">High add-ons sales forecast</h2>
              <p className="mt-1 text-sm text-slate-500">
                Upcoming add-on requests with the highest volume. Use this to prep kitchen inventory and staffing.
              </p>
            </div>
            <span className="rounded-full bg-amber-100 p-3 text-amber-700">
              <ShoppingBag size={20} />
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {addonForecast.length === 0 ? (
              <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/40 px-4 py-6 text-center text-sm text-amber-700">
                No future add-on orders detected. Approve pending requests or promote add-ons to generate forecasts.
              </div>
            ) : (
              addonForecast.map((addon) => (
                <div
                  key={addon.addonId || addon.addonName}
                  className="rounded-lg border border-amber-100 bg-amber-50/40 px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center justify-between text-sm font-medium text-amber-800">
                    <span>{addon.addonName}</span>
                    <span>{numberFormatter.format(addon.totalQuantity)} units</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between text-xs text-amber-700">
                    <span>
                      Expected delivery{' '}
                      {addon.nextDeliveryDate ? addon.nextDeliveryDate.toLocaleDateString() : 'TBD'}
                    </span>
                    <span>
                      Net coins {numberFormatter.format(Math.max(addon.totalCoins - addon.totalDiscountCoins, 0))}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Quick actions</h2>
        <p className="mt-1 text-sm text-slate-500">
          Jump straight into the most common administration tasks.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link
            to={ROUTES.ADMIN_USERS}
            className="flex items-center rounded-lg border border-slate-200 px-4 py-4 transition hover:border-purple-300 hover:bg-purple-50/40"
          >
            <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700">
              <LogIn size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Manage users</h3>
              <p className="text-sm text-slate-600">Approve accounts, assign roles, and track customer activity.</p>
            </div>
          </Link>

          <Link
            to={ROUTES.ADMIN_ROLES}
            className="flex items-center rounded-lg border border-slate-200 px-4 py-4 transition hover:border-purple-300 hover:bg-purple-50/40"
          >
            <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Configure roles & permissions</h3>
              <p className="text-sm text-slate-600">Fine-tune what each internal team can access.</p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;