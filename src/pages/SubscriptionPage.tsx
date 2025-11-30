import { useCallback, useEffect, useMemo, useState } from "react";
import Topbar from "../components/Topbar";
import Footer from "../components/Footer";
import { useCategoriesStore } from "../stores/categoriesStore";
import { useNavigate } from "react-router-dom";
import { useUserRoleStore } from "../stores/userRoleStore";
import { useLoginModalStore } from "../stores/loginModalStore";
import { usePlacementBanners } from "../stores/publicBannersStore";
import { getBannerAlt, getBannerImageSrc } from "../utils/bannerUtils";
import { Truck, X } from "lucide-react";

// ---------------------------------------------------------
// Page Component
// ---------------------------------------------------------
export default function SubscriptionPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [pincode, setPincode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean | null>(null);

  // Future-proof list
  const serviceablePincodes = ["641004"];

  const handleCheck = () => {
    if (!pincode.trim()) return;

    if (serviceablePincodes.includes(pincode.trim())) {
      setSuccess(true);
      setMessage("Delivery is available for your location!");
    } else {
      setSuccess(false);
      setMessage("Sorry, delivery is not available for this pincode.");
    }
  };

  // Utility constants
  const DEFAULT_ACCENT_FROM = "#8B5CF6";
  const DEFAULT_ACCENT_TO = "#6366F1";
  const DEFAULT_GRADIENT = `linear-gradient(135deg, ${DEFAULT_ACCENT_FROM}, ${DEFAULT_ACCENT_TO})`;

  const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

  const normalizeHex = (value?: string | null): string | null => {
    if (!value) return null;
    const trimmed = value.trim();
    return HEX_COLOR_REGEX.test(trimmed) ? trimmed : null;
  };

  const hexToRgba = (color: string | null | undefined, alpha: number): string | null => {
    if (!color) return null;
    let normalized = color.replace("#", "");
    if (normalized.length === 3) {
      normalized = normalized.split("").map((c) => c + c).join("");
    }
    if (normalized.length !== 6) return null;

    const red = parseInt(normalized.slice(0, 2), 16);
    const green = parseInt(normalized.slice(2, 4), 16);
    const blue = parseInt(normalized.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  };

  const buildGradient = (from?: string | null, to?: string | null): string => {
    const f = normalizeHex(from);
    const t = normalizeHex(to);

    if (f && t) return `linear-gradient(135deg, ${f}, ${t})`;
    if (f) return `linear-gradient(135deg, ${hexToRgba(f, 0.12)}, ${hexToRgba(f, 0.45)})`;
    if (t) return `linear-gradient(135deg, ${hexToRgba(t, 0.12)}, ${hexToRgba(t, 0.45)})`;

    return DEFAULT_GRADIENT;
  };

  const sanitizeDescription = (value?: string | null): string | null => {
    if (!value) return null;
    const t = value.trim();
    return t.length > 0 ? t : null;
  };

  const formatPriceLine = (price?: number | null): string | null => {
    if (typeof price === "number" && price > 0) {
      return `₹${price.toLocaleString("en-IN")} / meal`;
    }
    return null;
  };

  // Stores
  const categories = useCategoriesStore((state) => state.categories);
  const loading = useCategoriesStore((state) => state.loading);
  const loadCategories = useCategoriesStore((state) => state.loadCategories);

  const user = useUserRoleStore((state) => state.user);
  const openLoginModal = useLoginModalStore((state) => state.open);

  const navigate = useNavigate();
  const { banners: subscriptionBanners } = usePlacementBanners("subscription");

  const subscriptionHero = subscriptionBanners[0];
  const subscriptionHeroSrc = getBannerImageSrc(subscriptionHero);
  const subscriptionHeroAlt = getBannerAlt(subscriptionHero, "Subscription banner");

  useEffect(() => {
    if (!categories.length) {
      loadCategories();
    }
  }, [categories.length, loadCategories]);

  const cards = useMemo(() => {
    return categories
      .filter((c) => c.status === "Available")
      .map((category) => {
        return {
          id: category.id,
          title: category.name,
          description: sanitizeDescription(category.description),
          priceLine: formatPriceLine(category.price),
          image: category.imageBase64 ?? null,
          gradient: buildGradient(category.accentFrom, category.accentTo),
        };
      });
  }, [categories]);

  const handleOrderNow = useCallback(
    (categoryId: string) => {
      const target = `/subscription/checkout/${categoryId}`;
      if (user) {
        navigate(target, { state: { fromSubscription: true } });
      } else {
        openLoginModal(target);
      }
    },
    [navigate, openLoginModal, user]
  );

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Topbar active="Subscription" />

      <main className="flex-1 w-full">
        <section className="mt-20 max-w-7xl mx-auto px-6 lg:px-10 w-full">
          {subscriptionHeroSrc && (
            <div className="relative rounded-[2rem] overflow-hidden bg-white">
              <img
                src={subscriptionHeroSrc}
                alt={subscriptionHeroAlt}
                className="w-full h-64 sm:h-80 md:h-[520px] lg:h-[680px] object-cover"
              />
            </div>
          )}

          {/* Button */}
          <div className="mt-6 flex justify-center">
            <button
              className="rounded-full px-6 py-3 text-sm font-semibold text-white flex items-center gap-2 transition hover:bg-[#4B246E]"
              style={{ backgroundColor: "#5A2D82" }}
              onClick={() => setIsOpen(true)}
            >
              <Truck className="w-4 h-4" />
              Check Delivery Location
            </button>
          </div>

          {/* Popup Modal */}
          {isOpen && (
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => setIsOpen(false)}
            >
              <div
                className="bg-white rounded-2xl p-6 w-[90%] max-w-sm shadow-xl relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-5 h-5" />
                </button>

                <h2 className="text-lg font-semibold text-center text-[#5A2D82]">
                  Check Delivery Availability
                </h2>

                <input
                  type="text"
                  placeholder="Enter Pincode"
                  value={pincode}
                  onChange={(e) => {
                    setPincode(e.target.value);
                    setMessage(null);
                  }}
                  className="mt-5 w-full border rounded-md px-4 py-2 text-sm focus:ring-2 focus:ring-[#5A2D82]"
                />

                <button
                  onClick={handleCheck}
                  className="mt-4 w-full bg-[#5A2D82] text-white font-semibold rounded-md py-2 text-sm hover:bg-[#4B246E]"
                >
                  Check
                </button>

                {message && (
                  <p
                    className={`mt-4 text-center text-sm font-medium ${
                      success ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {message}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Subscription Cards */}
        <section className="max-w-6xl mx-auto px-6 lg:px-10 py-10 lg:py-20">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
              Pick a subscription that suits your rhythm
            </h2>
            <p className="text-sm text-slate-500 sm:text-base">
              Fresh menus every week, curated by chefs and nutritionists. Cancel or pause easily.
            </p>
          </div>

          {loading && cards.length === 0 && (
            <p className="text-center text-sm text-slate-400">Loading categories…</p>
          )}

          {!loading && cards.length === 0 && (
            <p className="text-center text-sm text-slate-400">No categories available.</p>
          )}

          <div className="grid gap-8 lg:gap-10">
            {cards.map((card) => (
              <article
                key={card.id}
                className="grid gap-6 rounded-3xl p-6 sm:p-8 lg:p-10 sm:grid-cols-[1fr_320px]"
                style={{ backgroundImage: card.gradient }}
              >
                <div className="flex flex-col gap-5">
                  {card.priceLine && (
                    <span className="inline-flex bg-white/70 px-3 py-1 rounded-full text-[11px] font-semibold">
                      {card.priceLine}
                    </span>
                  )}

                  <h3 className="text-2xl sm:text-3xl font-bold">{card.title}</h3>

                  {card.description && (
                    <p className="text-sm sm:text-base">{card.description}</p>
                  )}

                  <button
                    onClick={() => handleOrderNow(card.id)}
                    className="rounded-full bg-slate-900 px-5 py-2 text-xs text-white font-semibold hover:bg-slate-800"
                  >
                    Order Now
                  </button>
                </div>

                <div className="relative h-52 rounded-2xl overflow-hidden bg-white/70 sm:h-full">
                  {card.image ? (
                    <img src={card.image} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-slate-400">
                      Image not provided
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
