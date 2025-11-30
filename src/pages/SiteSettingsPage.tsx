import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, RefreshCcw, Save, Sparkles, Trash2, X } from 'lucide-react';
import { RoleModel } from '../firestore';
import {
  DEFAULT_ADDON_ORDER_CUTOFF_HOUR,
  DEFAULT_STUDENT_DISCOUNT_PERCENT,
  DEFAULT_SUBSCRIPTION_PAUSE_CUTOFF_HOUR,
  type AppConfigSchema,
  type FAQItem,
} from '../firestore/ConfigModel';
import type { RoleSchema } from '../schemas/RoleSchema';
import { useConfigStore } from '../stores/configStore';
import { useToastStore } from '../stores/toastStore';

type FormState = {
  checkoutTerms: string;
  defaultRoleId: string;
  defaultAdminRoleId: string;
  defaultChefRoleId: string;
  defaultDeliveryRoleId: string;
  defaultSubscriberRoleId: string;
  defaultSupervisorRoleId: string;
  defaultHelpersRoleId: string;
  coinPrice: string;
  studentDiscountPercent: string;
  hubLocationName: string;
  hubLatitude: string;
  hubLongitude: string;
  addonOrderCutoffHour: string;
  subscriptionPauseCutoffHour: string;
  faqs: FAQItem[];
  paymentUPI: string;
  paymentPhoneNumber: string;
};

const EMPTY_FORM: FormState = {
  checkoutTerms: '',
  defaultRoleId: '',
  defaultAdminRoleId: '',
  defaultChefRoleId: '',
  defaultDeliveryRoleId: '',
  defaultSubscriberRoleId: '',
  defaultSupervisorRoleId: '',
  defaultHelpersRoleId: '',
  coinPrice: '1',
  studentDiscountPercent: String(DEFAULT_STUDENT_DISCOUNT_PERCENT),
  hubLocationName: '',
  hubLatitude: '',
  hubLongitude: '',
  addonOrderCutoffHour: '',
  subscriptionPauseCutoffHour: '',
  faqs: [],
  paymentUPI: '',
  paymentPhoneNumber: '',
};

const convertToDate = (value: unknown): Date | null => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate(): Date }).toDate === 'function') {
    return (value as { toDate(): Date }).toDate();
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toInputString = (value?: number | null): string => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
};

