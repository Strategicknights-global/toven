import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Topbar from '../components/Topbar';
import Footer from '../components/Footer';
import Dialog from '../components/Dialog';
import { ROUTES } from '../AppRoutes';
import { useCategoriesStore } from '../stores/categoriesStore';
import { usePackagesStore } from '../stores/packagesStore';
import { useDayDiscountsStore } from '../stores/dayDiscountsStore';
import { useConfigStore } from '../stores/configStore';
import type { MealType } from '../schemas/FoodItemSchema';
import type { DayDiscountSchema } from '../schemas/DayDiscountSchema';
import { useToastStore } from '../stores/toastStore';
import { auth } from '../firebase';
import { CouponModel, DEFAULT_STUDENT_DISCOUNT_PERCENT, UserDeliveryLocationModel, UserGroupModel, UserModel } from '../firestore';
import type { CouponSchema } from '../schemas/CouponSchema';
import type { SubscriptionRequestCreateInput } from '../schemas/SubscriptionRequestSchema';
import type { GroupPolygon, MapCoordinate } from '../schemas/UserGroupSchema';
import { useSubscriptionRequestsStore } from '../stores/subscriptionRequestsStore';
import { useSubscriptionDepositStore } from '../stores/subscriptionDepositStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useUserRoleStore } from '../stores/userRoleStore';
import { useStudentVerificationStore } from '../stores/studentVerificationStore';
import type { UserDeliveryLocationSchema } from '../schemas/UserDeliveryLocationSchema';
import { getEarliestPauseDate, getPauseCutoffTimeLabel, isPauseWindowClosed } from '../utils/subscriptionPause';
import { resolveCutoffHour } from '../utils/timeWindow';
import { isPointInsideGroupPolygons, parseLatLngString } from '../utils/geo';

const DIET_OPTIONS = [
  {
    value: 'mixed',
    label: 'Mixed',
    description: 'Balanced rotation of vegetarian and non-vegetarian dishes.',
  },
  {
    value: 'pure-veg',
    label: 'Pure Veg',
    description: '100% vegetarian curation with seasonal specials.',
  },
] as const;

type DietOptionValue = typeof DIET_OPTIONS[number]['value'];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

type DurationOption = number;

type DurationOptionDescriptor = {
  key: string;
  dayCount: number;
  discount: DayDiscountSchema | null;
};

const MEAL_TYPE_ORDER: MealType[] = ['Breakfast', 'Lunch', 'Dinner'];

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #8B5CF6, #6366F1)';

const AUTH_ERROR_CODE = 'USER_NOT_AUTHENTICATED';

const SUBSCRIPTION_DEPOSIT_AMOUNT = 1200;
const SUBSCRIPTION_DEPOSIT_CURRENCY = 'INR';

type CouponEvaluation = {
  valid: boolean;
  discountAmount: number;
  reason: string | null;
  message: string | null;
};

type AppliedDiscount = {
  key: 'duration' | 'student';
  label: string;
  summary: string | null;
  amount: number;
};

const formatPercent = (value: number): string => {
  const normalized = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  if (Math.abs(normalized - Math.round(normalized)) < 0.01) {
    return `${Math.round(normalized)}%`;
  }
  return `${normalized.toFixed(1)}%`;
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (value: string): Date | null => {
  const [yearStr, monthStr, dayStr] = value.split('-');
  if (!yearStr || !monthStr || !dayStr) {
    return null;
  }
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null;
  }
  const result = new Date(year, month - 1, day);
  if (
    result.getFullYear() !== year
    || result.getMonth() !== month - 1
    || result.getDate() !== day
  ) {
    return null;
  }
  result.setHours(0, 0, 0, 0);
  return result;
};

const formatCurrency = (value: number): string => `₹${value.toLocaleString('en-IN')}`;

const formatDiscountSummary = (discount: DayDiscountSchema): string => {
  if (discount.discountType === 'percentage') {
    const formatted = discount.discountValue.toFixed(2).replace(/\.00$/, '');
    return `${formatted}% off`;
  }
  const formatted = discount.discountValue
    .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(/\.00$/, '');
  return `₹${formatted} off`;
};

const computeDiscountSavings = (discount: DayDiscountSchema, baseSubtotal: number): number => {
  if (baseSubtotal <= 0) {
    return 0;
  }
  if (discount.discountType === 'percentage') {
    return Math.max(0, (baseSubtotal * discount.discountValue) / 100);
  }
  return Math.min(baseSubtotal, discount.discountValue);
};

type CoverageCheckStatus = 'loading' | 'no-location' | 'no-coverage' | 'outside' | 'inside' | 'error';

const sanitizeCoveragePolygons = (
  polygons: GroupPolygon[] | undefined | null,
  fallbackPrefix: string,
): GroupPolygon[] => {
  if (!Array.isArray(polygons) || polygons.length === 0) {
    return [];
  }

  return polygons
    .map((polygon, index) => {
      const rawPoints = Array.isArray(polygon.points) ? polygon.points : [];
      const points = rawPoints
        .map((point): MapCoordinate | null => {
          const lat = typeof point.lat === 'number' ? point.lat : Number(point.lat);
          const lng = typeof point.lng === 'number' ? point.lng : Number(point.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return null;
          }
          return { lat, lng };
        })
        .filter((value): value is MapCoordinate => Boolean(value));

      if (points.length < 3) {
        return null;
      }

      const sanitized: GroupPolygon = {
        id: polygon.id ? String(polygon.id) : `${fallbackPrefix}-polygon-${index}`,
        name: typeof polygon.name === 'string' && polygon.name.trim().length > 0 ? polygon.name : undefined,
        points,
      };

      return sanitized;
    })
    .filter((value): value is GroupPolygon => Boolean(value));
};

