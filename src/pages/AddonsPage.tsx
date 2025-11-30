import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import Footer from '../components/Footer';
import { useFoodItemsStore } from '../stores/foodItemsStore';
import { useAddonCategoriesStore } from '../stores/addonCategoriesStore';
import { useAddonCartStore } from '../stores/addonCartStore';
import { useSubscriptionRequestsStore } from '../stores/subscriptionRequestsStore';
import { useToastStore } from '../stores/toastStore';
import { useLoginModalStore } from '../stores/loginModalStore';
import { useUserRoleStore } from '../stores/userRoleStore';
import { ROUTES } from '../AppRoutes';
import {
  getAddonDeliveryDateKey,
  getAddonDeliveryLabel,
  isAddonOrderWindowClosed,
} from '../utils/addonOrders';
import { resolveCutoffHour } from '../utils/timeWindow';
import { useConfigStore } from '../stores/configStore';
import { usePlacementBanners } from '../stores/publicBannersStore';
import { getBannerAlt, getBannerImageSrc } from '../utils/bannerUtils';
import type { MealType } from '../schemas/FoodItemSchema';
import { Search, ShoppingCart } from 'lucide-react';

const GRADIENT_PALETTE = [
  { from: '#fff7ed', to: '#fef3c7' },
  { from: '#ecfeff', to: '#f0f9ff' },
  { from: '#fdf4ff', to: '#fce7f3' },
  { from: '#ecfdf5', to: '#d1fae5' },
  { from: '#eef2ff', to: '#e0e7ff' },
  { from: '#f8fafc', to: '#e2e8f0' },
];

const PLACEHOLDER_IMAGE = '/image1.webp';

const MEAL_TYPE_FILTERS: Array<{ value: 'all' | MealType; label: string }> = [
  { value: 'Breakfast', label: 'Breakfast' },
  { value: 'Lunch', label: 'Lunch' },
  { value: 'Dinner', label: 'Dinner' },
];


const AddonsPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, loading, loadItems } = useFoodItemsStore();
  const { addonCategories, loading: categoriesLoading, loadAddonCategories } = useAddonCategoriesStore();
  const cartItems = useAddonCartStore((state) => state.items);
  const totalCartQuantity = useAddonCartStore((state) => state.totalQuantity());
  const addCartItem = useAddonCartStore((state) => state.addOrUpdateItem);
  const setPendingCartRequest = useAddonCartStore((state) => state.setPendingRequest);
  const addToast = useToastStore((state) => state.addToast);
  const openLoginModal = useLoginModalStore((state) => state.open);
  const user = useUserRoleStore((state) => state.user);
  const { banners: addonHeroBanners } = usePlacementBanners('addons');
  const addonHeroBanner = addonHeroBanners[0];
  const addonHeroSrc = getBannerImageSrc(addonHeroBanner);
  const addonHeroAlt = getBannerAlt(addonHeroBanner, 'Add-on hero banner');
  const config = useConfigStore((state) => state.config);
  const configLoading = useConfigStore((state) => state.loading);
  const configLoaded = useConfigStore((state) => state.loaded);
  const loadConfig = useConfigStore((state) => state.loadConfig);

  useEffect(() => {
    if (!configLoaded && !configLoading) {
      void loadConfig();
    }
  }, [configLoaded, configLoading, loadConfig]);

  const addonCutoffHour = useMemo(
    () => resolveCutoffHour(config?.addonOrderCutoffHour),
    [config?.addonOrderCutoffHour],
  );

  const computeIsCutoffPassed = useCallback(
    () => isAddonOrderWindowClosed(new Date(), { cutoffHour: addonCutoffHour }),
    [addonCutoffHour],
  );

  const [isCutoffPassed, setIsCutoffPassed] = useState(() => computeIsCutoffPassed());
  const [searchTerm, setSearchTerm] = useState('');
  const [mealTypeFilter, setMealTypeFilter] = useState<'all' | MealType>('all');

  const addonCutoffTimeLabel = useMemo(() => {
    const period = addonCutoffHour >= 12 ? 'PM' : 'AM';
    const displayHour = addonCutoffHour % 12 === 0 ? 12 : addonCutoffHour % 12;
    return `${displayHour}:00 ${period}`;
  }, [addonCutoffHour]);

  const nextDeliveryLabel = useMemo(() => {
    if (isCutoffPassed) {
      // re-evaluate when cutoff window toggles
    }
    return getAddonDeliveryLabel(new Date(), { locale: 'en-IN', cutoffHour: addonCutoffHour });
  }, [addonCutoffHour, isCutoffPassed]);

  const initialItemsLoadRef = useRef(false);
  useEffect(() => {
    if (initialItemsLoadRef.current) {
      return;
    }
    initialItemsLoadRef.current = true;
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    setIsCutoffPassed(computeIsCutoffPassed());
    const interval = window.setInterval(() => {
      setIsCutoffPassed(computeIsCutoffPassed());
    }, 60000);

    return () => {
      window.clearInterval(interval);
    };
  }, [computeIsCutoffPassed]);

  const [isVeg, setIsVeg] = useState(true);

  const initialAddonCategoriesLoadRef = useRef(false);
  useEffect(() => {
    if (initialAddonCategoriesLoadRef.current) {
      return;
    }
    initialAddonCategoriesLoadRef.current = true;
    void loadAddonCategories();
  }, [loadAddonCategories]);

  const addonItems = useMemo(() => items.filter((item) => item.isAddon), [items]);

  const categorizedAddons = useMemo(() => {
    const addonMap = new Map(addonItems.map((item) => [item.id, item]));
    const seenIds = new Set<string>();

    const grouped = addonCategories.map((category) => {
      const addons = category.addonIds
        .map((id) => {
          const addon = addonMap.get(id);
          if (addon) {
            seenIds.add(addon.id);
          }
          return addon;
        })
        .filter((addon): addon is typeof addonItems[number] => Boolean(addon));

      return { category, addons };
    });

    const uncategorized = addonItems.filter((item) => !seenIds.has(item.id));

    if (uncategorized.length > 0) {
      grouped.push({
        category: {
          id: '__uncategorized',
          name: 'Other add-ons',
          addonIds: [],
        },
        addons: uncategorized,
      });
    }

    if (grouped.length === 0 && addonItems.length > 0) {
      return [
        {
          category: {
            id: '__all',
            name: 'Available add-ons',
            addonIds: addonItems.map((item) => item.id),
          },
          addons: addonItems,
        },
      ];
    }

    return grouped.filter((entry) => entry.addons.length > 0);
  }, [addonCategories, addonItems]);

  const filteredAddons = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const results: typeof categorizedAddons = [];

    categorizedAddons.forEach((entry) => {
      const filteredByChoices = entry.addons.filter((addon) => {
        const matchesMeal = mealTypeFilter === 'all' || addon.mealType === mealTypeFilter;
        const matchesCategory = isVeg ? addon.category === 'Veg' : addon.category === 'Non-Veg';
        return matchesMeal && matchesCategory;
      });

      if (filteredByChoices.length === 0) {
        return;
      }

      if (!query) {
        results.push({ ...entry, addons: filteredByChoices });
        return;
      }

      const categoryName = (entry.category.name || '').toLowerCase();
      const matchesCategoryName = categoryName.includes(query);

      if (matchesCategoryName) {
        results.push({ ...entry, addons: filteredByChoices });
        return;
      }

      const matchingAddons = filteredByChoices.filter((addon) => {
        const name = addon.name?.toLowerCase() ?? '';
        const addonCategory = addon.category?.toLowerCase() ?? '';
        return name.includes(query) || addonCategory.includes(query);
      });

      if (matchingAddons.length > 0) {
        results.push({ ...entry, addons: matchingAddons });
      }
    });

    return results;
  }, [categorizedAddons, isVeg, mealTypeFilter, searchTerm]);

  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    const relevantIds = categorizedAddons.flatMap((entry) => entry.addons.map((addon) => addon.id));

    setQuantities((prev) => {
      const next: Record<string, number> = {};
      relevantIds.forEach((id) => {
        const cartQuantity = cartItems[id]?.quantity;
        if (cartQuantity !== undefined) {
          next[id] = cartQuantity;
        } else if (prev[id] !== undefined) {
          next[id] = prev[id];
        } else {
          next[id] = 0;
        }
      });
      return next;
    });
  }, [categorizedAddons, cartItems]);

  const adjustQuantity = useCallback((id: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[id] ?? 0;
      const updated = Math.max(0, current + delta);
      return { ...prev, [id]: updated };
    });
  }, []);

  const handleViewCart = useCallback(() => {
    if (!user) {
      openLoginModal(ROUTES.ADDONS_CART);
      addToast('Log in to review your add-on cart.', 'info');
      return;
    }
    navigate(ROUTES.ADDONS_CART);
  }, [addToast, navigate, openLoginModal, user]);

  const { requests: subscriptionRequests, loading: subscriptionLoading, loadRequests } = useSubscriptionRequestsStore();

  // Helper: check if user has an approved subscription for a given date
  const hasActiveSubscriptionForDate = useCallback((userId: string, dateKey: string) => {
    // Only consider approved subscriptions
    return subscriptionRequests.some(req =>
      req.userId === userId &&
      req.status === 'approved' &&
      req.startDate && req.endDate &&
      dateKey >= req.startDate.toISOString().slice(0, 10) &&
      dateKey <= req.endDate.toISOString().slice(0, 10)
    );
  }, [subscriptionRequests]);

  const handleAddToCart = useCallback(async (addonId: string) => {
    const selectedAddon = categorizedAddons
      .flatMap((entry) => entry.addons)
      .find((addon) => addon.id === addonId);

    if (!selectedAddon) {
      addToast('Unable to find that add-on right now. Please try again.', 'error');
      return;
    }

    const quantity = quantities[addonId] ?? 0;
    const isInCart = (cartItems[addonId]?.quantity ?? 0) > 0;
    if (quantity <= 0 && !isInCart) {
      addToast('Choose at least one quantity before adding to cart.', 'warning');
      return;
    }

    const cartDetails = {
      id: selectedAddon.id,
      name: selectedAddon.name,
      category: selectedAddon.category,
      mealType: selectedAddon.mealType,
      coins: selectedAddon.coins ?? 0,
      discountCoins: selectedAddon.discountCoins ?? 0,
      image: selectedAddon.imageBase64 ?? null,
      deliveryDate: getAddonDeliveryDateKey(new Date(), { cutoffHour: addonCutoffHour }),
    };

    if (!user) {
      setPendingCartRequest(cartDetails, quantity);
      openLoginModal(ROUTES.ADDONS);
      addToast('Log in to keep building your add-on cart.', 'info');
      return;
    }

    // Check for active subscription for the delivery date
    const deliveryDateKey = cartDetails.deliveryDate;
    if (!hasActiveSubscriptionForDate(user.uid, deliveryDateKey)) {
      // If subscriptions are not loaded, try to load and re-check
      if (!subscriptionLoading) {
        await loadRequests();
        if (!hasActiveSubscriptionForDate(user.uid, deliveryDateKey)) {
          addToast('You need an active subscription for this date to order add-ons.', 'warning');
          return;
        }
      } else {
        addToast('Checking your subscription status. Please try again in a moment.', 'info');
        return;
      }
    }

    const deliveryLabel = getAddonDeliveryLabel(new Date(), { locale: 'en-IN', cutoffHour: addonCutoffHour });
    addCartItem(cartDetails, quantity);
    if (quantity > 0) {
      addToast(`${selectedAddon.name} added to Addon Cart for ${deliveryLabel} (${quantity} items).`, 'success');
    } else {
      addToast(`${selectedAddon.name} removed from Addon Cart.`, 'info');
    }
  }, [addCartItem, addToast, addonCutoffHour, cartItems, categorizedAddons, openLoginModal, quantities, setPendingCartRequest, user, hasActiveSubscriptionForDate, subscriptionLoading, loadRequests]);

  const isLoading = (loading || categoriesLoading) && categorizedAddons.length === 0;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Topbar active="Addon" />

      <main className="flex-1 w-full">
        <section className="mt-20 max-w-7xl mx-auto px-6 lg:px-10 w-full">
          {addonHeroSrc ? (
            <div className="rounded-3xl overflow-hidden shadow-lg relative bg-black">
              <img
                src={addonHeroSrc}
                alt={addonHeroAlt}
                className="w-full h-64 sm:h-80 md:h-[520px] lg:h-[680px] object-cover"
                onError={(event) => {
                  const target = event.currentTarget as HTMLImageElement;
                  target.style.display = 'none';
                  const container = target.closest('div');
                  if (container) {
                    (container as HTMLElement).style.display = 'none';
                  }
                }}
              />
            </div>
          ) : null}
        </section>


        <section className="max-w-6xl w-full mx-auto px-6 lg:px-10 py-16 lg:py-20">
          <div className="w-full flex items-center gap-3 py-4 px-2">
            {/* Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-lg bg-[#510088] flex items-center justify-center text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Text */}
            <div className="flex flex-col">
              <span className="font-bold text-base">
                CHOOSE YOUR <span className="text-[#510088]">MEAL TIME AND COMBO</span>
              </span>
              <span className="text-slate-500 text-sm">
                Pick your customized combo with meal time
              </span>
            </div>
          </div>
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-4 sm:max-w-sm w-full">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search add-ons or categories"
                  className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 shadow-sm transition focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 w-full">
                  {/* Outer bordered container */}
                  <div className="border border-[#510088] rounded-4xl p-1 bg-white">
                    <div className="flex items-center gap-2 rounded-full p-1">
                      {MEAL_TYPE_FILTERS.map((option) => {
                        const isActive = mealTypeFilter === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setMealTypeFilter(option.value)}
                            className={`
              flex-1 px-4 py-2 text-sm font-medium rounded-full transition
              ${isActive
                                ? 'bg-[#510088] text-white shadow'
                                : 'text-slate-700'}
            `}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>



                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-4">
                    {/* Left label */}
                    <span className={`font-semibold ${isVeg ? "text-[#510088]" : "text-slate-700"}`}>
                      Veg
                    </span>
                    {/* Toggle container */}
                    <div
                      onClick={() => setIsVeg(!isVeg)}
                      className={`
            relative w-15 h-9 rounded-full cursor-pointer transition-all
            ${isVeg ? "bg-white border border-[#510088]" : "bg-[#510088]"}
          `}
                    >
                      {/* Sliding Knob */}
                      <div
                        className={`
              absolute top-1 left-1 w-7 h-7 rounded-full bg-orange-500 
              transition-all duration-300
              ${isVeg ? "translate-x-0" : "translate-x-6"}
            `}
                      ></div>
                    </div>
                    {/* Right label */}
                    <span className={`font-semibold ${!isVeg ? "text-[#510088]" : "text-slate-700"}`}>
                      Non-Veg
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8 rounded-2xl border border-[#510088]/40 bg-[#510088] px-5 py-8 text-sm text-white shadow-sm">
            <div className="font-semibold">
              Next add-on delivery is scheduled for {nextDeliveryLabel}
            </div>

            <p className="mt-1 text-white/90">
              Orders placed before{' '}
              <span className="font-semibold text-white">
                {addonCutoffTimeLabel} today
              </span>{' '}
              arrive the next day. After the cutoff, we automatically schedule the
              following delivery day so you never miss out.
            </p>

            {isCutoffPassed && (
              <p className="mt-2 font-medium text-white">
                You&apos;re past today&apos;s cutoff—orders placed now will arrive on{' '}
                {nextDeliveryLabel}.
              </p>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 py-16 text-center">
              <span className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Loading add-ons…</span>
              <p className="max-w-md text-sm text-slate-500">
                We&apos;re fetching the freshest add-ons from the Toven kitchen. Hang tight!
              </p>
            </div>
          ) : filteredAddons.length > 0 ? (
            <div className="flex flex-col gap-12">
              {filteredAddons.map(({ category, addons }) => (
                <div key={category.id} className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-4">
                        {/* Veg / Non-Veg Badge */}
                        {category.name === 'Veg' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-green-600 px-3 py-1 text-xs font-semibold text-green-600">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            VEG
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-500 px-3 py-1 text-xs font-semibold text-red-600">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            NON-VEG
                          </span>
                        )}
                      </div>

                    </div>
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{addons.length} add-ons</span>
                  </div>
                  <div className="relative">
                    <div className="overflow-x-auto pb-4">
                      <div className="flex w-full gap-4 px-3">

                        {addons.map((addon, index) => {
                          const palette = GRADIENT_PALETTE[index % GRADIENT_PALETTE.length];
                          const quantity = quantities[addon.id] ?? 0;
                          const inCartQuantity = cartItems[addon.id]?.quantity ?? 0;
                          const isInCart = inCartQuantity > 0;
                          const isActionDisabled = quantity === 0 && !isInCart;

                          return (
                            <div
                              key={addon.id}
                              className="w-[88%] sm:w-[48%] md:w-[32%] lg:w-[24%] flex-shrink-0"
                            >
                              <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg transition-transform duration-300 hover:scale-105 hover:shadow-2xl">

                                {/* Image */}
                                <div
                                  className="relative h-40 overflow-hidden rounded-t-3xl"
                                  style={{ backgroundImage: `linear-gradient(135deg, ${palette.from}, ${palette.to})` }}
                                >
                                  <img
                                    src={addon.imageBase64 || PLACEHOLDER_IMAGE}
                                    alt={addon.name}
                                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
                                  />
                                </div>

                                {/* Content */}
                                <div className="flex flex-1 flex-col gap-3 p-4">

                                  {/* Name + Meal Type */}
                                  <div className="flex flex-col gap-1">
                                    <h4 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                                      {addon.name}
                                      <span className="rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide bg-slate-100 text-slate-700">
                                        {addon.mealType} {/* Breakfast / Lunch / Dinner */}
                                      </span>
                                    </h4>

                                    {/* Coins Box */}
                                    <div className="mt-2 flex items-center gap-2">
                                      <span className="flex items-center gap-1 rounded-lg border border-yellow-400 bg-yellow-50 px-3 py-1 text-sm font-semibold text-yellow-700 text-center">
                                        {addon.coins} Coins
                                      </span>
                                      <span className="text-sm text-gray-600">
                                        Earn 5 coins
                                      </span>
                                    </div>

                                    <div className='mt-3 font-semibold text-sm text-gray-600'>
                                      Quantity: {quantity}
                                    </div>

                                    {/* In Cart Label */}
                                    {isInCart && (
                                      <span className="mt-1 inline-flex w-max items-center gap-1 rounded-full bg-emerald-50 px-2 py-[2px] text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                        In cart · {inCartQuantity}
                                      </span>
                                    )}
                                  </div>

                                  {/* Quantity Selector */}
                                  <div className=" flex justify-start items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-[2px] mx-auto">
                                    <button
                                      type="button"
                                      onClick={() => adjustQuantity(addon.id, -1)}
                                      className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-semibold text-slate-600 hover:bg-white hover:text-slate-900 transition"
                                    >
                                      −
                                    </button>
                                    <span className="text-base font-semibold text-slate-900">{quantity}</span>
                                    <button
                                      type="button"
                                      onClick={() => adjustQuantity(addon.id, 1)}
                                      className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-semibold text-slate-600 hover:bg-white hover:text-slate-900 transition"
                                    >
                                      +
                                    </button>
                                  </div>


                                  {/* Add to Cart Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleAddToCart(addon.id)}
                                    disabled={isActionDisabled}
                                    className={`mt-1 w-full rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-wide transition
    ${isActionDisabled
                                        ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                                        : 'text-white hover:opacity-90'
                                      }
  `}
                                    style={!isActionDisabled ? { backgroundColor: '#510088' } : {}}
                                  >
                                    {isInCart ? 'Update Cart' : `Add for ${nextDeliveryLabel}`}
                                  </button>


                                  {/* Delivery Info */}
                                  <p className="text-center text-xs font-medium uppercase tracking-wide text-slate-400 mt-1">
                                    Delivery · {nextDeliveryLabel}
                                  </p>

                                </div>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-16 bg-gradient-to-l from-white via-white/80 to-transparent sm:block" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 py-16 text-center">
              <span className="text-base font-semibold text-slate-700">No add-ons yet</span>
              <p className="max-w-md text-sm text-slate-500">
                Mark dishes as add-ons from the Food Items library to curate a delicious lineup for your subscribers.
              </p>
            </div>
          )}
        </section>
      </main>
      <Footer />
      {totalCartQuantity > 0 && (
        <button
          type="button"
          onClick={handleViewCart}
          className="fixed bottom-8 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-full bg-slate-900 px-7 py-4 text-base font-semibold text-white shadow-xl transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          <ShoppingCart size={22} />
          <span>Cart</span>
          <span className="rounded-full bg-white/20 px-2.5 py-1 text-sm font-bold">
            {totalCartQuantity}
          </span>
        </button>
      )}
    </div>
  );
};

export default AddonsPage;