const parseNumberInput = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const SiteSettingsPage: React.FC = () => {
  const config = useConfigStore((state) => state.config);
  const loading = useConfigStore((state) => state.loading);
  const loaded = useConfigStore((state) => state.loaded);
  const saving = useConfigStore((state) => state.saving);
  const loadConfig = useConfigStore((state) => state.loadConfig);
  const refresh = useConfigStore((state) => state.refresh);
  const saveConfig = useConfigStore((state) => state.saveConfig);
  const addToast = useToastStore((state) => state.addToast);

  const [formValues, setFormValues] = useState<FormState>(EMPTY_FORM);
  const [dirty, setDirty] = useState(false);
  const [roles, setRoles] = useState<RoleSchema[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [qrCodePreview, setQrCodePreview] = useState<string | null>(null);
  const [qrCodeError, setQrCodeError] = useState<string | null>(null);
  const [uploadingQR, setUploadingQR] = useState(false);

  const hasChanges = useMemo(() => {
    const safe = (value?: string | null) => value ?? '';
    const safeNumber = (value?: number | null) => (value === null || value === undefined ? '' : String(value));
    if (!config) {
      return JSON.stringify(formValues) !== JSON.stringify(EMPTY_FORM);
    }
    return (
      safe(config.checkoutTerms) !== formValues.checkoutTerms ||
      safe(config.defaultRoleId) !== formValues.defaultRoleId ||
      safe(config.defaultAdminRoleId) !== formValues.defaultAdminRoleId ||
      safe(config.defaultChefRoleId) !== formValues.defaultChefRoleId ||
      safe(config.defaultDeliveryRoleId) !== formValues.defaultDeliveryRoleId ||
      safe(config.defaultSubscriberRoleId) !== formValues.defaultSubscriberRoleId ||
      safe(config.defaultSupervisorRoleId) !== formValues.defaultSupervisorRoleId ||
      safe(config.defaultHelpersRoleId) !== formValues.defaultHelpersRoleId ||
      String(config.coinPrice ?? 1) !== formValues.coinPrice ||
      String(config.studentDiscountPercent ?? DEFAULT_STUDENT_DISCOUNT_PERCENT) !== formValues.studentDiscountPercent ||
      safe(config.hubLocationName ?? null) !== formValues.hubLocationName ||
      safeNumber(config.hubLatitude ?? null) !== formValues.hubLatitude ||
      safeNumber(config.hubLongitude ?? null) !== formValues.hubLongitude ||
      safeNumber(config.addonOrderCutoffHour ?? null) !== formValues.addonOrderCutoffHour ||
      safeNumber(config.subscriptionPauseCutoffHour ?? null) !== formValues.subscriptionPauseCutoffHour ||
      JSON.stringify(config.faqs ?? []) !== JSON.stringify(formValues.faqs) ||
      safe(config.paymentUPI ?? null) !== formValues.paymentUPI ||
      safe(config.paymentPhoneNumber ?? null) !== formValues.paymentPhoneNumber
    );
  }, [config, formValues]);

  useEffect(() => {
    if (!loaded && !loading) {
      void loadConfig();
    }
  }, [loaded, loading, loadConfig]);

  useEffect(() => {
    if (!loading) {
      setFormValues({
        checkoutTerms: config?.checkoutTerms ?? '',
        defaultRoleId: config?.defaultRoleId ?? '',
        defaultAdminRoleId: config?.defaultAdminRoleId ?? '',
        defaultChefRoleId: config?.defaultChefRoleId ?? '',
        defaultDeliveryRoleId: config?.defaultDeliveryRoleId ?? '',
        defaultSubscriberRoleId: config?.defaultSubscriberRoleId ?? '',
        defaultSupervisorRoleId: config?.defaultSupervisorRoleId ?? '',
        defaultHelpersRoleId: config?.defaultHelpersRoleId ?? '',
        coinPrice: String(config?.coinPrice ?? 1),
        studentDiscountPercent: String(config?.studentDiscountPercent ?? DEFAULT_STUDENT_DISCOUNT_PERCENT),
        hubLocationName: config?.hubLocationName ?? '',
        hubLatitude: toInputString(config?.hubLatitude ?? null),
        hubLongitude: toInputString(config?.hubLongitude ?? null),
        addonOrderCutoffHour: toInputString(config?.addonOrderCutoffHour ?? null),
        subscriptionPauseCutoffHour: toInputString(config?.subscriptionPauseCutoffHour ?? null),
        faqs: config?.faqs ?? [],
        paymentUPI: config?.paymentUPI ?? '',
        paymentPhoneNumber: config?.paymentPhoneNumber ?? '',
      });
      setDirty(false);
    }
  }, [
    config?.checkoutTerms,
    config?.defaultRoleId,
    config?.defaultAdminRoleId,
    config?.defaultChefRoleId,
    config?.defaultDeliveryRoleId,
    config?.defaultSubscriberRoleId,
    config?.defaultSupervisorRoleId,
    config?.defaultHelpersRoleId,
    config?.coinPrice,
    config?.studentDiscountPercent,
    config?.hubLocationName,
    config?.hubLatitude,
    config?.hubLongitude,
    config?.addonOrderCutoffHour,
    config?.subscriptionPauseCutoffHour,
    config?.faqs,
    config?.paymentUPI,
    config?.paymentPhoneNumber,
    loading,
  ]);

  const loadRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const list = await RoleModel.findAll();
      const withIds = list.filter((role) => Boolean(role.id));
      const sorted = withIds.sort((a, b) => a.name.localeCompare(b.name));
      setRoles(sorted);
      setRolesError(null);
    } catch (error) {
      console.error('Failed to load roles', error);
      setRolesError('Failed to load roles. Please try again.');
    } finally {
      setRolesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  const sortedRoles = useMemo(() => roles, [roles]);

  const renderRoleOptions = (currentValue: string) => {
    const missingSelection = currentValue && !sortedRoles.some((role) => role.id === currentValue);

    if (sortedRoles.length === 0) {
      return (
        <>
          <option value="">No default (leave unassigned)</option>
          {missingSelection && (
            <option value={currentValue} disabled>
              Unknown role ({currentValue})
            </option>
          )}
          <option value="__no-roles" disabled>
            No roles available
          </option>
        </>
      );
    }

    return (
      <>
        <option value="">No default (leave unassigned)</option>
        {missingSelection && (
          <option value={currentValue} disabled>
            Unknown role ({currentValue})
          </option>
        )}
        {sortedRoles.map((role) => (
          <option key={role.id ?? role.name} value={role.id ?? ''}>
            {role.name}
          </option>
        ))}
      </>
    );
  };

  const updatedAtLabel = useMemo(() => {
    const date = convertToDate(config?.updatedAt ?? null);
    if (!date) {
      return '—';
    }
    try {
      return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    } catch (error) {
      console.warn('Failed to format updatedAt timestamp', error);
      return date.toLocaleString();
    }
  }, [config?.updatedAt]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = formValues.checkoutTerms.trimEnd();
    const updates: Partial<AppConfigSchema> = {};

    if ((config?.checkoutTerms ?? '') !== normalized) {
      updates.checkoutTerms = normalized;
    }

    const normalizeRoleValue = (value: string): string | null => {
      const trimmed = value.trim();
      if (trimmed.length === 0 || trimmed === '__no-roles') {
        return null;
      }
      return value;
    };

  (['defaultRoleId', 'defaultAdminRoleId', 'defaultChefRoleId', 'defaultDeliveryRoleId', 'defaultSubscriberRoleId', 'defaultSupervisorRoleId', 'defaultHelpersRoleId'] as const).forEach((field) => {
      const currentValue = (config?.[field] ?? null) as string | null;
      const nextValue = normalizeRoleValue(formValues[field]);
      if (currentValue !== nextValue) {
        updates[field] = nextValue;
      }
    });

    // Handle coin price
    const newCoinPrice = parseFloat(formValues.coinPrice);
    if (!isNaN(newCoinPrice) && newCoinPrice > 0 && (config?.coinPrice ?? 1) !== newCoinPrice) {
      updates.coinPrice = newCoinPrice;
    }

    const studentDiscountInput = formValues.studentDiscountPercent.trim();
    if (studentDiscountInput.length === 0) {
      addToast('Enter the student discount percentage (use 0 to disable).', 'error');
      return;
    }
    const parsedStudentDiscount = Number.parseFloat(studentDiscountInput);
    if (!Number.isFinite(parsedStudentDiscount) || parsedStudentDiscount < 0 || parsedStudentDiscount > 100) {
      addToast('Student discount must be between 0 and 100%.', 'error');
      return;
    }
    if ((config?.studentDiscountPercent ?? DEFAULT_STUDENT_DISCOUNT_PERCENT) !== parsedStudentDiscount) {
      updates.studentDiscountPercent = parsedStudentDiscount;
    }

    const normalizedHubName = formValues.hubLocationName.trim();
    const existingHubName = (config?.hubLocationName ?? '').trim();
    if (normalizedHubName !== existingHubName) {
      updates.hubLocationName = normalizedHubName.length > 0 ? normalizedHubName : null;
    }

    const rawHubLatitude = formValues.hubLatitude;
    const parsedHubLatitude = parseNumberInput(rawHubLatitude);
    if (rawHubLatitude.trim().length > 0 && parsedHubLatitude === null) {
      addToast('Enter a valid hub latitude between -90 and 90 degrees.', 'error');
      return;
    }
    if (parsedHubLatitude !== null && (parsedHubLatitude < -90 || parsedHubLatitude > 90)) {
      addToast('Hub latitude must be between -90 and 90 degrees.', 'error');
      return;
    }
    const currentHubLatitude = config?.hubLatitude ?? null;
    if (parsedHubLatitude !== currentHubLatitude) {
      updates.hubLatitude = parsedHubLatitude;
    }

    const rawHubLongitude = formValues.hubLongitude;
    const parsedHubLongitude = parseNumberInput(rawHubLongitude);
    if (rawHubLongitude.trim().length > 0 && parsedHubLongitude === null) {
      addToast('Enter a valid hub longitude between -180 and 180 degrees.', 'error');
      return;
    }
    if (parsedHubLongitude !== null && (parsedHubLongitude < -180 || parsedHubLongitude > 180)) {
      addToast('Hub longitude must be between -180 and 180 degrees.', 'error');
      return;
    }
    const currentHubLongitude = config?.hubLongitude ?? null;
    if (parsedHubLongitude !== currentHubLongitude) {
      updates.hubLongitude = parsedHubLongitude;
    }

    const cutoffParser = (raw: string, label: string): number | null | undefined => {
      const trimmed = raw.trim();
      if (trimmed.length === 0) {
        return null;
      }
      if (!/^-?\d+$/.test(trimmed)) {
        addToast(`${label} must be a whole number between 0 and 23.`, 'error');
        return undefined;
      }
      const parsed = Number.parseInt(trimmed, 10);
      if (!Number.isFinite(parsed)) {
        addToast(`${label} must be a number between 0 and 23.`, 'error');
        return undefined;
      }
      if (parsed < 0 || parsed > 23) {
        addToast(`${label} must be between 0 and 23.`, 'error');
        return undefined;
      }
      return parsed;
    };

    const nextAddonCutoff = cutoffParser(formValues.addonOrderCutoffHour, 'Add-on order cutoff hour');
    if (nextAddonCutoff === undefined) {
      return;
    }
    const nextPauseCutoff = cutoffParser(formValues.subscriptionPauseCutoffHour, 'Subscription pause cutoff hour');
    if (nextPauseCutoff === undefined) {
      return;
    }

    const currentAddonCutoff = config?.addonOrderCutoffHour ?? null;
    if (nextAddonCutoff !== currentAddonCutoff) {
      updates.addonOrderCutoffHour = nextAddonCutoff;
    }

    const currentPauseCutoff = config?.subscriptionPauseCutoffHour ?? null;
    if (nextPauseCutoff !== currentPauseCutoff) {
      updates.subscriptionPauseCutoffHour = nextPauseCutoff;
    }

    // Handle FAQs
    const currentFaqs = config?.faqs ?? [];
    if (JSON.stringify(currentFaqs) !== JSON.stringify(formValues.faqs)) {
      updates.faqs = formValues.faqs;
    }

    // Handle Payment Configuration
    const normalizedPaymentUPI = formValues.paymentUPI.trim();
    const currentPaymentUPI = (config?.paymentUPI ?? '').trim();
    if (normalizedPaymentUPI !== currentPaymentUPI) {
      updates.paymentUPI = normalizedPaymentUPI.length > 0 ? normalizedPaymentUPI : null;
    }

    const normalizedPaymentPhone = formValues.paymentPhoneNumber.trim();
    const currentPaymentPhone = (config?.paymentPhoneNumber ?? '').trim();
    if (normalizedPaymentPhone !== currentPaymentPhone) {
      updates.paymentPhoneNumber = normalizedPaymentPhone.length > 0 ? normalizedPaymentPhone : null;
    }

    if (Object.keys(updates).length === 0) {
      setDirty(false);
      return;
    }

    const success = await saveConfig(updates);
    if (success) {
      setFormValues((prev) => ({
        ...prev,
        checkoutTerms: normalized,
        studentDiscountPercent: String(parsedStudentDiscount),
        hubLocationName: normalizedHubName,
        hubLatitude: parsedHubLatitude === null ? '' : String(parsedHubLatitude),
        hubLongitude: parsedHubLongitude === null ? '' : String(parsedHubLongitude),
        addonOrderCutoffHour: nextAddonCutoff === null ? '' : String(nextAddonCutoff),
        subscriptionPauseCutoffHour: nextPauseCutoff === null ? '' : String(nextPauseCutoff),
        paymentUPI: normalizedPaymentUPI,
        paymentPhoneNumber: normalizedPaymentPhone,
      }));
      setDirty(false);
    }
  };

  const handleReset = () => {
    setFormValues({
      checkoutTerms: config?.checkoutTerms ?? '',
      defaultRoleId: config?.defaultRoleId ?? '',
      defaultAdminRoleId: config?.defaultAdminRoleId ?? '',
      defaultChefRoleId: config?.defaultChefRoleId ?? '',
      defaultDeliveryRoleId: config?.defaultDeliveryRoleId ?? '',
      defaultSubscriberRoleId: config?.defaultSubscriberRoleId ?? '',
      defaultSupervisorRoleId: config?.defaultSupervisorRoleId ?? '',
      defaultHelpersRoleId: config?.defaultHelpersRoleId ?? '',
      coinPrice: String(config?.coinPrice ?? 1),
      studentDiscountPercent: String(config?.studentDiscountPercent ?? DEFAULT_STUDENT_DISCOUNT_PERCENT),
      hubLocationName: config?.hubLocationName ?? '',
      hubLatitude: toInputString(config?.hubLatitude ?? null),
      hubLongitude: toInputString(config?.hubLongitude ?? null),
      addonOrderCutoffHour: toInputString(config?.addonOrderCutoffHour ?? null),
      subscriptionPauseCutoffHour: toInputString(config?.subscriptionPauseCutoffHour ?? null),
      faqs: config?.faqs ?? [],
      paymentUPI: config?.paymentUPI ?? '',
      paymentPhoneNumber: config?.paymentPhoneNumber ?? '',
    });
    setDirty(false);
  };

  const handleClear = () => {
    setFormValues((prev) => ({ ...prev, checkoutTerms: '' }));
    setDirty(true);
  };

  const showLoadingState = !loaded && loading;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">Admin • Site Settings</p>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-900">
            <Sparkles className="h-6 w-6 text-purple-500" aria-hidden />
            Site personalisation
          </h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Manage the copy and defaults that power the customer experience. Updates go live instantly once saved.
          </p>
          <p className="text-xs text-slate-400">Last updated: {updatedAtLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setFormValues({
                checkoutTerms: config?.checkoutTerms ?? '',
                defaultRoleId: config?.defaultRoleId ?? '',
                defaultAdminRoleId: config?.defaultAdminRoleId ?? '',
                defaultChefRoleId: config?.defaultChefRoleId ?? '',
                defaultDeliveryRoleId: config?.defaultDeliveryRoleId ?? '',
                defaultSubscriberRoleId: config?.defaultSubscriberRoleId ?? '',
                defaultSupervisorRoleId: config?.defaultSupervisorRoleId ?? '',
                defaultHelpersRoleId: config?.defaultHelpersRoleId ?? '',
                coinPrice: String(config?.coinPrice ?? 1),
                studentDiscountPercent: String(config?.studentDiscountPercent ?? DEFAULT_STUDENT_DISCOUNT_PERCENT),
                hubLocationName: config?.hubLocationName ?? '',
                hubLatitude: toInputString(config?.hubLatitude ?? null),
                hubLongitude: toInputString(config?.hubLongitude ?? null),
                addonOrderCutoffHour: toInputString(config?.addonOrderCutoffHour ?? null),
                subscriptionPauseCutoffHour: toInputString(config?.subscriptionPauseCutoffHour ?? null),
                faqs: config?.faqs ?? [],
                paymentUPI: config?.paymentUPI ?? '',
                paymentPhoneNumber: config?.paymentPhoneNumber ?? '',
              });
              void refresh();
                void loadRoles();
            }}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-400 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading || saving}
          >
            <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
            Refresh
          </button>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Checkout terms &amp; conditions</h2>
              <p className="mt-1 text-sm text-slate-500">
                This text is shown to customers before they confirm a subscription checkout.
              </p>
            </div>
            {saving && (
              <span className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Saving…
              </span>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="checkout-terms" className="text-sm font-medium text-slate-700">
              Terms copy
            </label>
            <textarea
              id="checkout-terms"
              value={formValues.checkoutTerms}
              onChange={(event) => {
                setFormValues((prev) => ({ ...prev, checkoutTerms: event.target.value }));
                setDirty(true);
              }}
              placeholder={showLoadingState ? 'Loading current terms…' : 'Paste or write the terms customers must accept before checkout.'}
              className="min-h-[220px] w-full rounded-lg border border-slate-300 px-3 py-3 text-sm leading-relaxed shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:cursor-not-allowed disabled:bg-slate-100"
              disabled={saving || showLoadingState}
            />
            <p className="text-xs text-slate-400">
              Markdown isn&apos;t supported yet. Use line breaks to keep sections readable.
            </p>
          </div>
        </section>

        {/* Coin Price Configuration */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Coin Pricing</h2>
            <p className="mt-1 text-sm text-slate-500">
              Set the price per coin for customer wallet top-ups. Default is ₹1 per coin.
            </p>
          </div>

          <div className="max-w-sm space-y-2">
            <label htmlFor="coin-price" className="text-sm font-medium text-slate-700">
              Price per coin (₹)
            </label>
            <input
              id="coin-price"
              type="number"
              min="0.01"
              step="0.01"
              value={formValues.coinPrice}
              onChange={(event) => {
                setFormValues((prev) => ({ ...prev, coinPrice: event.target.value }));
                setDirty(true);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
              disabled={saving || showLoadingState}
            />
            <p className="text-xs text-slate-500">
              Current: 1 coin = ₹{formValues.coinPrice}
            </p>
          </div>
        </section>

        {/* Operational cutoffs */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Operational cutoffs</h2>
            <p className="mt-1 text-sm text-slate-500">
              Control the local hour (24-hour format) when next-day scheduling closes for add-on orders and subscription pause requests.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="addon-cutoff" className="text-sm font-medium text-slate-700">
                Add-on order cutoff hour
              </label>
              <input
                id="addon-cutoff"
                type="number"
                min="0"
                max="23"
                step="1"
                value={formValues.addonOrderCutoffHour}
                onChange={(event) => {
                  setFormValues((prev) => ({ ...prev, addonOrderCutoffHour: event.target.value }));
                  setDirty(true);
                }}
                placeholder="18"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:cursor-not-allowed disabled:bg-slate-50"
                disabled={saving || showLoadingState}
              />
              <p className="text-xs text-slate-500">
                Leave blank to use the default ({DEFAULT_ADDON_ORDER_CUTOFF_HOUR}:00). Accepts values between 0 and 23.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="pause-cutoff" className="text-sm font-medium text-slate-700">
                Subscription pause cutoff hour
              </label>
              <input
                id="pause-cutoff"
                type="number"
                min="0"
                max="23"
                step="1"
                value={formValues.subscriptionPauseCutoffHour}
                onChange={(event) => {
                  setFormValues((prev) => ({ ...prev, subscriptionPauseCutoffHour: event.target.value }));
                  setDirty(true);
                }}
                placeholder="18"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:cursor-not-allowed disabled:bg-slate-50"
                disabled={saving || showLoadingState}
              />
              <p className="text-xs text-slate-500">
                Leave blank to use the default ({DEFAULT_SUBSCRIPTION_PAUSE_CUTOFF_HOUR}:00). Accepts values between 0 and 23.
              </p>
            </div>
          </div>
        </section>

        {/* Student discount configuration */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Student discount</h2>
            <p className="mt-1 text-sm text-slate-500">
              Approved student accounts automatically receive this percentage off during subscription checkout.
            </p>
          </div>

          <div className="max-w-sm space-y-2">
            <label htmlFor="student-discount" className="text-sm font-medium text-slate-700">
              Discount percentage (%)
            </label>
            <input
              id="student-discount"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formValues.studentDiscountPercent}
              onChange={(event) => {
                setFormValues((prev) => ({ ...prev, studentDiscountPercent: event.target.value }));
                setDirty(true);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
              disabled={saving || showLoadingState}
            />
            <p className="text-xs text-slate-500">
              Default benefit: {DEFAULT_STUDENT_DISCOUNT_PERCENT}% off. Set to 0 to disable the student offer.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Delivery hub location</h2>
            <p className="mt-1 text-sm text-slate-500">
              Define the dispatch hub coordinates. Delivery assignment distances are calculated from this point to each
              customer&apos;s selected drop location.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3 space-y-2">
              <label htmlFor="hub-name" className="text-sm font-medium text-slate-700">
                Hub name or label
              </label>
              <input
                id="hub-name"
                type="text"
                value={formValues.hubLocationName}
                onChange={(event) => {
                  setFormValues((prev) => ({ ...prev, hubLocationName: event.target.value }));
                  setDirty(true);
                }}
                placeholder="e.g., Central Kitchen"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:cursor-not-allowed disabled:bg-slate-50"
                disabled={saving || showLoadingState}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="hub-lat" className="text-sm font-medium text-slate-700">
                Latitude (°)
              </label>
              <input
                id="hub-lat"
                type="number"
                step="any"
                min="-90"
                max="90"
                value={formValues.hubLatitude}
                onChange={(event) => {
                  setFormValues((prev) => ({ ...prev, hubLatitude: event.target.value }));
                  setDirty(true);
                }}
                placeholder="12.9716"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:cursor-not-allowed disabled:bg-slate-50"
                disabled={saving || showLoadingState}
              />
              <p className="text-xs text-slate-500">Use decimal degrees between -90 and 90.</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="hub-lng" className="text-sm font-medium text-slate-700">
                Longitude (°)
              </label>
              <input
                id="hub-lng"
                type="number"
                step="any"
                min="-180"
                max="180"
                value={formValues.hubLongitude}
                onChange={(event) => {
                  setFormValues((prev) => ({ ...prev, hubLongitude: event.target.value }));
                  setDirty(true);
                }}
                placeholder="77.5946"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:cursor-not-allowed disabled:bg-slate-50"
                disabled={saving || showLoadingState}
              />
              <p className="text-xs text-slate-500">Use decimal degrees between -180 and 180.</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Default role assignments</h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose the roles that will be automatically attached when team members sign up or are invited.
              </p>
            </div>
            {rolesLoading && (
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Loading roles…
              </span>
            )}
          </div>

          {rolesError && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <span>{rolesError}</span>
              <button
                type="button"
                onClick={() => void loadRoles()}
                className="inline-flex items-center gap-1 rounded-md border border-amber-400 bg-white/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                disabled={rolesLoading}
              >
                <RefreshCcw className="h-3 w-3" aria-hidden /> Retry
              </button>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="default-role" className="text-sm font-medium text-slate-700">
                Global default role
              </label>
              <p className="text-xs text-slate-500">Used when no specific match exists for a new account.</p>
              <select
                id="default-role"
                value={formValues.defaultRoleId}
                onChange={(event) => {
                  setFormValues((prev) => ({ ...prev, defaultRoleId: event.target.value }));
                  setDirty(true);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:cursor-not-allowed disabled:bg-slate-100"
                disabled={rolesLoading || saving || showLoadingState}
              >
                {renderRoleOptions(formValues.defaultRoleId)}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="default-admin-role" className="text-sm font-medium text-slate-700">
                Admin default role
              </label>
              <p className="text-xs text-slate-500">Applied when creating new admin profiles.</p>
              <select
                id="default-admin-role"
                value={formValues.defaultAdminRoleId}
                onChange={(event) => {
                  setFormValues((prev) => ({ ...prev, defaultAdminRoleId: event.target.value }));
                  setDirty(true);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:cursor-not-allowed disabled:bg-slate-100"
                disabled={rolesLoading || saving || showLoadingState}
              >
                {renderRoleOptions(formValues.defaultAdminRoleId)}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="default-chef-role" className="text-sm font-medium text-slate-700">
                Chef default role
              </label>
              <p className="text-xs text-slate-500">Assigned to new chef accounts.</p>
              <select
                id="default-chef-role"
                value={formValues.defaultChefRoleId}
                onChange={(event) => {
                  setFormValues((prev) => ({ ...prev, defaultChefRoleId: event.target.value }));
                  setDirty(true);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:cursor-not-allowed disabled:bg-slate-100"
                disabled={rolesLoading || saving || showLoadingState}
              >
                {renderRoleOptions(formValues.defaultChefRoleId)}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="default-delivery-role" className="text-sm font-medium text-slate-700">
                Delivery default role
              </label>
              <p className="text-xs text-slate-500">Applied to couriers and delivery partners.</p>
              <select
                id="default-delivery-role"
                value={formValues.defaultDeliveryRoleId}
                onChange={(event) => {
                  setFormValues((prev) => ({ ...prev, defaultDeliveryRoleId: event.target.value }));
                  setDirty(true);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:cursor-not-allowed disabled:bg-slate-100"
                disabled={rolesLoading || saving || showLoadingState}
              >
                {renderRoleOptions(formValues.defaultDeliveryRoleId)}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="default-subscriber-role" className="text-sm font-medium text-slate-700">
                Subscriber default role
              </label>
              <p className="text-xs text-slate-500">Assigned to new subscriber accounts and requests.</p>
              <select
                id="default-subscriber-role"
                value={formValues.defaultSubscriberRoleId}
                onChange={(event) => {
                  setFormValues((prev) => ({ ...prev, defaultSubscriberRoleId: event.target.value }));
                  setDirty(true);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:cursor-not-allowed disabled:bg-slate-100"
                disabled={rolesLoading || saving || showLoadingState}
              >
                {renderRoleOptions(formValues.defaultSubscriberRoleId)}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="default-supervisor-role" className="text-sm font-medium text-slate-700">
                Supervisor default role
              </label>
              <p className="text-xs text-slate-500">Used for team leads overseeing day-to-day operations.</p>
              <select
                id="default-supervisor-role"
                value={formValues.defaultSupervisorRoleId}
                onChange={(event) => {
                  setFormValues((prev) => ({ ...prev, defaultSupervisorRoleId: event.target.value }));
                  setDirty(true);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:cursor-not-allowed disabled:bg-slate-100"
                disabled={rolesLoading || saving || showLoadingState}
              >
                {renderRoleOptions(formValues.defaultSupervisorRoleId)}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="default-helpers-role" className="text-sm font-medium text-slate-700">
                Helpers default role
              </label>
              <p className="text-xs text-slate-500">Assign to support staff assisting supervisors and chefs.</p>
              <select
                id="default-helpers-role"
                value={formValues.defaultHelpersRoleId}
                onChange={(event) => {
                  setFormValues((prev) => ({ ...prev, defaultHelpersRoleId: event.target.value }));
                  setDirty(true);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:cursor-not-allowed disabled:bg-slate-100"
                disabled={rolesLoading || saving || showLoadingState}
              >
                {renderRoleOptions(formValues.defaultHelpersRoleId)}
              </select>
            </div>
          </div>
        </section>

        {/* FAQ Management */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Frequently Asked Questions</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage the FAQs displayed on the home page for your customers.
            </p>
          </div>

          <div className="space-y-4">
            {formValues.faqs.map((faq, index) => (
              <div key={faq.id} className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <span className="text-sm font-semibold text-slate-700">FAQ {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormValues((prev) => ({
                        ...prev,
                        faqs: prev.faqs.filter((_, i) => i !== index),
                      }));
                      setDirty(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={saving || showLoadingState}
                  >
                    <X className="h-3 w-3" />
                    Remove
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label htmlFor={`faq-question-${index}`} className="text-sm font-medium text-slate-700">
                      Question
                    </label>
                    <input
                      id={`faq-question-${index}`}
                      type="text"
                      value={faq.question}
                      onChange={(event) => {
                        setFormValues((prev) => ({
                          ...prev,
                          faqs: prev.faqs.map((f, i) =>
                            i === index ? { ...f, question: event.target.value } : f
                          ),
                        }));
                        setDirty(true);
                      }}
                      placeholder="Enter the question"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:cursor-not-allowed disabled:bg-slate-50"
                      disabled={saving || showLoadingState}
                    />
                  </div>
                  <div>
                    <label htmlFor={`faq-answer-${index}`} className="text-sm font-medium text-slate-700">
                      Answer
                    </label>
                    <textarea
                      id={`faq-answer-${index}`}
                      value={faq.answer}
                      onChange={(event) => {
                        setFormValues((prev) => ({
                          ...prev,
                          faqs: prev.faqs.map((f, i) =>
                            i === index ? { ...f, answer: event.target.value } : f
                          ),
                        }));
                        setDirty(true);
                      }}
                      placeholder="Enter the answer"
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:cursor-not-allowed disabled:bg-slate-50"
                      disabled={saving || showLoadingState}
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                setFormValues((prev) => ({
                  ...prev,
                  faqs: [
                    ...prev.faqs,
                    {
                      id: `faq-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                      question: '',
                      answer: '',
                    },
                  ],
                }));
                setDirty(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-purple-400 hover:text-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving || showLoadingState}
            >
              <Plus className="h-4 w-4" />
              Add New FAQ
            </button>
          </div>
        </section>

        {/* Payment Configuration */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Payment QR Configuration</h2>
            <p className="mt-1 text-sm text-slate-500">
              Configure UPI ID and phone number for payment QR codes displayed during checkout.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="payment-upi" className="block text-sm font-medium text-slate-700 mb-2">
                UPI ID
                <span className="text-slate-400 text-xs ml-1">(e.g., user@bank)</span>
              </label>
              <input
                id="payment-upi"
                type="text"
                value={formValues.paymentUPI}
                onChange={(event) => {
                  setFormValues((prev) => ({ ...prev, paymentUPI: event.target.value }));
                  setDirty(true);
                }}
                placeholder="e.g., toven@upi"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
              <p className="mt-1 text-xs text-slate-500">This UPI ID will be displayed on payment QR dialogs for customers.</p>
            </div>

            <div>
              <label htmlFor="payment-phone" className="block text-sm font-medium text-slate-700 mb-2">
                Phone Number
                <span className="text-slate-400 text-xs ml-1">(optional)</span>
              </label>
              <input
                id="payment-phone"
                type="text"
                value={formValues.paymentPhoneNumber}
                onChange={(event) => {
                  setFormValues((prev) => ({ ...prev, paymentPhoneNumber: event.target.value }));
                  setDirty(true);
                }}
                placeholder="e.g., +91 99999 99999"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
              <p className="mt-1 text-xs text-slate-500">Alternative contact number for payments. Leave empty if not needed.</p>
            </div>

            {/* QR Code Upload Section */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Payment QR Code Image
                <span className="text-slate-400 text-xs ml-1">(optional)</span>
              </label>
              
              {config?.paymentQRCode ? (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-lg border-2 border-slate-200 bg-slate-50 p-4">
                    <img
                      src={config.paymentQRCode}
                      alt="Payment QR Code Preview"
                      className="max-h-48 w-full object-contain"
                    />
                    <p className="mt-2 text-xs text-slate-500 text-center">Current QR Code</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setUploadingQR(true);
                      try {
                        const { ConfigModel } = await import('../firestore/ConfigModel');
                        await ConfigModel.update({ paymentQRCode: null });
                        await loadConfig();
                        setQrCodePreview(null);
                        addToast('QR code deleted successfully', 'success');
                      } catch (error) {
                        console.error('Failed to delete QR code', error);
                        setQrCodeError('Failed to delete QR code. Please try again.');
                        addToast('Failed to delete QR code', 'error');
                      } finally {
                        setUploadingQR(false);
                      }
                    }}
                    disabled={uploadingQR || saving}
                    className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-red-600 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {uploadingQR ? 'Deleting…' : 'Delete QR Code'}
                  </button>
                </div>
              ) : (
                <div>
                  <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 transition hover:border-purple-400 hover:bg-purple-50">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;

                        if (file.size > 5 * 1024 * 1024) {
                          setQrCodeError('File size must be smaller than 5MB');
                          addToast('File size must be smaller than 5MB', 'error');
                          return;
                        }

                        if (!file.type.startsWith('image/')) {
                          setQrCodeError('Please upload an image file');
                          addToast('Please upload an image file', 'error');
                          return;
                        }

                        setQrCodeError(null);

                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if (typeof reader.result === 'string') {
                            setQrCodePreview(reader.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                      disabled={uploadingQR || saving}
                      className="hidden"
                      aria-label="Upload QR code image"
                    />
                    <span className="text-sm font-semibold text-slate-600">
                      Click to upload QR code or drag and drop
                    </span>
                    <span className="text-xs text-slate-500">PNG, JPG, or WebP (max 5MB)</span>
                  </label>
                </div>
              )}

              {qrCodePreview && !config?.paymentQRCode && (
                <div className="mt-3 space-y-3">
                  <div className="relative overflow-hidden rounded-lg border-2 border-purple-200 bg-purple-50 p-4">
                    <img
                      src={qrCodePreview}
                      alt="QR Code Preview"
                      className="max-h-48 w-full object-contain"
                    />
                    <p className="mt-2 text-xs text-purple-600 text-center">Preview</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        setUploadingQR(true);
                        try {
                          const { ConfigModel } = await import('../firestore/ConfigModel');
                          await ConfigModel.update({ paymentQRCode: qrCodePreview });
                          await loadConfig();
                          setQrCodePreview(null);
                          addToast('QR code uploaded successfully', 'success');
                        } catch (error) {
                          console.error('Failed to upload QR code', error);
                          setQrCodeError('Failed to upload QR code. Please try again.');
                          addToast('Failed to upload QR code', 'error');
                        } finally {
                          setUploadingQR(false);
                        }
                      }}
                      disabled={uploadingQR || saving}
                      className="flex-1 rounded-lg border border-purple-300 bg-purple-600 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
                    >
                      {uploadingQR ? 'Uploading…' : 'Upload QR Code'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQrCodePreview(null);
                        setQrCodeError(null);
                      }}
                      disabled={uploadingQR || saving}
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {qrCodeError && (
                <p className="mt-2 text-xs text-red-600">{qrCodeError}</p>
              )}

              <p className="mt-3 text-xs text-slate-500">
                The QR code image will be displayed in payment dialogs during checkout. Recommended size: 200x200 pixels or larger, square format.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-600 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Live preview</h3>
          <p className="mt-2 text-xs text-slate-400">This is how the copy will appear in the checkout confirmation dialog.</p>
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
            {formValues.checkoutTerms.trim().length > 0 ? formValues.checkoutTerms : 'Terms and conditions are empty. Customers will be asked to accept a blank statement.'}
          </div>
        </section>

        {/* Action Buttons */}
        <section className="sticky bottom-0 rounded-t-2xl border-t border-slate-200 bg-white p-6 shadow-lg">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:bg-purple-300"
              disabled={saving || showLoadingState || !hasChanges}
            >
              <Save className="h-4 w-4" aria-hidden />
              Save changes
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving || showLoadingState || !hasChanges}
            >
              <RefreshCcw className="h-4 w-4" aria-hidden />
              Revert
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving || showLoadingState || formValues.checkoutTerms.length === 0}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Clear
            </button>
            {dirty && hasChanges && !saving && (
              <span className="text-xs font-semibold uppercase tracking-wide text-amber-500">Unsaved changes</span>
            )}
          </div>
        </section>
      </form>
    </div>
  );
};

export default SiteSettingsPage;