const SubscriptionCheckoutPage: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const addToast = useToastStore((state) => state.addToast);
  const createSubscriptionRequest = useSubscriptionRequestsStore((state) => state.createRequest);
  const submittingRequest = useSubscriptionRequestsStore((state) => state.submitting);
  const authUser = useUserRoleStore((state) => state.user);
  const authUserType = useUserRoleStore((state) => state.userType);
  const userVerifications = useStudentVerificationStore((state) => state.userVerifications);
  const loadUserVerifications = useStudentVerificationStore((state) => state.loadUserVerifications);

  const deposit = useSubscriptionDepositStore((state) => state.deposit);
  const depositLoading = useSubscriptionDepositStore((state) => state.loading);
  const depositSubmitting = useSubscriptionDepositStore((state) => state.submitting);
  const loadDepositForUser = useSubscriptionDepositStore((state) => state.loadDepositForUser);
  const recordDeposit = useSubscriptionDepositStore((state) => state.recordDeposit);
  const resetDepositState = useSubscriptionDepositStore((state) => state.reset);

  const categories = useCategoriesStore((state) => state.categories);
  const categoriesLoading = useCategoriesStore((state) => state.loading);
  const loadCategories = useCategoriesStore((state) => state.loadCategories);

  const packages = usePackagesStore((state) => state.packages);
  const packagesLoading = usePackagesStore((state) => state.loading);
  const loadPackages = usePackagesStore((state) => state.loadPackages);

  const dayDiscounts = useDayDiscountsStore((state) => state.discounts);
  const dayDiscountsLoading = useDayDiscountsStore((state) => state.loading);
  const loadDayDiscounts = useDayDiscountsStore((state) => state.loadDiscounts);

  const [dietPreference, setDietPreference] = useState<DietOptionValue>('mixed');
  const [duration, setDuration] = useState<DurationOption | null>(null);
  const [selectedDurationDiscountId, setSelectedDurationDiscountId] = useState<string | null>(null);
  const [activeMealType, setActiveMealType] = useState<MealType>('Breakfast');
  const [selectedPackages, setSelectedPackages] = useState<Partial<Record<MealType, string>>>({});
  const [startDate, setStartDate] = useState<string>('');
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    today.setDate(1);
    return today;
  });
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponSchema | null>(null);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<CouponSchema[]>([]);
  const [availableCouponsLoading, setAvailableCouponsLoading] = useState(false);
  const [availableCouponsError, setAvailableCouponsError] = useState<string | null>(null);
  const [isTermsOpen, setTermsOpen] = useState(false);
  const [isDepositDialogOpen, setDepositDialogOpen] = useState(false);
  const [showDepositQRDialog, setShowDepositQRDialog] = useState(false);
  const [showCheckoutQRDialog, setShowCheckoutQRDialog] = useState(false);
  const [depositReference, setDepositReference] = useState('');
  const [depositInvoiceFile, setDepositInvoiceFile] = useState<File | null>(null);
  const [depositInvoicePreview, setDepositInvoicePreview] = useState<string | null>(null);
  const [depositInvoiceError, setDepositInvoiceError] = useState<string | null>(null);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [paymentProofError, setPaymentProofError] = useState<string | null>(null);
  const [deliveryLocations, setDeliveryLocations] = useState<UserDeliveryLocationSchema[]>([]);
  const [deliveryLocationsLoading, setDeliveryLocationsLoading] = useState(false);
  const [selectedDeliveryLocationId, setSelectedDeliveryLocationId] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [coveragePolygons, setCoveragePolygons] = useState<GroupPolygon[]>([]);
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [coverageError, setCoverageError] = useState<string | null>(null);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  const config = useConfigStore((state) => state.config);
  const configLoading = useConfigStore((state) => state.loading);
  const configLoaded = useConfigStore((state) => state.loaded);
  const loadConfig = useConfigStore((state) => state.loadConfig);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!configLoaded && !configLoading) {
      void loadConfig();
    }
  }, [configLoaded, configLoading, loadConfig]);

  const resolveUserDetails = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error(AUTH_ERROR_CODE);
    }

    let fullName = currentUser.displayName?.trim() ?? '';
    let phone: string | null = null;
    let email = currentUser.email ?? null;
    let customerShortId: string | null = null;

    try {
      const userRecord = await UserModel.findById(currentUser.uid);
      if (userRecord) {
        if (typeof userRecord.fullName === 'string' && userRecord.fullName.trim().length > 0) {
          fullName = userRecord.fullName.trim();
        }
        if (typeof userRecord.phone === 'string' && userRecord.phone.trim().length > 0) {
          phone = userRecord.phone.trim();
        }
        if (typeof userRecord.email === 'string' && userRecord.email.trim().length > 0) {
          email = userRecord.email.trim();
        }
        if (typeof userRecord.customerId === 'string' && userRecord.customerId.trim().length > 0) {
          customerShortId = userRecord.customerId.trim();
        }
      }
    } catch (error) {
      console.error('Failed to resolve user profile for subscription request', error);
    }

    if (!fullName) {
      if (email && email.includes('@')) {
        fullName = email.split('@')[0] || 'Customer';
      } else {
        fullName = 'Customer';
      }
    }

    return {
      userId: currentUser.uid,
      fullName,
      phone,
      email,
      customerShortId,
    } as const;
  }, []);

  useEffect(() => {
    const isCheckoutRoute = location.pathname.startsWith('/subscription/checkout');
    if (!isCheckoutRoute) {
      return;
    }
    if (!categoryId) {
      navigate(ROUTES.SUBSCRIPTION, { replace: true });
    }
  }, [categoryId, navigate, location.pathname]);

  useEffect(() => {
    if (!categories.length) {
      void loadCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.length]);

  useEffect(() => {
    if (!packages.length) {
      void loadPackages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packages.length]);

  useEffect(() => {
    if (!dayDiscounts.length) {
      void loadDayDiscounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayDiscounts.length]);

  useEffect(() => {
    if (!configLoaded && !configLoading) {
      void loadConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configLoaded, configLoading]);

  useEffect(() => {
    if (authUser?.uid) {
      void loadDepositForUser({ userId: authUser.uid });
    } else {
      resetDepositState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.uid]);

  useEffect(() => {
    if (!authUser?.uid) {
      return;
    }
    if (authUserType !== 'Student') {
      return;
    }
    void loadUserVerifications(authUser.uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.uid, authUserType]);

  useEffect(() => {
    if (!authUser?.uid) {
      setDeliveryLocations([]);
      setSelectedDeliveryLocationId('');
      setDeliveryLocationsLoading(false);
      return;
    }

    let cancelled = false;
    setDeliveryLocationsLoading(true);
    (async () => {
      try {
        const locations = await UserDeliveryLocationModel.findByUserId(authUser.uid);
        if (cancelled) {
          return;
        }
        setDeliveryLocations(locations);
        setSelectedDeliveryLocationId((prev) => {
          if (
            prev
            && locations.some((location) => location.id === prev && location.isDefault)
          ) {
            return prev;
          }
          const preferred = locations.find((location) => location.isDefault) ?? null;
          return preferred?.id ?? '';
        });
      } catch (error) {
        console.error('Failed to load delivery locations for subscription checkout', error);
        if (!cancelled) {
          setDeliveryLocations([]);
          setSelectedDeliveryLocationId('');
        }
      } finally {
        if (!cancelled) {
          setDeliveryLocationsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUser?.uid]);

  useEffect(() => {
    let cancelled = false;
    setCoverageLoading(true);

    (async () => {
      try {
        const groups = await UserGroupModel.findAll();
        if (cancelled) {
          return;
        }

        const sanitized = groups.flatMap((group, groupIndex) =>
          sanitizeCoveragePolygons(group.coveragePolygons, group.id ?? `group-${groupIndex}`),
        );

        setCoveragePolygons(sanitized);
        setCoverageError(null);
      } catch (error) {
        console.error('Failed to load delivery coverage polygons for subscription checkout', error);
        if (!cancelled) {
          setCoveragePolygons([]);
          setCoverageError('We could not verify delivery coverage right now. Please try again later.');
        }
      } finally {
        if (!cancelled) {
          setCoverageLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setAvailableCouponsLoading(true);
    (async () => {
      try {
        const coupons = await CouponModel.findAll();
        if (cancelled) {
          return;
        }
        const now = new Date();
        const activeCoupons = coupons.filter((coupon) => {
          if (!coupon.active) {
            return false;
          }
          if (coupon.validFrom && coupon.validFrom > now) {
            return false;
          }
          if (coupon.validUntil && coupon.validUntil < now) {
            return false;
          }
          return true;
        });
        setAvailableCoupons(activeCoupons);
        setAvailableCouponsError(null);
      } catch (error) {
        console.error('Failed to load coupons for subscription checkout', error);
        if (!cancelled) {
          setAvailableCoupons([]);
          setAvailableCouponsError('We couldn\'t load available coupons. Try again later.');
        }
      } finally {
        if (!cancelled) {
          setAvailableCouponsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const category = useMemo(
    () => categories.find((item) => item.id === categoryId) ?? null,
    [categories, categoryId],
  );

  const filteredPackages = useMemo(() => {
    if (!categoryId) {
      return [];
    }
    return packages.filter(
      (pkg) => pkg.categoryId === categoryId && pkg.status === 'Available',
    );
  }, [packages, categoryId]);

  const availableMealTypes = useMemo(() => {
    const set = new Set<MealType>();
    filteredPackages.forEach((pkg) => set.add(pkg.mealType));
    return MEAL_TYPE_ORDER.filter((type) => set.has(type));
  }, [filteredPackages]);

  useEffect(() => {
    if (!availableMealTypes.length) {
      return;
    }
    setActiveMealType((prev) => (availableMealTypes.includes(prev) ? prev : availableMealTypes[0]));
  }, [availableMealTypes]);

  const packagesForActiveMealType = useMemo(() => {
    return filteredPackages.filter((pkg) => pkg.mealType === activeMealType);
  }, [filteredPackages, activeMealType]);

  useEffect(() => {
    if (!packagesForActiveMealType.length) {
      setSelectedPackages((prev) => {
        if (!(activeMealType in prev)) {
          return prev;
        }
        const next = { ...prev } as Partial<Record<MealType, string>>;
        delete next[activeMealType];
        return next;
      });
      return;
    }

    setSelectedPackages((prev) => {
      const currentSelection = prev[activeMealType];
      if (!currentSelection) {
        return prev;
      }
      const exists = packagesForActiveMealType.some((pkg) => pkg.id === currentSelection);
      if (exists) {
        return prev;
      }
      const next = { ...prev } as Partial<Record<MealType, string>>;
      delete next[activeMealType];
      return next;
    });
  }, [packagesForActiveMealType, activeMealType]);

  const packagesById = useMemo(() => {
    const map = new Map<string, typeof filteredPackages[number]>();
    filteredPackages.forEach((pkg) => {
      map.set(pkg.id, pkg);
    });
    return map;
  }, [filteredPackages]);

  const allPackagesById = useMemo(() => {
    const map = new Map<string, typeof packages[number]>();
    packages.forEach((pkg) => {
      map.set(pkg.id, pkg);
    });
    return map;
  }, [packages]);

  const availablePackageIds = useMemo(() => {
    const set = new Set<string>();
    filteredPackages.forEach((pkg) => {
      set.add(pkg.id);
    });
    return set;
  }, [filteredPackages]);

  const selectedPackageIds = useMemo(
    () => Object.values(selectedPackages).filter((id): id is string => Boolean(id)),
    [selectedPackages],
  );

  const selectedDeliveryLocation = useMemo(() => {
    if (!selectedDeliveryLocationId) {
      return null;
    }
    return deliveryLocations.find((location) => location.id === selectedDeliveryLocationId) ?? null;
  }, [deliveryLocations, selectedDeliveryLocationId]);

  const selectedDeliveryCoordinate = useMemo<MapCoordinate | null>(() => {
    if (!selectedDeliveryLocation?.coordinates) {
      return null;
    }
    return parseLatLngString(selectedDeliveryLocation.coordinates) ?? null;
  }, [selectedDeliveryLocation?.coordinates]);

  const isSelectedLocationWithinCoverage = useMemo(() => {
    if (!selectedDeliveryCoordinate) {
      return false;
    }
    if (coveragePolygons.length === 0) {
      return false;
    }
    return isPointInsideGroupPolygons(selectedDeliveryCoordinate, coveragePolygons);
  }, [selectedDeliveryCoordinate, coveragePolygons]);

  const coverageCheckStatus = useMemo<CoverageCheckStatus>(() => {
    if (coverageLoading) {
      return 'loading';
    }
    if (coverageError) {
      return 'error';
    }
    if (!selectedDeliveryLocation) {
      return 'no-location';
    }
    if (!selectedDeliveryCoordinate) {
      return 'no-location';
    }
    if (coveragePolygons.length === 0) {
      return 'no-coverage';
    }
    return isSelectedLocationWithinCoverage ? 'inside' : 'outside';
  }, [
    coverageLoading,
    coverageError,
    selectedDeliveryLocation,
    selectedDeliveryCoordinate,
    coveragePolygons,
    isSelectedLocationWithinCoverage,
  ]);

  const ensureLocationWithinCoverage = useCallback(() => {
    switch (coverageCheckStatus) {
      case 'loading':
        addToast('We are still verifying delivery coverage. Please try again in a moment.', 'info');
        return false;
      case 'error':
        addToast(coverageError ?? 'We could not verify delivery coverage right now. Please try again later.', 'error');
        return false;
      case 'no-location':
        addToast('Set a default delivery location inside our coverage area before continuing.', 'warning');
        return false;
      case 'no-coverage':
        addToast('Delivery coverage areas are not configured yet. Please contact support for assistance.', 'warning');
        return false;
      case 'outside':
        addToast('Your selected delivery location is outside our delivery coverage area. Update your address to continue.', 'error');
        return false;
      case 'inside':
      default:
        return true;
    }
  }, [addToast, coverageCheckStatus, coverageError]);

  const hasApprovedStudentVerification = useMemo(() => {
    if (!authUser?.uid) {
      return false;
    }
    return userVerifications.some(
      (verification) => verification.userId === authUser.uid && verification.status === 'approved',
    );
  }, [authUser?.uid, userVerifications]);

  const isStudentDiscountEligible = authUserType === 'Student' && hasApprovedStudentVerification;

  const studentDiscountPercentSetting = useMemo(() => {
    const raw = config?.studentDiscountPercent;
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return Math.min(Math.max(raw, 0), 100);
    }
    return DEFAULT_STUDENT_DISCOUNT_PERCENT;
  }, [config?.studentDiscountPercent]);

  const perDayPackageTotal = useMemo(() => {
    return selectedPackageIds.reduce((sum, pkgId) => {
      const pkg = packagesById.get(pkgId);
      if (!pkg) {
        return sum;
      }
      return sum + pkg.price;
    }, 0);
  }, [packagesById, selectedPackageIds]);

  const discountMatchesCategory = useCallback(
    (discount: DayDiscountSchema) => {
      if (discount.scope === 'all') {
        return true;
      }
      if (discount.scope === 'categories') {
        if (!categoryId) {
          return false;
        }
        const categoryIds = discount.categoryIds ?? [];
        if (categoryIds.length === 0) {
          return false;
        }
        
        const matchType = discount.matchType ?? 'all';
        if (matchType === 'all') {
          // All categories in the discount must include the current category
          // For a single category subscription, we check if it's in the list
          return categoryIds.includes(categoryId);
        } else {
          // At least one category in the discount must match the current category
          return categoryIds.includes(categoryId);
        }
      }
      if (discount.scope === 'packages') {
        if (availablePackageIds.size === 0) {
          return false;
        }
        const packageIds = discount.packageIds ?? [];
        return packageIds.some((id) => availablePackageIds.has(id));
      }
      return false;
    },
    [availablePackageIds, categoryId],
  );

  const discountMatchesSelection = useCallback(
    (discount: DayDiscountSchema) => {
      if (discount.scope === 'all') {
        return true;
      }
      if (discount.scope === 'categories') {
        if (!categoryId) {
          return false;
        }
        const categoryIds = discount.categoryIds ?? [];
        if (categoryIds.length === 0) {
          return false;
        }
        
        const matchType = discount.matchType ?? 'all';
        if (matchType === 'all') {
          // All categories in the discount must include the current category
          // For a single category subscription, we check if it's in the list
          return categoryIds.includes(categoryId);
        } else {
          // At least one category in the discount must match the current category
          return categoryIds.includes(categoryId);
        }
      }
      if (discount.scope === 'packages') {
        if (selectedPackageIds.length === 0) {
          return false;
        }
        const packageIds = discount.packageIds ?? [];
        if (packageIds.length === 0) {
          return false;
        }
        
        const matchType = discount.matchType ?? 'all';
        if (matchType === 'all') {
          // User must have selected EXACTLY the packages in the discount's packageIds list
          // No more, no less - exact match required
          if (selectedPackageIds.length !== packageIds.length) {
            return false;
          }
          return packageIds.every((id) => selectedPackageIds.includes(id));
        } else {
          // User must have selected at least ONE package in the discount's packageIds list
          return selectedPackageIds.some((id) => packageIds.includes(id));
        }
      }
      return false;
    },
    [categoryId, selectedPackageIds],
  );

  const dayDiscountsByDayCount = useMemo(() => {
    const map = new Map<number, DayDiscountSchema[]>();
    dayDiscounts.forEach((discount) => {
      const normalizedCount = Number.isFinite(discount.dayCount)
        ? Math.max(1, Math.round(discount.dayCount))
        : 0;
      if (!normalizedCount) {
        return;
      }
      if (!discountMatchesCategory(discount)) {
        return;
      }
      const existing = map.get(normalizedCount) ?? [];
      existing.push({ ...discount, dayCount: normalizedCount });
      map.set(normalizedCount, existing);
    });
    map.forEach((list, dayCount) => {
      list.sort((a, b) => a.label.localeCompare(b.label));
      map.set(dayCount, list);
    });
    return map;
  }, [dayDiscounts, discountMatchesCategory]);

  const pickBestDiscount = useCallback(
    (discounts: DayDiscountSchema[], baseSubtotal: number): DayDiscountSchema | null => {
      if (!discounts.length) {
        return null;
      }
      let best: DayDiscountSchema | null = null;
      let bestSavings = Number.NEGATIVE_INFINITY;
      discounts.forEach((discount) => {
        const normalizedSavings = baseSubtotal > 0
          ? computeDiscountSavings(discount, baseSubtotal)
          : discount.discountValue;
        if (normalizedSavings > bestSavings) {
          best = discount;
          bestSavings = normalizedSavings;
          return;
        }
        if (
          best
          && Math.abs(normalizedSavings - bestSavings) < 0.0001
          && discount.label.localeCompare(best.label) < 0
        ) {
          best = discount;
          bestSavings = normalizedSavings;
        }
      });
      return best;
    },
    [],
  );

  const selectedDurationDiscount = useMemo(() => {
    if (duration === null) {
      return null;
    }
    const entries = dayDiscountsByDayCount.get(duration) ?? [];
    if (selectedDurationDiscountId) {
      const match = entries.find((discount) => discount.id === selectedDurationDiscountId);
      if (match && discountMatchesSelection(match)) {
        return match;
      }
      return null;
    }
    const applicable = entries.filter(discountMatchesSelection);
    if (applicable.length === 0) {
      return null;
    }
    const baseSubtotal = perDayPackageTotal > 0 ? perDayPackageTotal * duration : 0;
    return pickBestDiscount(applicable, baseSubtotal);
  }, [dayDiscountsByDayCount, discountMatchesSelection, duration, perDayPackageTotal, pickBestDiscount, selectedDurationDiscountId]);

  const durationOptions = useMemo<DurationOptionDescriptor[]>(() => {
    const entries: DurationOptionDescriptor[] = [];

    dayDiscountsByDayCount.forEach((discounts, dayCount) => {
      const sortedDiscounts = [...discounts].sort((a, b) => a.label.localeCompare(b.label));

      // Only add a standard plan option if there are NO discounts for this day count at all
      if (discounts.length === 0) {
        entries.push({
          key: `base-${dayCount}`,
          dayCount,
          discount: null,
        });
      }

      sortedDiscounts.forEach((discount) => {
        entries.push({
          key: `discount-${discount.id}`,
          dayCount,
          discount,
        });
      });
    });

    entries.sort((a, b) => {
      if (a.dayCount !== b.dayCount) {
        return a.dayCount - b.dayCount;
      }
      if (a.discount && !b.discount) {
        return 1;
      }
      if (!a.discount && b.discount) {
        return -1;
      }
      if (a.discount && b.discount) {
        return a.discount.label.localeCompare(b.discount.label);
      }
      return 0;
    });

    return entries;
  }, [dayDiscountsByDayCount]);

  useEffect(() => {
    if (!durationOptions.length) {
      if (duration !== null) {
        setDuration(null);
      }
      if (selectedDurationDiscountId !== null) {
        setSelectedDurationDiscountId(null);
      }
      return;
    }

    const hasSelection = durationOptions.some((option) => (
      option.dayCount === duration
      && (option.discount?.id ?? null) === selectedDurationDiscountId
    ));

    if (!hasSelection) {
      const fallback = durationOptions.find((option) => (
        option.discount ? discountMatchesSelection(option.discount) : true
      ))
        ?? durationOptions[0];

      const nextDuration = fallback.dayCount;
      const nextDiscountId = fallback.discount && discountMatchesSelection(fallback.discount)
        ? fallback.discount.id
        : null;

      setDuration(nextDuration);
      setSelectedDurationDiscountId(nextDiscountId);
    }
  }, [durationOptions, duration, selectedDurationDiscountId, discountMatchesSelection]);

  useEffect(() => {
    if (duration === null || !selectedDurationDiscountId) {
      return;
    }
    const entries = dayDiscountsByDayCount.get(duration) ?? [];
    const match = entries.find((discount) => discount.id === selectedDurationDiscountId);
    if (!match || !discountMatchesSelection(match)) {
      setSelectedDurationDiscountId(null);
    }
  }, [duration, selectedDurationDiscountId, dayDiscountsByDayCount, discountMatchesSelection]);

  const pricingSummary = useMemo(() => {
    const effectiveDuration = duration ?? 0;
    const subtotal = effectiveDuration > 0 ? perDayPackageTotal * effectiveDuration : 0;
    const activeDiscount = duration !== null ? selectedDurationDiscount : null;

    const durationDiscountAmount = activeDiscount ? computeDiscountSavings(activeDiscount, subtotal) : 0;
    const subtotalAfterDuration = Math.max(0, subtotal - durationDiscountAmount);

    const effectiveStudentDiscountPercent = isStudentDiscountEligible ? studentDiscountPercentSetting : 0;
    const studentDiscountAmount =
      subtotalAfterDuration > 0 && effectiveStudentDiscountPercent > 0
        ? (subtotalAfterDuration * effectiveStudentDiscountPercent) / 100
        : 0;

    const totalDiscountAmount = durationDiscountAmount + studentDiscountAmount;
    const total = Math.max(0, subtotalAfterDuration - studentDiscountAmount);

    const durationDiscountSummary = activeDiscount ? formatDiscountSummary(activeDiscount) : null;

    const appliedDiscounts: AppliedDiscount[] = [];
    if (durationDiscountAmount > 0) {
      appliedDiscounts.push({
        key: 'duration',
        label: activeDiscount?.label ?? 'Plan savings',
        summary: durationDiscountSummary,
        amount: durationDiscountAmount,
      });
    }
    if (studentDiscountAmount > 0) {
      appliedDiscounts.push({
        key: 'student',
        label: 'Student benefit',
        summary: `${formatPercent(effectiveStudentDiscountPercent)} off`,
        amount: studentDiscountAmount,
      });
    }

    const automaticDiscountSummary = appliedDiscounts.length > 0
      ? appliedDiscounts
        .map((discount) => discount.summary ?? discount.label)
        .filter(Boolean)
        .join(' + ')
      : null;

    const discountPercent = subtotal > 0 ? (totalDiscountAmount / subtotal) * 100 : 0;

    return {
      subtotal,
      discountPercent,
      discountAmount: totalDiscountAmount,
      total,
      discountLabel: activeDiscount?.label ?? null,
      discountSummary: durationDiscountSummary,
      discountType: activeDiscount?.discountType ?? null,
      discountValue: activeDiscount?.discountValue ?? null,
      durationDiscountAmount,
      studentDiscountAmount,
      appliedDiscounts,
      automaticDiscountSummary,
    };
  }, [
    duration,
    perDayPackageTotal,
    selectedDurationDiscount,
    isStudentDiscountEligible,
    studentDiscountPercentSetting,
  ]);

  const selectionSummary = useMemo(
    () =>
      availableMealTypes.map((mealType) => {
        const pkgId = selectedPackages[mealType];
        const pkg = pkgId ? packagesById.get(pkgId) ?? null : null;
        return { mealType, pkg };
      }),
    [availableMealTypes, selectedPackages, packagesById],
  );

  const selectedMealCount = useMemo(
    () => selectionSummary.filter(({ pkg }) => Boolean(pkg)).length,
    [selectionSummary],
  );

  const today = useMemo(() => {
    const value = new Date(currentTime);
    value.setHours(0, 0, 0, 0);
    return value;
  }, [currentTime]);

  const pauseCutoffHour = useMemo(
    () => resolveCutoffHour(config?.subscriptionPauseCutoffHour),
    [config?.subscriptionPauseCutoffHour],
  );

  const pauseWindowClosed = useMemo(
    () => isPauseWindowClosed(currentTime, { cutoffHour: pauseCutoffHour }),
    [currentTime, pauseCutoffHour],
  );

  const earliestStartDate = useMemo(
    () => getEarliestPauseDate(currentTime, { cutoffHour: pauseCutoffHour }),
    [currentTime, pauseCutoffHour],
  );

  const earliestStartDateIso = useMemo(() => formatDateKey(earliestStartDate), [earliestStartDate]);

  const earliestStartRelativeLabel = useMemo(() => {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    if (earliestStartDate.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    }
    if (earliestStartDate.getTime() === dayAfterTomorrow.getTime()) {
      return 'Day after tomorrow';
    }
    return null;
  }, [earliestStartDate, today]);

  const selectedStartDate = useMemo(() => parseDateKey(startDate), [startDate]);

  useEffect(() => {
    if (selectedStartDate && selectedStartDate < earliestStartDate) {
      setStartDate(earliestStartDateIso);
    }
  }, [earliestStartDate, earliestStartDateIso, selectedStartDate]);

  const selectedEndDate = useMemo(() => {
    if (!selectedStartDate || duration === null) {
      return null;
    }
    const end = new Date(selectedStartDate);
    end.setDate(end.getDate() + Math.max(0, duration - 1));
    end.setHours(0, 0, 0, 0);
    return end;
  }, [selectedStartDate, duration]);

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    [],
  );

  const formattedStartDate = useMemo(
    () => (selectedStartDate ? dateFormatter.format(selectedStartDate) : null),
    [dateFormatter, selectedStartDate],
  );

  const formattedEndDate = useMemo(
    () => (selectedEndDate ? dateFormatter.format(selectedEndDate) : null),
    [dateFormatter, selectedEndDate],
  );

  const earliestStartDateLabel = useMemo(
    () => dateFormatter.format(earliestStartDate),
    [dateFormatter, earliestStartDate],
  );

  const earliestStartDescription = useMemo(() => {
    if (earliestStartRelativeLabel) {
      return `${earliestStartRelativeLabel} (${earliestStartDateLabel})`;
    }
    return earliestStartDateLabel;
  }, [earliestStartDateLabel, earliestStartRelativeLabel]);

  const pauseCutoffTimeLabel = useMemo(
    () => getPauseCutoffTimeLabel(pauseCutoffHour),
    [pauseCutoffHour],
  );

  const earliestStartHelperText = useMemo(() => {
    if (pauseWindowClosed) {
      return `It is past ${pauseCutoffTimeLabel} today, so the earliest start date available is ${earliestStartDescription}.`;
    }
    return `Earliest start date available is ${earliestStartDescription}. Finish checkout before ${pauseCutoffTimeLabel} today to begin tomorrow.`;
  }, [earliestStartDescription, pauseCutoffTimeLabel, pauseWindowClosed]);

  const hasStartDate = Boolean(selectedStartDate);

  useEffect(() => {
    if (selectedStartDate) {
      setCalendarMonth((prev) => {
        if (
          prev.getFullYear() === selectedStartDate.getFullYear()
          && prev.getMonth() === selectedStartDate.getMonth()
        ) {
          return prev;
        }
        return new Date(selectedStartDate.getFullYear(), selectedStartDate.getMonth(), 1);
      });
      return;
    }

    setCalendarMonth((prev) => {
      if (
        prev.getFullYear() === today.getFullYear()
        && prev.getMonth() === today.getMonth()
      ) {
        return prev;
      }
      return new Date(today.getFullYear(), today.getMonth(), 1);
    });
  }, [selectedStartDate, today]);

  const calendarMonthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-IN', {
        month: 'long',
        year: 'numeric',
      }).format(calendarMonth),
    [calendarMonth],
  );

  const earliestMonth = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
    [today],
  );

  const isPrevMonthDisabled = useMemo(
    () =>
      calendarMonth.getFullYear() === earliestMonth.getFullYear()
      && calendarMonth.getMonth() === earliestMonth.getMonth(),
    [calendarMonth, earliestMonth],
  );

  const calendarDays = useMemo(() => {
    const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const startDay = monthStart.getDay();
    const firstDisplayed = new Date(monthStart);
    firstDisplayed.setDate(firstDisplayed.getDate() - startDay);

    return Array.from({ length: 42 }, (_, index) => {
      const current = new Date(firstDisplayed);
      current.setDate(firstDisplayed.getDate() + index);
      current.setHours(0, 0, 0, 0);

      const isCurrentMonth = current.getMonth() === calendarMonth.getMonth();
      const isDisabled = current < earliestStartDate;
      const isSelected = selectedStartDate ? current.getTime() === selectedStartDate.getTime() : false;
      const isWithinRange = selectedStartDate && selectedEndDate
        ? current >= selectedStartDate && current <= selectedEndDate
        : false;
      const isToday = current.getTime() === today.getTime();
      const isEarliestStart = current.getTime() === earliestStartDate.getTime();

      return {
        iso: formatDateKey(current),
        label: current.getDate(),
        isCurrentMonth,
        isDisabled,
        isSelected,
        isWithinRange,
        isToday,
        isEarliestStart,
      };
    });
  }, [calendarMonth, earliestStartDate, selectedEndDate, selectedStartDate, today]);

  const isLoading = categoriesLoading || packagesLoading;

  const heroGradient = useMemo(() => {
    if (!category) {
      return DEFAULT_GRADIENT;
    }
    const from = category.accentFrom ?? category.accentTo ?? '#8B5CF6';
    const to = category.accentTo ?? category.accentFrom ?? '#6366F1';
    return `linear-gradient(135deg, ${from}, ${to})`;
  }, [category]);

  const hasAnySelection = selectedMealCount > 0;
  const checkoutTerms = (config?.checkoutTerms ?? '').trim();

  const evaluateCoupon = useCallback((coupon: CouponSchema): CouponEvaluation => {
    const now = new Date();
    if (!coupon.active) {
      return {
        valid: false,
        discountAmount: 0,
        reason: 'This coupon is currently inactive.',
        message: null,
      };
    }

    if (coupon.validFrom && coupon.validFrom > now) {
      const formatted = new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(coupon.validFrom);
      return {
        valid: false,
        discountAmount: 0,
        reason: `Available starting ${formatted}.`,
        message: null,
      };
    }

    if (coupon.validUntil && coupon.validUntil < now) {
      const formatted = new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(coupon.validUntil);
      return {
        valid: false,
        discountAmount: 0,
        reason: `Expired on ${formatted}.`,
        message: null,
      };
    }

    if (!hasAnySelection) {
      return {
        valid: false,
        discountAmount: 0,
        reason: 'Add at least one meal slot before applying a coupon.',
        message: null,
      };
    }

    const baseSubtotal = pricingSummary.subtotal;
    const totalBeforeCoupon = Math.max(0, pricingSummary.total);

    if (totalBeforeCoupon <= 0) {
      return {
        valid: false,
        discountAmount: 0,
        reason: 'Your plan total is already zero.',
        message: null,
      };
    }

    if (coupon.minOrderValue != null && baseSubtotal < coupon.minOrderValue) {
      return {
        valid: false,
        discountAmount: 0,
        reason: `Minimum order of ${formatCurrency(Math.round(coupon.minOrderValue))} required.`,
        message: null,
      };
    }

    const requiredPackageIds = (coupon.requiredPackageIds ?? []).filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
    if (requiredPackageIds.length > 0) {
      const selectedSet = new Set(selectedPackageIds);
      const missing = requiredPackageIds.filter((id) => !selectedSet.has(id));
      if (missing.length > 0) {
        const missingNames = missing
          .map((id) => allPackagesById.get(id)?.name)
          .filter((name): name is string => Boolean(name));
        return {
          valid: false,
          discountAmount: 0,
          reason: missingNames.length > 0
            ? `Add ${missingNames.join(', ')} to your plan to unlock this coupon.`
            : 'Add the required meal packages to unlock this coupon.',
          message: null,
        };
      }
    }

    if (coupon.requireStudentVerification) {
      if (authUserType !== 'Student') {
        return {
          valid: false,
          discountAmount: 0,
          reason: 'This coupon is reserved for verified student accounts.',
          message: null,
        };
      }
      if (!hasApprovedStudentVerification) {
        return {
          valid: false,
          discountAmount: 0,
          reason: 'Complete your student verification to use this coupon.',
          message: null,
        };
      }
    }

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = totalBeforeCoupon * (coupon.discountValue / 100);
    } else {
      discountAmount = coupon.discountValue;
    }

    discountAmount = Math.max(0, Math.min(totalBeforeCoupon, discountAmount));

    if (discountAmount <= 0) {
      return {
        valid: false,
        discountAmount: 0,
        reason: 'This coupon does not affect your current total.',
        message: null,
      };
    }

    const roundedDiscount = Math.round(discountAmount);
    const message = coupon.discountType === 'percentage'
      ? `${formatPercent(coupon.discountValue)} off • saving ${formatCurrency(roundedDiscount)}`
      : `${formatCurrency(roundedDiscount)} off applied`;

    return {
      valid: true,
      discountAmount,
      reason: null,
      message,
    };
  }, [
    allPackagesById,
    authUserType,
    hasAnySelection,
    hasApprovedStudentVerification,
    pricingSummary.subtotal,
    pricingSummary.total,
    selectedPackageIds,
  ]);

  const couponEvaluation = useMemo<CouponEvaluation>(() => {
    if (!appliedCoupon) {
      return {
        valid: false,
        discountAmount: 0,
        reason: null,
        message: null,
      };
    }
    return evaluateCoupon(appliedCoupon);
  }, [appliedCoupon, evaluateCoupon]);

  const couponDiscountAmount = couponEvaluation.valid ? couponEvaluation.discountAmount : 0;
  const totalAfterCoupon = Math.max(0, pricingSummary.total - couponDiscountAmount);
  const hasCouponApplied = Boolean(appliedCoupon && couponEvaluation.valid);

  const evaluatedAvailableCoupons = useMemo(() => {
    if (!availableCoupons.length) {
      return [] as { coupon: CouponSchema; evaluation: CouponEvaluation }[];
    }
    return availableCoupons
      .map((coupon) => ({
        coupon,
        evaluation: evaluateCoupon(coupon),
      }))
      .sort((a, b) => a.coupon.code.localeCompare(b.coupon.code));
  }, [availableCoupons, evaluateCoupon]);

  useEffect(() => {
    if (!appliedCoupon) {
      return;
    }
    if (!couponEvaluation.valid) {
      if (couponEvaluation.reason) {
        addToast(`Coupon ${appliedCoupon.code} removed: ${couponEvaluation.reason}`, 'warning');
        setCouponError(couponEvaluation.reason);
      }
      const lastCode = appliedCoupon.code;
      setAppliedCoupon(null);
      setCouponMessage(null);
      setCouponCodeInput(lastCode);
    }
  }, [appliedCoupon, couponEvaluation.valid, couponEvaluation.reason, addToast]);

  useEffect(() => {
    if (!appliedCoupon) {
      return;
    }
    if (couponEvaluation.valid && couponEvaluation.message) {
      setCouponMessage(couponEvaluation.message);
    }
  }, [appliedCoupon, couponEvaluation.valid, couponEvaluation.message]);

  const canProceed = hasAnySelection && hasStartDate && duration !== null && !deliveryLocationsLoading;
  const depositPaid = useMemo(() => {
    if (!authUser?.uid || !deposit) {
      return false;
    }
    return deposit.userId === authUser.uid;
  }, [authUser?.uid, deposit]);

  const depositPaidAtLabel = useMemo(() => {
    if (!depositPaid || !deposit?.paidAt) {
      return null;
    }
    return deposit.paidAt.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [depositPaid, deposit]);

  const handleCloseTerms = () => {
    setTermsOpen(false);
  };

  const handleAcceptTerms = useCallback(async () => {
    if (submittingRequest) {
      return;
    }

    if (!categoryId || !category) {
      addToast('This subscription category is unavailable. Please choose a different plan.', 'error');
      return;
    }

    if (duration === null || !selectedStartDate || !selectedEndDate) {
      addToast('Please select your start date and duration before continuing.', 'warning');
      return;
    }

    if (selectedStartDate < earliestStartDate) {
      addToast(`Choose a start date on or after ${earliestStartDescription}.`, 'warning');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      addToast('Please sign in to continue with your subscription checkout.', 'warning');
      return;
    }

    let latestDeposit = deposit;
    try {
      if (!latestDeposit || latestDeposit.userId !== currentUser.uid) {
        latestDeposit = await loadDepositForUser({ userId: currentUser.uid });
      }
    } catch (error) {
      console.error('Failed to refresh subscription deposit before submission', error);
      addToast('We couldn’t verify your deposit just yet. Please try again in a moment.', 'error');
      return;
    }

    if (!latestDeposit) {
      addToast(`A one-time ${formatCurrency(SUBSCRIPTION_DEPOSIT_AMOUNT)} deposit is required before submitting your subscription.`, 'warning');
      setTermsOpen(false);
      setDepositDialogOpen(true);
      return;
    }

    const selectionPayload = selectionSummary.flatMap(({ mealType, pkg }) => {
      if (!pkg) {
        return [];
      }
      return [{
        mealType,
        packageId: pkg.id,
        packageName: pkg.name,
        pricePerDay: pkg.price,
        totalPrice: pkg.price * duration,
      }];
    });

    if (!selectionPayload.length) {
      addToast('Select at least one meal package to continue.', 'warning');
      return;
    }

    if (deliveryLocationsLoading) {
      addToast('Delivery locations are still loading. Please wait a moment.', 'warning');
      return;
    }

    if (!selectedDeliveryLocation) {
      addToast('Set a default delivery location in your profile before continuing.', 'warning');
      return;
    }

    if (!ensureLocationWithinCoverage()) {
      return;
    }

    if (!paymentProofFile || !paymentProofPreview) {
      setPaymentProofError('Payment proof screenshot is required to proceed with checkout.');
      addToast('Please upload a payment proof screenshot to continue.', 'warning');
      return;
    }

    setTermsOpen(false);

    try {
      const { userId, fullName, phone, email, customerShortId } = await resolveUserDetails();

      const requestPayload: SubscriptionRequestCreateInput = {
        userId,
        customerShortId: customerShortId ?? undefined,
        userName: fullName,
        userEmail: email ?? null,
        userPhone: phone ?? null,
        categoryId,
        categoryName: category.name,
        dietPreference,
        durationDays: duration,
        startDate: selectedStartDate,
        endDate: selectedEndDate,
        selections: selectionPayload,
        deliveryLocationId: selectedDeliveryLocation?.id ?? null,
        deliveryLocationName: selectedDeliveryLocation?.locationName ?? null,
        deliveryLocationAddress: selectedDeliveryLocation?.address ?? null,
        deliveryLocationCoordinates: selectedDeliveryLocation?.coordinates ?? null,
        deliveryLocationLandmark: selectedDeliveryLocation?.landmark ?? null,
        deliveryLocationContactName: selectedDeliveryLocation?.contactName ?? null,
        deliveryLocationContactPhone: selectedDeliveryLocation?.contactPhone ?? null,
        paymentProofImageBase64: paymentProofPreview ?? null,
        paymentProofFileName: paymentProofFile?.name ?? null,
        summary: {
          durationDays: duration,
          subtotal: pricingSummary.subtotal,
          discountPercent: pricingSummary.discountPercent,
          discountAmount: pricingSummary.discountAmount,
          couponCode: appliedCoupon?.code ?? null,
          couponDiscountAmount,
          totalPayable: totalAfterCoupon,
        },
      };

      await createSubscriptionRequest(requestPayload);
      navigate(ROUTES.ADMIN_SUBSCRIPTION_REQUESTS, { replace: true });
    } catch (error) {
      if (error instanceof Error && error.message === AUTH_ERROR_CODE) {
        addToast('Your session expired. Please sign in again to submit your request.', 'error');
      } else {
        console.error('Failed to submit subscription request', error);
        setTermsOpen(true);
      }
    }
  }, [
    submittingRequest,
    categoryId,
    category,
    duration,
    selectedStartDate,
    selectedEndDate,
    selectionSummary,
    resolveUserDetails,
    dietPreference,
    pricingSummary.subtotal,
    pricingSummary.discountPercent,
    pricingSummary.discountAmount,
    appliedCoupon,
    couponDiscountAmount,
    totalAfterCoupon,
    createSubscriptionRequest,
    navigate,
    addToast,
    deposit,
    loadDepositForUser,
    deliveryLocationsLoading,
    selectedDeliveryLocation,
    ensureLocationWithinCoverage,
    earliestStartDate,
    earliestStartDescription,
    paymentProofFile,
    paymentProofPreview,
  ]);

  const handleCouponInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.toUpperCase();
    setCouponCodeInput(value);
    if (couponError) {
      setCouponError(null);
    }
    if (!appliedCoupon) {
      setCouponMessage(null);
    }
  };

  const handleApplyCoupon = useCallback(async (code?: string) => {
    if (couponLoading) {
      return;
    }

    const sourceCode = typeof code === 'string' ? code : couponCodeInput;
    const trimmed = sourceCode.trim().toUpperCase();
    if (!trimmed) {
      setCouponError('Enter a coupon code to apply.');
      return;
    }

    setCouponCodeInput(trimmed);

    if (appliedCoupon && appliedCoupon.code === trimmed) {
      setCouponError(null);
      setCouponMessage(`Coupon ${trimmed} is already applied.`);
      return;
    }

    if (!hasAnySelection) {
      setCouponError('Add at least one meal slot before applying a coupon.');
      return;
    }

    setCouponError(null);
    setCouponMessage(null);
    setCouponLoading(true);

    try {
      const coupon = await CouponModel.findByCode(trimmed);
      if (!coupon) {
        setCouponError('We couldn\'t find that coupon.');
        return;
      }

      const evaluation = evaluateCoupon(coupon);
      if (!evaluation.valid) {
        setCouponError(evaluation.reason ?? 'This coupon cannot be applied right now.');
        return;
      }

      setAppliedCoupon(coupon);
      setCouponCodeInput(coupon.code);
      setCouponMessage(evaluation.message ?? null);
      addToast(`Coupon ${coupon.code} applied!`, 'success');
    } catch (error) {
      console.error('Failed to apply coupon', error);
      setCouponError('Failed to verify this coupon. Please try again.');
    } finally {
      setCouponLoading(false);
    }
  }, [couponLoading, couponCodeInput, appliedCoupon, hasAnySelection, evaluateCoupon, addToast]);

  const handleRemoveCoupon = () => {
    if (!appliedCoupon) {
      return;
    }
    addToast(`Coupon ${appliedCoupon.code} removed.`, 'info');
    setAppliedCoupon(null);
    setCouponMessage(null);
    setCouponError(null);
    setCouponCodeInput('');
  };

  const handleCouponSuggestionClick = useCallback((code: string) => {
    void handleApplyCoupon(code);
  }, [handleApplyCoupon]);

  const togglePackageMenu = useCallback((packageId: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [packageId]: !prev[packageId],
    }));
  }, []);

  const handleSelectPackage = (mealType: MealType, packageId: string) => {
    setSelectedPackages((prev) => {
      if (prev[mealType] === packageId) {
        const next = { ...prev } as Partial<Record<MealType, string>>;
        delete next[mealType];
        return next;
      }
      return { ...prev, [mealType]: packageId };
    });
  };

  const handleSegmentChange = (mealType: MealType) => {
    setActiveMealType(mealType);
  };

  const handleProceed = async () => {
    if (submittingRequest) {
      addToast('We are submitting your subscription request. Please wait a moment.', 'info');
      return;
    }

    if (!availableMealTypes.length) {
      addToast('No meal slots are available for this plan yet.', 'warning');
      return;
    }

    if (!hasAnySelection) {
      addToast('Pick at least one meal package before continuing.', 'warning');
      return;
    }

    if (duration === null) {
      addToast('Choose a commitment duration to continue.', 'warning');
      return;
    }

    if (!hasStartDate) {
      addToast('Choose when you want your deliveries to start before continuing.', 'warning');
      return;
    }

    if (selectedStartDate && selectedStartDate < earliestStartDate) {
      addToast(`Choose a start date on or after ${earliestStartDescription}.`, 'warning');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      addToast('Please sign in to continue with your subscription checkout.', 'warning');
      return;
    }

    if (deliveryLocationsLoading) {
      addToast('Delivery locations are still loading. Please wait a moment.', 'warning');
      return;
    }

    if (!selectedDeliveryLocation) {
      addToast('Set a default delivery location in your profile before continuing.', 'warning');
      return;
    }

    if (!ensureLocationWithinCoverage()) {
      return;
    }

    let depositRecord = deposit;
    if (!depositRecord || depositRecord.userId !== currentUser.uid) {
      try {
        depositRecord = await loadDepositForUser({ userId: currentUser.uid });
      } catch (error) {
        console.error('Failed to verify deposit before checkout', error);
        return;
      }
    }

    if (!depositRecord) {
      setDepositDialogOpen(true);
      addToast(`A one-time ${formatCurrency(SUBSCRIPTION_DEPOSIT_AMOUNT)} deposit is required before placing your first subscription.`, 'info');
      return;
    }

    setTermsOpen(true);
  };

  const handleDepositInvoiceChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      const message = 'Invoice file must be smaller than 5MB.';
      setDepositInvoiceError(message);
      addToast(message, 'error');
      return;
    }

    setDepositInvoiceFile(file);
    setDepositInvoiceError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setDepositInvoicePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }, [addToast]);

  const handleRemoveDepositInvoice = useCallback(() => {
    setDepositInvoiceFile(null);
    setDepositInvoicePreview(null);
    setDepositInvoiceError(null);
  }, []);

  const handleCloseDepositDialog = useCallback(() => {
    if (depositSubmitting) {
      return;
    }
    setDepositDialogOpen(false);
    setDepositReference('');
    handleRemoveDepositInvoice();
  }, [depositSubmitting, handleRemoveDepositInvoice]);

  const handleConfirmDeposit = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      addToast('Please sign in to confirm your deposit.', 'warning');
      return;
    }

    if (deliveryLocationsLoading) {
      addToast('Delivery locations are still loading. Please wait a moment.', 'warning');
      return;
    }

    if (!selectedDeliveryLocation) {
      addToast('Set a default delivery location in your profile before confirming your deposit.', 'warning');
      return;
    }

    if (!ensureLocationWithinCoverage()) {
      return;
    }

    if (!depositInvoicePreview) {
      const message = 'Upload your deposit invoice before continuing.';
      setDepositInvoiceError(message);
      addToast(message, 'warning');
      return;
    }

    try {
      await recordDeposit({
        userId: currentUser.uid,
        amount: SUBSCRIPTION_DEPOSIT_AMOUNT,
        currency: SUBSCRIPTION_DEPOSIT_CURRENCY,
        paymentReference: depositReference.trim() ? depositReference.trim() : null,
        invoiceImageBase64: depositInvoicePreview,
        invoiceFileName: depositInvoiceFile?.name ?? null,
      });
      await loadDepositForUser({ userId: currentUser.uid });
      addToast('Deposit confirmed! Continue to review the terms.', 'success');
      setDepositDialogOpen(false);
      setDepositReference('');
      handleRemoveDepositInvoice();
      setTermsOpen(true);
    } catch (error) {
      console.error('Failed to record subscription deposit', error);
    }
  }, [
    addToast,
    depositInvoiceFile,
    depositInvoicePreview,
    depositReference,
    recordDeposit,
    loadDepositForUser,
    handleRemoveDepositInvoice,
    deliveryLocationsLoading,
    selectedDeliveryLocation,
    ensureLocationWithinCoverage,
  ]);

  const handlePaymentProofChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      const message = 'Payment proof file must be smaller than 5MB.';
      setPaymentProofError(message);
      addToast(message, 'error');
      return;
    }

    setPaymentProofFile(file);
    setPaymentProofError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setPaymentProofPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }, [addToast]);

  const handleRemovePaymentProof = useCallback(() => {
    setPaymentProofFile(null);
    setPaymentProofPreview(null);
    setPaymentProofError(null);
  }, []);

  const handleBack = () => {
    navigate('/subscription');
  };

  const dietLabel = useMemo(
    () => DIET_OPTIONS.find((option) => option.value === dietPreference)?.label ?? 'Mixed',
    [dietPreference],
  );

  const durationLabel = useMemo(() => {
    if (duration === null) {
      return '—';
    }
    if (selectedDurationDiscount) {
      return `${selectedDurationDiscount.label} (${duration} days)`;
    }
    return `${duration} days`;
  }, [duration, selectedDurationDiscount]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Topbar active="Subscription" />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ backgroundImage: heroGradient }}
          >
            <div className="absolute inset-0 bg-black/30" />
          </div>
          <div className="relative z-10 px-6 pt-24 pb-16 sm:pt-28 sm:pb-18 lg:px-10 lg:pt-32 lg:pb-20">
            <div className="max-w-4xl text-white">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/25"
              >
                <span aria-hidden>←</span>
                Back to plans
              </button>
              <h1 className="mt-6 text-3xl font-bold sm:text-4xl">
                {category?.name ?? 'Personalise your subscription'}
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-white/80 sm:text-base">
                {category?.description
                  ?? 'Lock in your meals, choose your vibe, and we\'ll handle the daily delivery hustle.'}
              </p>
            </div>
          </div>
        </section>

        <div className="relative z-10 -mt-12 pb-16">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 lg:px-10">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
              <div className="space-y-8">
                <div className="rounded-2xl border border-white/60 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">1. Dial in your diet</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Tell us how you like your weekly lineup crafted.
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Step 1
                    </span>
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {DIET_OPTIONS.map((option) => {
                      const isActive = option.value === dietPreference;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setDietPreference(option.value)}
                          className={`flex h-full flex-col rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-white ${isActive
                              ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                            }`}
                        >
                          <span className="text-sm font-semibold uppercase tracking-wide">{option.label}</span>
                          <span className={`mt-2 text-sm ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                            {option.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">2. Curate your daily lineup</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Tap through each meal slot to choose the package that fits your routine.
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Step 2
                    </span>
                  </div>
                  {availableMealTypes.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                      {isLoading
                        ? 'Loading meal slots for this plan…'
                        : "We're still plating menus for this plan. Check back soon!"}
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {availableMealTypes.map((mealType) => {
                          const isActive = mealType === activeMealType;
                          return (
                            <button
                              key={mealType}
                              type="button"
                              onClick={() => handleSegmentChange(mealType)}
                              className={`rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-white ${isActive
                                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                                }`}
                            >
                              {mealType}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-6 grid gap-4 md:grid-cols-2">
                        {packagesForActiveMealType.length === 0 ? (
                          <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                            {isLoading
                              ? `Loading ${activeMealType.toLowerCase()} packages…`
                              : 'No packages are live for this meal slot yet.'}
                          </div>
                        ) : (
                          packagesForActiveMealType.map((pkg) => {
                            const isSelected = selectedPackages[activeMealType] === pkg.id;
                            const menuDescription = typeof pkg.menuDescription === 'string' ? pkg.menuDescription.trim() : '';
                            const hasMenuDescription = menuDescription.length > 0;
                            const previewImage = typeof pkg.imageBase64 === 'string' && pkg.imageBase64.trim().length > 0
                              ? pkg.imageBase64.trim()
                              : null;
                            const isMenuExpanded = Boolean(expandedMenus[pkg.id]);
                            const menuSectionId = `package-${pkg.id}-menu`;

                            return (
                              <div
                                key={pkg.id}
                                role="button"
                                tabIndex={0}
                                aria-pressed={isSelected}
                                onClick={() => handleSelectPackage(activeMealType, pkg.id)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    handleSelectPackage(activeMealType, pkg.id);
                                  }
                                }}
                                className={`relative flex h-full flex-col rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${isSelected
                                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                                  }`}
                              >
                                {isSelected && (
                                  <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-900 shadow">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    Selected
                                  </span>
                                )}
                                <div
                                  className={`overflow-hidden rounded-xl border ${isSelected
                                      ? 'border-white/20 bg-white/10'
                                      : 'border-slate-100 bg-slate-50'
                                    }`}
                                >
                                  {previewImage ? (
                                    <img
                                      src={previewImage}
                                      alt={`${pkg.name} preview`}
                                      className="h-36 w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-36 w-full items-center justify-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                      Menu image coming soon
                                    </div>
                                  )}
                                </div>
                                <div className="mt-4 flex items-start justify-between gap-4">
                                  <div>
                                    <span className="text-xs uppercase tracking-wide text-slate-500">
                                      {pkg.mealType}
                                    </span>
                                    <h3 className={`mt-1 text-lg font-semibold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                      {pkg.name}
                                    </h3>
                                  </div>
                                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${isSelected ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                    {formatCurrency(pkg.price)} / meal
                                  </span>
                                </div>
                               
                                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                  {/* <p className={`text-xs ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                                    {hasMenuDescription
                                      ? 'Tap View Menu to see the full chef lineup.'
                                      : 'We’ll share menu details closer to your start date.'}
                                  </p> */}
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      togglePackageMenu(pkg.id);
                                    }}
                                    onKeyDown={(event) => event.stopPropagation()}
                                    aria-expanded={isMenuExpanded}
                                    aria-controls={menuSectionId}
                                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 ${isSelected
                                        ? 'border-white/30 bg-white/10 text-white hover:bg-white/20'
                                        : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500 hover:text-slate-900'
                                      }`}
                                  >
                                    {isMenuExpanded ? 'Hide menu' : 'View menu'}
                                    <ChevronDown
                                      className={`h-3.5 w-3.5 transition-transform ${isMenuExpanded ? 'rotate-180' : ''}`}
                                      aria-hidden
                                    />
                                  </button>
                                </div>
                                {isMenuExpanded && (
                                  <div
                                    id={menuSectionId}
                                    role="region"
                                    aria-label={`${pkg.name} menu preview`}
                                    className={`mt-4 rounded-xl border p-3 text-xs transition ${isSelected
                                        ? 'border-white/20 bg-white/10 text-white'
                                        : 'border-slate-200 bg-slate-50 text-slate-600'
                                      }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="font-semibold uppercase tracking-wide">Menu</p>
                                      
                                    </div>
                                    <div className="mt-3 max-h-36 space-y-3 overflow-y-auto pr-1">
                                      {hasMenuDescription ? (
                                        <p className="whitespace-pre-wrap leading-tight">
                                          {menuDescription}
                                        </p>
                                      ) : (
                                        <p className="text-xs opacity-80">Menu details will be announced soon.</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="mt-6">
                        <p className="text-sm text-slate-500">
                          {selectedPackages[activeMealType]
                            ? 'Locked in. Tap the card again if you want to clear it, or switch meal slots using the tabs above.'
                            : 'Pick a package to start building your lineup.'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <div className="rounded-2xl border border-white/60 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">3. Pick your commitment</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Choose how many days you want the kitchen on call.
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Step 3
                    </span>
                  </div>
                  <div className="mt-5">
                    {dayDiscountsLoading ? (
                      <p className="text-sm text-slate-500">Loading day-count offers…</p>
                    ) : durationOptions.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                        No commitment options are available yet. Add a day-count discount in the admin to unlock this step.
                      </div>
                    ) : (() => {
                      const applicableOptions = durationOptions.map((option) => {
                        const isApplicable = option.discount ? discountMatchesSelection(option.discount) : true;
                        return { option, isApplicable };
                      });
                      const hasApplicableOption = applicableOptions.some((item) => item.isApplicable);
                      
                      if (!hasApplicableOption) {
                        return (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                            Your package selection doesn't match any available plans. Try selecting different meal options.
                          </div>
                        );
                      }
                      
                      return (
                        <div className="flex flex-wrap gap-3">
                          {applicableOptions.map(({ option, isApplicable }) => {
                            if (!isApplicable) {
                              return null;
                            }
                            
                            const optionDayCount = option.dayCount;
                            const activeDiscountId = option.discount?.id ?? null;
                            const isActive = optionDayCount === duration && activeDiscountId === selectedDurationDiscountId;
                            
                            const label = option.discount?.label ?? `${optionDayCount} days`;
                            let subtitle: string;
                            if (option.discount) {
                              subtitle = `${optionDayCount} days \u2022 ${formatDiscountSummary(option.discount)}`;
                            } else {
                              subtitle = `${optionDayCount} days \u2022 Standard plan`;
                            }
                            const subtitleClass = isActive
                              ? 'text-white/80'
                              : option.discount
                                ? 'text-orange-600'
                                : 'text-slate-500';
                            return (
                              <button
                                key={option.key}
                                type="button"
                                onClick={() => {
                                  setDuration(optionDayCount);
                                  setSelectedDurationDiscountId(option.discount?.id ?? null);
                                }}
                                className={`rounded-2xl border px-4 py-2 text-left text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-white ${isActive
                                    ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                                  }`}
                              >
                                <span className="block text-base font-semibold">
                                  {label}
                                </span>
                                <span className={`mt-0.5 block text-xs ${subtitleClass}`}>
                                  {subtitle}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/60 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">4. Choose your start date</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Pick when you want deliveries to begin. We\'ll sync your lineup with this date.
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Step 4
                    </span>
                  </div>
                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setCalendarMonth((prev) => {
                            if (
                              prev.getFullYear() === earliestMonth.getFullYear()
                              && prev.getMonth() === earliestMonth.getMonth()
                            ) {
                              return prev;
                            }
                            return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
                          });
                        }}
                        disabled={isPrevMonthDisabled}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-400 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Previous month"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-sm font-semibold text-slate-900">{calendarMonthLabel}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-400 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-white"
                        aria-label="Next month"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {WEEKDAY_LABELS.map((label) => (
                        <span key={label} className="py-1">
                          {label}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {calendarDays.map((day) => {
                        const variantClass = day.isSelected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : day.isWithinRange
                            ? 'border-slate-900/90 bg-slate-900/90 text-white'
                            : !day.isCurrentMonth
                              ? 'border-transparent bg-transparent text-slate-400 hover:bg-slate-100'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-100';

                        return (
                          <button
                            key={day.iso}
                            type="button"
                            onClick={() => {
                              if (day.isDisabled) {
                                return;
                              }
                              setStartDate(day.iso);
                            }}
                            disabled={day.isDisabled}
                            aria-pressed={day.isSelected}
                            className={`flex h-14 w-full flex-col items-center justify-center gap-1 rounded-xl border text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-transparent ${variantClass} ${day.isToday && !day.isSelected ? 'ring-2 ring-slate-300' : ''
                              }`}
                          >
                            <span>{day.label}</span>
                            {day.isEarliestStart && !day.isDisabled ? (
                              <span className={`text-[10px] font-semibold uppercase ${day.isSelected ? 'text-white/80' : 'text-emerald-600'}`}>
                                Earliest
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                    {hasStartDate ? (
                      <div className="space-y-1 text-sm text-slate-500">
                        <p>
                          Kicking off on <span className="font-semibold text-slate-900">{formattedStartDate}</span>.
                        </p>
                        {formattedEndDate && formattedEndDate !== formattedStartDate && duration !== null && (
                          <p>
                            Runs through <span className="font-semibold text-slate-900">{formattedEndDate}</span> ({duration} days).
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Haven't decided yet? You can lock this in now and tweak it later.
                      </p>
                    )}
                    <p className="text-xs text-slate-400">
                      {earliestStartHelperText}
                    </p>
                    {dayDiscountsLoading ? (
                      <p className="text-xs text-slate-400">Loading available day offers…</p>
                    ) : null}
                  </div>
                </div>


              </div>

              <aside className="flex flex-col gap-6">
                <div className="rounded-2xl border border-white/60 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">Your subscription summary</h2>
                  <div className="mt-5 space-y-4 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Plan</span>
                      <span className="font-medium text-slate-900">{category?.name ?? '—'}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Diet preference</span>
                      <span className="font-medium text-slate-900">{dietLabel}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Duration</span>
                      <span className="font-medium text-slate-900">{durationLabel}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Start date</span>
                      <span className="font-medium text-slate-900">{formattedStartDate ?? '—'}</span>
                    </div>
                    {formattedEndDate && (
                      <div className="flex justify-between text-slate-600">
                        <span>End date</span>
                        <span className="font-medium text-slate-900">{formattedEndDate}</span>
                      </div>
                    )}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Delivery drop
                      </span>
                      {deliveryLocationsLoading ? (
                        <p className="text-sm text-slate-500">Loading your saved delivery locations…</p>
                      ) : selectedDeliveryLocation ? (
                        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                          <p className="flex items-center gap-2 font-semibold text-slate-800">
                            <MapPin className="h-4 w-4 text-slate-500" />
                            {selectedDeliveryLocation.locationName ?? 'Saved location'}
                          </p>
                          {selectedDeliveryLocation.address ? (
                            <p className="whitespace-pre-wrap text-slate-600">
                              {selectedDeliveryLocation.address}
                            </p>
                          ) : null}
                          <div className="grid gap-1 text-xs text-slate-500">
                            {selectedDeliveryLocation.contactName ? (
                              <p>Contact: {selectedDeliveryLocation.contactName}</p>
                            ) : null}
                            {selectedDeliveryLocation.contactPhone ? (
                              <p>Phone: {selectedDeliveryLocation.contactPhone}</p>
                            ) : null}
                          </div>
                          {coverageLoading ? (
                            <p className="text-xs text-slate-500">Validating coverage…</p>
                          ) : coverageCheckStatus === 'inside' ? (
                            <p className="text-xs font-medium text-emerald-600">Inside current delivery coverage.</p>
                          ) : coverageCheckStatus === 'outside' ? (
                            <p className="text-xs font-medium text-red-600">
                              This address is outside our delivery coverage. Update your saved location to continue.
                            </p>
                          ) : coverageCheckStatus === 'no-coverage' ? (
                            <p className="text-xs font-medium text-amber-600">
                              Coverage areas are not configured yet. Contact support if this persists.
                            </p>
                          ) : coverageCheckStatus === 'no-location' ? (
                            <p className="text-xs font-medium text-amber-600">
                              This saved address is missing map coordinates. Update it from your profile.
                            </p>
                          ) : coverageCheckStatus === 'error' ? (
                            <p className="text-xs font-medium text-red-600">
                              {coverageError ?? 'We could not verify coverage right now. Try again shortly.'}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-700">
                          <p className="font-semibold text-amber-800">No default delivery address</p>
                          <p className="mt-1 text-amber-700">
                            Set a default delivery location from your <Link to="/profile" className="font-semibold text-amber-800 underline">profile</Link> before completing checkout.
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Meal slots
                      </span>
                      {selectionSummary.length === 0 ? (
                        <p className="text-sm text-slate-500">No meal slots are available for this plan yet.</p>
                      ) : (
                        <ul className="space-y-2">
                          {selectionSummary.map(({ mealType, pkg }) => (
                            <li key={mealType} className="flex justify-between gap-4 text-slate-600">
                              <span className="flex items-center gap-2 font-medium text-slate-700">
                                {pkg ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
                                ) : (
                                  <Circle className="h-4 w-4 text-slate-300" aria-hidden />
                                )}
                                {mealType}
                              </span>
                              <span className="text-right text-slate-900">
                                {pkg ? (
                                  <>
                                    <span className="block font-medium">{pkg.name}</span>
                                    <span className="block text-xs text-slate-500">{formatCurrency(pkg.price)} / meal</span>
                                  </>
                                ) : (
                                  <span className="text-xs uppercase tracking-wide text-amber-600">Select package</span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Coupon
                      </span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCodeInput}
                          onChange={handleCouponInputChange}
                          placeholder="SAVE50"
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400/60 disabled:bg-slate-100"
                          disabled={couponLoading || Boolean(appliedCoupon)}
                          autoComplete="off"
                          inputMode="text"
                        />
                        {appliedCoupon ? (
                          <button
                            type="button"
                            onClick={handleRemoveCoupon}
                            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900 disabled:opacity-60"
                            disabled={couponLoading}
                          >
                            Remove
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              void handleApplyCoupon();
                            }}
                            className="inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:bg-purple-300"
                            disabled={couponLoading || !couponCodeInput.trim()}
                          >
                            {couponLoading ? 'Applying…' : 'Apply'}
                          </button>
                        )}
                      </div>
                      {couponError && (
                        <p className="text-xs font-medium text-red-600">{couponError}</p>
                      )}
                      {couponMessage && !couponError && (
                        <p className="text-xs font-medium text-emerald-600">{couponMessage}</p>
                      )}
                      <div className="pt-1">
                        {availableCouponsLoading ? (
                          <p className="text-xs text-slate-500">Loading available coupons…</p>
                        ) : availableCouponsError ? (
                          <p className="text-xs font-medium text-red-600">{availableCouponsError}</p>
                        ) : evaluatedAvailableCoupons.length > 0 ? (
                          <div className="space-y-2 pt-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Available coupons
                            </p>
                            <div className="space-y-2">
                              {evaluatedAvailableCoupons.map(({ coupon, evaluation }) => {
                                const isApplied = appliedCoupon?.code === coupon.code;
                                const discountLabel = coupon.discountType === 'percentage'
                                  ? `${formatPercent(coupon.discountValue)} off`
                                  : `${formatCurrency(Math.round(coupon.discountValue))} off`;
                                return (
                                  <button
                                    key={coupon.id}
                                    type="button"
                                    onClick={() => {
                                      if (!evaluation.valid || isApplied) {
                                        return;
                                      }
                                      handleCouponSuggestionClick(coupon.code);
                                    }}
                                    className={`w-full rounded-lg border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                      isApplied
                                        ? 'border-purple-500 bg-purple-50 text-purple-900'
                                        : evaluation.valid
                                          ? 'border-emerald-200 bg-white hover:border-emerald-300 hover:bg-emerald-50'
                                          : 'border-slate-200 bg-white'
                                    }`}
                                    disabled={couponLoading || isApplied || !evaluation.valid}
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="font-semibold uppercase tracking-wide">{coupon.code}</span>
                                      <span
                                        className={`text-xs font-medium ${
                                          isApplied
                                            ? 'text-purple-700'
                                            : evaluation.valid
                                              ? 'text-emerald-600'
                                              : 'text-slate-500'
                                        }`}
                                      >
                                        {isApplied ? 'Applied' : evaluation.valid ? discountLabel : 'Locked'}
                                      </span>
                                    </div>
                                    {coupon.description && (
                                      <p className="mt-1 text-xs text-slate-600">{coupon.description}</p>
                                    )}
                                    <p
                                      className={`mt-1 text-[11px] font-medium ${
                                        evaluation.valid ? 'text-emerald-600' : 'text-amber-600'
                                      }`}
                                    >
                                      {evaluation.valid
                                        ? evaluation.message ?? 'Eligible for your current selection.'
                                        : evaluation.reason ?? 'Not eligible yet for this coupon.'}
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">No coupons available right now.</p>
                        )}
                      </div>
                    </div>
                    <div className="h-px w-full bg-slate-200" />
                    {hasAnySelection && (
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-slate-600">
                          <span>Subtotal</span>
                          <span className="font-medium text-slate-900">{formatCurrency(Math.round(pricingSummary.subtotal))}</span>
                        </div>
                        {pricingSummary.discountAmount > 0 && pricingSummary.appliedDiscounts.length > 0 && (
                          <div className="space-y-1 text-emerald-600">
                            {pricingSummary.appliedDiscounts.map((discount) => (
                              <div className="flex justify-between" key={discount.key}>
                                <span>
                                  {discount.label}
                                  {discount.summary ? ` (${discount.summary})` : ''}
                                </span>
                                <span>-{formatCurrency(Math.round(discount.amount))}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {hasCouponApplied && couponDiscountAmount > 0 && (
                          <div className="flex justify-between text-purple-600">
                            <span>Coupon ({appliedCoupon?.code})</span>
                            <span>-{formatCurrency(Math.round(couponDiscountAmount))}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs uppercase tracking-wide text-slate-500">Total due today</span>
                        <p className="text-2xl font-bold text-slate-900">
                          {hasAnySelection ? formatCurrency(Math.round(totalAfterCoupon)) : '—'}
                        </p>
                        {hasAnySelection && pricingSummary.discountAmount > 0 && pricingSummary.automaticDiscountSummary && (
                          <p className="text-xs font-medium text-emerald-600">
                            {pricingSummary.automaticDiscountSummary} applied automatically.
                          </p>
                        )}
                      </div>
                      {hasAnySelection && (
                        <span className="text-xs text-slate-500 text-right">
                          {selectedMealCount} {selectedMealCount === 1 ? 'meal slot' : 'meal slots'} · {duration !== null ? `${duration} days` : 'Select duration'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                    {depositLoading ? (
                      <div className="flex items-center gap-3 text-slate-500">
                        <Circle className="h-4 w-4 animate-pulse" aria-hidden />
                        <span>Checking your deposit status…</span>
                      </div>
                    ) : depositPaid ? (
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" aria-hidden />
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900">Deposit received</p>
                          <p>
                            Your one-time {formatCurrency(SUBSCRIPTION_DEPOSIT_AMOUNT)} packing deposit (fully refundable) is on file
                            {depositPaidAtLabel ? ` since ${depositPaidAtLabel}.` : '.'}
                          </p>
                          {deposit?.invoiceImageBase64 && (
                            <a
                              href={deposit.invoiceImageBase64}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 hover:bg-emerald-200"
                            >
                              View invoice{deposit?.invoiceFileName ? ` · ${deposit.invoiceFileName}` : ''}
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <Circle className="mt-0.5 h-4 w-4 text-amber-500" aria-hidden />
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900">One-time packing deposit (fully refundable) required</p>
                          <p>
                            Pay {formatCurrency(SUBSCRIPTION_DEPOSIT_AMOUNT)} once to unlock subscriptions. We&apos;ll guide you through the quick deposit step before checkout—future orders skip this requirement.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    <label className="mb-2 block text-sm font-semibold text-blue-900">
                      Payment Proof Screenshot
                      <span className="text-red-600 ml-1">*</span>
                    </label>
                    <p className="mb-3 text-xs text-blue-600">
                      Upload a screenshot of your payment confirmation to proceed with checkout. This is required to verify payment.
                    </p>
                    {(config?.paymentQRCode || config?.paymentUPI) && (
                      <button
                        type="button"
                        onClick={() => setShowCheckoutQRDialog(true)}
                        className="mb-3 w-full rounded-md border border-blue-400 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-blue-700 transition hover:bg-blue-100"
                      >
                        Show Payment QR
                      </button>
                    )}
                    {paymentProofPreview ? (
                      <div className="space-y-2">
                        <img
                          src={paymentProofPreview}
                          alt="Payment proof preview"
                          className="h-32 w-full rounded-lg border border-blue-300 object-contain"
                        />
                        <button
                          type="button"
                          onClick={handleRemovePaymentProof}
                          className="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-blue-700 transition hover:bg-blue-50"
                        >
                          Remove image
                        </button>
                      </div>
                    ) : (
                      <div>
                        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-white/50 px-4 py-3 transition hover:border-blue-400 hover:bg-white/70">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePaymentProofChange}
                            className="hidden"
                            aria-label="Upload payment proof screenshot"
                          />
                          <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                            Click to upload or drag image here
                          </span>
                          <span className="text-xs text-blue-600">PNG, JPG, or WebP (max 5MB)</span>
                        </label>
                      </div>
                    )}
                    {paymentProofError && (
                      <p className="mt-2 text-xs text-red-600">{paymentProofError}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void handleProceed();
                    }}
                    disabled={!canProceed || submittingRequest}
                    className="mt-6 w-full rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {submittingRequest ? 'Submitting…' : 'Proceed to checkout'}
                  </button>
                  <p className="mt-3 text-center text-xs text-slate-400">
                    {submittingRequest
                      ? 'Submitting your subscription request…'
                      : canProceed
                        ? 'Secure payments • Pause or skip anytime'
                        : hasAnySelection
                          ? 'Lock in your start date to continue.'
                          : 'Select at least one meal slot to continue.'}
                  </p>
                </div>

                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-5 text-sm text-slate-600 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Need help?</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Our concierge team can tailor meal plans for events, office catering, or specific nutritional goals.
                  </p>
                  <button
                    type="button"
                    className="mt-4 inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
                    onClick={() => addToast('Concierge support is coming soon!', 'info')}
                  >
                    Talk to a specialist
                  </button>
                </div>
              </aside>
            </div>

            {!isLoading && !category && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
                <p>We couldn\'t find this subscription category. Head back to explore all available plans.</p>
                <button
                  type="button"
                  onClick={handleBack}
                  className="mt-4 inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-800"
                >
                  Browse subscriptions
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
      <Dialog
        open={isDepositDialogOpen}
        onClose={handleCloseDepositDialog}
        title="One-time packing deposit (fully refundable)"
        description={`Pay a refundable ${formatCurrency(SUBSCRIPTION_DEPOSIT_AMOUNT)} deposit to activate subscription checkouts.`}
        size="md"
        footer={(
          <div className="flex justify-end gap-3">
            {(config?.paymentQRCode || config?.paymentUPI) && (
              <button
                type="button"
                onClick={() => setShowDepositQRDialog(true)}
                disabled={depositSubmitting}
                className="rounded-md border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 transition hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Show Payment QR
              </button>
            )}
            <button
              type="button"
              onClick={handleCloseDepositDialog}
              disabled={depositSubmitting}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                void handleConfirmDeposit();
              }}
              disabled={depositSubmitting}
              className="inline-flex items-center justify-center rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:cursor-not-allowed disabled:bg-orange-300 disabled:opacity-80"
            >
              {depositSubmitting ? 'Recording…' : 'I have paid the deposit'}
            </button>
          </div>
        )}
      >
        <div className="space-y-4 text-sm text-slate-600">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Deposit amount</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(SUBSCRIPTION_DEPOSIT_AMOUNT)}</p>
            <p className="mt-1 text-xs text-slate-500">Fully refundable when you wrap up your subscription.</p>
          </div>
          <div>
            <p className="font-medium text-slate-900">How it works</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Complete the ₹{SUBSCRIPTION_DEPOSIT_AMOUNT.toLocaleString('en-IN')} transfer using your usual payment method.</li>
              <li>Save the transaction reference or UPI ID for your records.</li>
              <li>Enter the reference below and confirm so our team can verify it instantly.</li>
            </ol>
          </div>
          <div className="space-y-1">
            <label htmlFor="subscription-deposit-reference" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Payment reference (optional)
            </label>
            <input
              id="subscription-deposit-reference"
              type="text"
              value={depositReference}
              onChange={(event) => setDepositReference(event.target.value)}
              placeholder="UPI ref / transaction ID"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-400/60 disabled:bg-slate-100"
              disabled={depositSubmitting}
            />
            <p className="text-[11px] text-slate-400">We’ll store this in case support needs to trace the payment.</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="subscription-deposit-invoice" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Upload invoice (required)
            </label>
            <input
              id="subscription-deposit-invoice"
              type="file"
              accept="image/*"
              onChange={handleDepositInvoiceChange}
              disabled={depositSubmitting}
              className="block w-full cursor-pointer rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-orange-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
            />
            {depositInvoiceError && (
              <p className="text-xs font-medium text-red-600">{depositInvoiceError}</p>
            )}
            {depositInvoicePreview && (
              <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <img
                  src={depositInvoicePreview}
                  alt="Deposit invoice preview"
                  className="max-h-48 w-full object-contain"
                />
                <button
                  type="button"
                  onClick={handleRemoveDepositInvoice}
                  disabled={depositSubmitting}
                  className="absolute right-2 top-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700 shadow hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Remove
                </button>
              </div>
            )}
            <p className="text-[11px] text-slate-400">Accepted formats: JPG, PNG up to 5MB.</p>
          </div>
        </div>
      </Dialog>

      {/* Payment QR Code Dialog for Deposit */}
      <Dialog
        open={showDepositQRDialog}
        onClose={() => setShowDepositQRDialog(false)}
        title="Payment QR Code"
        description="Scan this QR code or use the details below to complete your payment"
        size="md"
        footer={(
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowDepositQRDialog(false)}
              className="rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              Close
            </button>
          </div>
        )}
      >
        <div className="space-y-6 text-center">
          {config?.paymentQRCode && (
            <div className="flex justify-center">
              <img
                src={config.paymentQRCode}
                alt="Payment QR Code"
                className="h-64 w-64 border-4 border-purple-200 rounded-lg"
              />
            </div>
          )}
          
          {config?.paymentUPI && (
            <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">UPI ID</p>
              <p className="font-mono text-lg font-semibold text-slate-900 break-all">{config.paymentUPI}</p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(config.paymentUPI || '');
                  alert('UPI ID copied to clipboard');
                }}
                className="mt-3 w-full rounded-md bg-purple-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-purple-700"
              >
                Copy UPI ID
              </button>
            </div>
          )}

          {config?.paymentPhoneNumber && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Phone Number</p>
              <p className="font-mono text-lg font-semibold text-slate-900">{config.paymentPhoneNumber}</p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(config.paymentPhoneNumber || '');
                  alert('Phone number copied to clipboard');
                }}
                className="mt-3 w-full rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
              >
                Copy Phone Number
              </button>
            </div>
          )}

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-left">
            <p className="text-sm font-semibold text-amber-900 mb-2">Amount to Pay</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(SUBSCRIPTION_DEPOSIT_AMOUNT)}</p>
            <p className="text-xs text-amber-700 mt-2">Please complete the payment and upload the receipt in the deposit dialog to confirm.</p>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={isTermsOpen}
        onClose={handleCloseTerms}
        title="Terms & Conditions"
        description="Please review and accept these terms before continuing to checkout."
        size="lg"
        footer={(
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCloseTerms}
              disabled={submittingRequest}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAcceptTerms}
              disabled={submittingRequest}
              className="inline-flex items-center justify-center rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:cursor-not-allowed disabled:bg-orange-300 disabled:opacity-80"
            >
              {submittingRequest ? 'Submitting…' : 'I accept'}
            </button>
          </div>
        )}
      >
        <div className="max-h-[60vh] overflow-y-auto pr-1 sm:pr-2">
          <div className="space-y-4 text-sm text-slate-600">
            {configLoading && !configLoaded ? (
              <p className="text-slate-500">Loading the latest terms…</p>
            ) : checkoutTerms ? (
              <div className="prose prose-slate max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {checkoutTerms}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                Terms and conditions haven’t been configured yet. Please contact support or update them from the admin Site Settings page.
              </div>
            )}
          </div>
        </div>
      </Dialog>

      {/* Payment QR Code Dialog for Subscription Checkout */}
      <Dialog
        open={showCheckoutQRDialog}
        onClose={() => setShowCheckoutQRDialog(false)}
        title="Payment QR Code"
        description="Scan this QR code or use the details below to complete your payment"
        size="md"
        footer={(
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowCheckoutQRDialog(false)}
              className="rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              Close
            </button>
          </div>
        )}
      >
        <div className="space-y-6 text-center">
          {config?.paymentQRCode && (
            <div className="flex justify-center">
              <img
                src={config.paymentQRCode}
                alt="Payment QR Code"
                className="h-64 w-64 border-4 border-purple-200 rounded-lg"
              />
            </div>
          )}
          
          {config?.paymentUPI && (
            <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">UPI ID</p>
              <p className="font-mono text-lg font-semibold text-slate-900 break-all">{config.paymentUPI}</p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(config.paymentUPI || '');
                  alert('UPI ID copied to clipboard');
                }}
                className="mt-3 w-full rounded-md bg-purple-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-purple-700"
              >
                Copy UPI ID
              </button>
            </div>
          )}

          {config?.paymentPhoneNumber && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Phone Number</p>
              <p className="font-mono text-lg font-semibold text-slate-900">{config.paymentPhoneNumber}</p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(config.paymentPhoneNumber || '');
                  alert('Phone number copied to clipboard');
                }}
                className="mt-3 w-full rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
              >
                Copy Phone Number
              </button>
            </div>
          )}

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-left">
            <p className="text-sm font-semibold text-amber-900 mb-2">Instructions</p>
            <ul className="text-xs text-amber-700 space-y-1 list-disc pl-4">
              <li>Complete the payment using the QR code or details above</li>
              <li>Take a screenshot of your payment confirmation</li>
              <li>Upload the screenshot to proceed with checkout</li>
            </ul>
          </div>
        </div>
      </Dialog>

      <Footer />
    </div>
  );
};

export default SubscriptionCheckoutPage;
