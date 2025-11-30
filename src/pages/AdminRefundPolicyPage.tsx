import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, RefreshCw, Pencil, Trash2, ToggleLeft, ToggleRight, Layers, Percent, Coins, AlertTriangle, Tag } from 'lucide-react';
import Dialog from '../components/Dialog';
import ConfirmDialog from '../components/ConfirmDialog';
import ToggleSwitch from '../components/ToggleSwitch';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import { useRefundPolicyStore } from '../stores/refundPolicyStore';
import { useToastStore } from '../stores/toastStore';
import type { RefundPolicySchema, RefundTierSchema, RefundPolicyCreateInput, RefundPolicyUpdateInput, RefundSource } from '../schemas/RefundPolicySchema';
import { useDayDiscountsStore } from '../stores/dayDiscountsStore';
import { useCategoriesStore } from '../stores/categoriesStore';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';

type TierFormState = {
	key: string;
	id?: string;
	label: string;
	startDay: string;
	endDay: string;
	refundPercent: string;
	refundSource: RefundSource;
};

type SubscriptionOption = {
	id: string;
	value: number;
	label: string;
	description?: string | null;
	discountId: string | null;
};

type RefundPolicyRow = {
	id: string;
	name: string;
	active: boolean;
	subscriptionLengthDays: number;
	subscriptionDayDiscountId: string | null | undefined;
	linkedDiscountLabel: string | null;
	linkedDiscountId: string | null;
	categoriesLabel: string;
	tierCount: number;
	policy: RefundPolicySchema;
};

interface FormState {
	name: string;
	subscriptionLengthDays: string;
	subscriptionOptionKey: string | null;
	subscriptionDayDiscountId: string | null;
	active: boolean;
	tiers: TierFormState[];
	categoryIds: string[];
}

const createEmptyTier = (startDay = '0'): TierFormState => ({
	key: Math.random().toString(36).slice(2),
	label: '',
	startDay,
	endDay: '',
	refundPercent: '100',
	refundSource: 'coins',
});

const mapTierToForm = (tier: RefundTierSchema, fallbackIndex: number): TierFormState => ({
	key: tier.id ?? `${fallbackIndex}-${Date.now()}`,
	id: tier.id,
	label: tier.label ?? '',
	startDay: String(tier.startDay ?? 0),
	endDay: tier.endDay !== undefined ? String(tier.endDay) : '',
	refundPercent: String(tier.refundPercent ?? 0),
	refundSource: tier.refundSource ?? 'coins',
});

const defaultFormState = (): FormState => ({
	name: '',
	subscriptionLengthDays: '',
	subscriptionOptionKey: null,
	subscriptionDayDiscountId: null,
	active: true,
	tiers: [createEmptyTier()],
	categoryIds: [],
});

const parseSubscriptionLength = (value: string): number | null => {
	const trimmed = value.trim();
	if (trimmed === '') {
		return null;
	}
	const numeric = Number(trimmed);
	if (!Number.isFinite(numeric) || numeric <= 0) {
		return null;
	}
	return Math.max(1, Math.floor(numeric));
};

const sanitizeDayValue = (value: string): string => {
	const trimmed = value.trim();
	if (trimmed === '') {
		return '';
	}
	const numeric = Number(trimmed);
	if (!Number.isFinite(numeric)) {
		return '';
	}
	return String(Math.max(0, Math.floor(numeric)));
};

const clampDayValue = (value: string, limit: number | null): string => {
	const sanitised = sanitizeDayValue(value);
	if (sanitised === '') {
		return '';
	}
	if (limit == null || limit < 0) {
		return sanitised;
	}
	const numeric = Number(sanitised);
	return String(Math.min(numeric, limit));
};

const normalizeTierDays = (tier: TierFormState, limit: number | null): TierFormState => {
	const normalisedStart = clampDayValue(tier.startDay, limit);
	let normalisedEnd = tier.endDay.trim() === '' ? '' : clampDayValue(tier.endDay, limit);
	if (normalisedEnd !== '') {
		const startNum = Number(normalisedStart || '0');
		let endNum = Number(normalisedEnd || '0');
		if (Number.isFinite(startNum) && Number.isFinite(endNum) && endNum < startNum) {
			endNum = startNum;
		}
		normalisedEnd = String(endNum);
	}
	return {
		...tier,
		startDay: normalisedStart,
		endDay: normalisedEnd,
	};
};

const clampTiersToSubscription = (tiers: TierFormState[], limit: number | null): TierFormState[] =>
	tiers.map((tier) => normalizeTierDays(tier, limit));

const AdminRefundPolicyPage: React.FC = () => {
	const policies = useRefundPolicyStore((state) => state.policies);
	const loading = useRefundPolicyStore((state) => state.loading);
	const initialized = useRefundPolicyStore((state) => state.initialized);
	const storeError = useRefundPolicyStore((state) => state.error);
	const fetchPolicies = useRefundPolicyStore((state) => state.fetchPolicies);
	const createPolicy = useRefundPolicyStore((state) => state.createPolicy);
	const updatePolicy = useRefundPolicyStore((state) => state.updatePolicy);
	const deletePolicy = useRefundPolicyStore((state) => state.deletePolicy);
	const totalItems = useRefundPolicyStore((state) => state.totalItems);
	const paginatedData = useRefundPolicyStore((state) => state.paginatedData);
	const addToast = useToastStore((state) => state.addToast);
	const dayDiscounts = useDayDiscountsStore((state) => state.discounts);
	const dayDiscountsLoading = useDayDiscountsStore((state) => state.loading);
	const loadDayDiscounts = useDayDiscountsStore((state) => state.loadDiscounts);
	const categories = useCategoriesStore((state) => state.categories);
	const categoriesLoading = useCategoriesStore((state) => state.loading);
	const loadCategories = useCategoriesStore((state) => state.loadCategories);

	const [modalOpen, setModalOpen] = useState(false);
	const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
	const [formState, setFormState] = useState<FormState>(() => defaultFormState());
	const [validationErrors, setValidationErrors] = useState<string[]>([]);
	const [submitting, setSubmitting] = useState(false);
	const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<RefundPolicySchema | null>(null);
	const [deleteLoading, setDeleteLoading] = useState(false);
	const [togglingId, setTogglingId] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(1000);
	const [searchField, setSearchField] = useState('name');
	const [searchValue, setSearchValue] = useState('');
	const searchFields = useMemo(() => getSearchFieldsForCollection('refundPolicies'), []);
	const dayDiscountsLoadedRef = useRef(false);
	const categoriesLoadedRef = useRef(false);

	useEffect(() => {
		const search = searchValue ? { field: searchField, type: 'text' as const, value: searchValue } : null;
		void paginatedData({ pageNumber: currentPage, pageSize, search });
	}, [currentPage, pageSize, searchField, searchValue, paginatedData]);

	// Reset to page 1 when search changes
	useEffect(() => {
		setCurrentPage(1);
	}, [searchField, searchValue]);

	useEffect(() => {
		if (!initialized) {
			void fetchPolicies();
		}
	}, [initialized, fetchPolicies]);

	useEffect(() => {
		if (storeError) {
			addToast(storeError, 'error');
		}
	}, [storeError, addToast]);

	useEffect(() => {
		if (!dayDiscountsLoadedRef.current) {
			dayDiscountsLoadedRef.current = true;
			void loadDayDiscounts();
		}
	}, [loadDayDiscounts]);

	useEffect(() => {
		if (!categoriesLoadedRef.current) {
			categoriesLoadedRef.current = true;
			void loadCategories();
		}
	}, [loadCategories]);

	const stats = useMemo(() => ({
		total: policies.length,
		active: policies.filter((policy) => policy.active).length,
		inactive: policies.filter((policy) => !policy.active).length,
		tiers: policies.reduce((count, policy) => count + policy.tiers.length, 0),
	}), [policies]);

	const subscriptionOptions = useMemo<SubscriptionOption[]>(() => {
		const options: SubscriptionOption[] = [];
		dayDiscounts.forEach((discount, index) => {
			const dayCount = Number.isFinite(discount.dayCount) ? Math.max(1, Math.round(discount.dayCount)) : undefined;
			if (!dayCount) {
				return;
			}
			const daysLabel = `${dayCount} day${dayCount === 1 ? '' : 's'}`;
			const descriptionSuffix = discount.description ? ` - ${discount.description}` : '';
			const displayLabel = `${discount.label} (${daysLabel})${descriptionSuffix}`;
			options.push({
				id: discount.id ?? `day-${dayCount}-${index}`,
				value: dayCount,
				label: displayLabel,
				description: discount.description ?? undefined,
				discountId: discount.id ?? null,
			});
		});
		return options.sort((a, b) => {
			if (a.value !== b.value) {
				return a.value - b.value;
			}
			return a.label.localeCompare(b.label);
		});
	}, [dayDiscounts]);

	const subscriptionOptionList = useMemo(() => {
		const currentValue = formState.subscriptionLengthDays.trim();
		if (!currentValue) {
			return subscriptionOptions;
		}
		const numericValue = Number(currentValue);
		if (!Number.isFinite(numericValue) || numericValue <= 0) {
			return subscriptionOptions;
		}
		const normalisedValue = Math.max(1, Math.floor(numericValue));
		const selectedKey = formState.subscriptionOptionKey ?? '';
		const hasMatchingOption = selectedKey
			? subscriptionOptions.some((option) => option.id === selectedKey)
			: false;
		if (hasMatchingOption) {
			return subscriptionOptions;
		}
		const customKey = selectedKey || `custom-${normalisedValue}`;
		const customLabel = `${normalisedValue} day${normalisedValue === 1 ? '' : 's'} (unlinked)`;
		return [...subscriptionOptions, {
			id: customKey,
			value: normalisedValue,
			label: customLabel,
			discountId: null,
		}].sort((a, b) => {
			if (a.value !== b.value) {
				return a.value - b.value;
			}
			return a.label.localeCompare(b.label);
		});
	}, [subscriptionOptions, formState.subscriptionLengthDays, formState.subscriptionOptionKey]);

	const subscriptionOptionByDiscountId = useMemo(() => {
		const map = new Map<string, SubscriptionOption>();
		subscriptionOptions.forEach((option) => {
			if (option.discountId) {
				map.set(option.discountId, option);
			}
		});
		return map;
		}, [subscriptionOptions]);

	const selectedSubscriptionOption = useMemo(() => {
		if (!formState.subscriptionDayDiscountId) {
			return null;
		}
		return subscriptionOptionByDiscountId.get(formState.subscriptionDayDiscountId) ?? null;
	}, [formState.subscriptionDayDiscountId, subscriptionOptionByDiscountId]);

	const categoryOptions = useMemo(() => {
		return [...categories].sort((a, b) => a.name.localeCompare(b.name));
	}, [categories]);

	const categoryLabelMap = useMemo(() => {
		const map = new Map<string, string>();
		categories.forEach((category) => {
			if (category.id) {
				map.set(category.id, category.name);
			}
		});
		return map;
	}, [categories]);

	const closeModal = () => {
		setModalOpen(false);
		setValidationErrors([]);
		setFormState(defaultFormState());
		setEditingPolicyId(null);
		setSubmitting(false);
	};

	const handleCreateClick = useCallback(() => {
		setModalMode('create');
		setFormState(defaultFormState());
		setEditingPolicyId(null);
		setValidationErrors([]);
		setModalOpen(true);
	}, []);

	const handleEditClick = useCallback((policy: RefundPolicySchema) => {
		const orderedTiers = [...policy.tiers].sort((a, b) => a.startDay - b.startDay);
		const subscriptionLengthValue = policy.subscriptionLengthDays != null ? String(policy.subscriptionLengthDays) : '';
		const limit = parseSubscriptionLength(subscriptionLengthValue);
		const formTiers = orderedTiers.length > 0 ? orderedTiers.map(mapTierToForm) : [createEmptyTier()];
		const matchingOption = subscriptionOptions.find((option) => option.discountId && option.discountId === policy.subscriptionDayDiscountId)
			|| subscriptionOptions.find((option) => option.value === Number(subscriptionLengthValue));
		const subscriptionOptionKey = matchingOption
			? matchingOption.id
			: subscriptionLengthValue
				? `custom-${subscriptionLengthValue}`
				: null;
		setModalMode('edit');
		setFormState({
			name: policy.name ?? '',
			subscriptionLengthDays: subscriptionLengthValue,
			subscriptionOptionKey,
			subscriptionDayDiscountId: matchingOption?.discountId ?? policy.subscriptionDayDiscountId ?? null,
			active: policy.active,
			tiers: clampTiersToSubscription(formTiers, limit),
			categoryIds: [...(policy.appliesToCategoryIds ?? [])],
		});
		setEditingPolicyId(policy.id ?? null);
		setValidationErrors([]);
		setModalOpen(true);
		}, [subscriptionOptions]);

	const handleFieldChange = (field: keyof FormState, value: string | boolean) => {
		setFormState((prev) => {
			if (field === 'subscriptionLengthDays' && typeof value === 'string') {
				const limit = parseSubscriptionLength(value);
				return {
					...prev,
					subscriptionLengthDays: value,
					subscriptionOptionKey: value ? `custom-${value}` : null,
					subscriptionDayDiscountId: null,
					tiers: clampTiersToSubscription(prev.tiers, limit),
				};
			}
			return {
				...prev,
				[field]: value,
			};
		});
	};

	const handleSubscriptionSelectChange = (optionId: string) => {
		setFormState((prev) => {
			if (!optionId) {
				return {
					...prev,
					subscriptionLengthDays: '',
					subscriptionOptionKey: null,
					subscriptionDayDiscountId: null,
					tiers: clampTiersToSubscription(prev.tiers, null),
				};
			}
			const selectedOption = subscriptionOptionList.find((option) => option.id === optionId);
			const dayValue = selectedOption
				? String(selectedOption.value)
				: optionId.startsWith('custom-')
					? optionId.slice('custom-'.length)
					: '';
			const limit = parseSubscriptionLength(dayValue);
			return {
				...prev,
				subscriptionLengthDays: dayValue,
				subscriptionOptionKey: optionId,
				subscriptionDayDiscountId: selectedOption?.discountId ?? null,
				tiers: clampTiersToSubscription(prev.tiers, limit),
			};
		});
	};

	const handleCategoryToggle = (categoryId: string) => {
		setFormState((prev) => {
			const exists = prev.categoryIds.includes(categoryId);
			const nextIds = exists
				? prev.categoryIds.filter((id) => id !== categoryId)
				: [...prev.categoryIds, categoryId];
			return {
				...prev,
				categoryIds: nextIds,
			};
		});
	};

	const handleTierChange = <K extends keyof TierFormState>(tierKey: string, field: K, value: TierFormState[K]) => {
		setFormState((prev) => {
			const limit = parseSubscriptionLength(prev.subscriptionLengthDays);
			return {
				...prev,
				tiers: prev.tiers.map((tier) => {
					if (tier.key !== tierKey) {
						return normalizeTierDays(tier, limit);
					}
					const updatedTier = { ...tier, [field]: value } as TierFormState;
					return normalizeTierDays(updatedTier, limit);
				}),
			};
		});
	};

	const handleAddTier = () => {
		setFormState((prev) => {
			const sorted = [...prev.tiers].sort((a, b) => Number(a.startDay || '0') - Number(b.startDay || '0'));
			const last = sorted[sorted.length - 1];
			const suggestedStart = last
				? String((last.endDay && last.endDay !== '' ? Number(last.endDay) + 1 : Number(last.startDay || '0') + 1) || 0)
				: '0';
			const limit = parseSubscriptionLength(prev.subscriptionLengthDays);
			return {
				...prev,
				tiers: [...prev.tiers, normalizeTierDays(createEmptyTier(suggestedStart), limit)],
			};
		});
	};

	const handleRemoveTier = (tierKey: string) => {
		setFormState((prev) => {
			if (prev.tiers.length <= 1) {
				return prev;
			}
			return {
				...prev,
				tiers: prev.tiers.filter((tier) => tier.key !== tierKey),
			};
		});
	};

	const buildTierPayload = (subscriptionLimitOverride?: number | null): { tiers: RefundTierSchema[]; errors: string[] } => {
		const errors: string[] = [];
		const subscriptionLimit = subscriptionLimitOverride ?? parseSubscriptionLength(formState.subscriptionLengthDays);
		const maxDay = subscriptionLimit ?? Number.MAX_SAFE_INTEGER;
		const parsed: RefundTierSchema[] = formState.tiers.map((tier, index) => {
			const startDay = tier.startDay.trim() === '' ? NaN : Number(tier.startDay);
			if (!Number.isFinite(startDay) || startDay < 0) {
				errors.push(`Tier ${index + 1}: Start day must be a non-negative number.`);
			}

			const endDay = tier.endDay.trim() === '' ? undefined : Number(tier.endDay);
			if (endDay !== undefined && (!Number.isFinite(endDay) || endDay < startDay)) {
				errors.push(`Tier ${index + 1}: End day must be a number greater than or equal to start day.`);
			}

			const refundPercent = tier.refundPercent.trim() === '' ? NaN : Number(tier.refundPercent);
			if (!Number.isFinite(refundPercent) || refundPercent < 0 || refundPercent > 100) {
				errors.push(`Tier ${index + 1}: Refund percent must be between 0 and 100.`);
			}

			const normalisedStart = Number.isFinite(startDay) ? Math.max(0, Math.floor(startDay)) : 0;
			const cappedStart = Math.min(normalisedStart, maxDay);
			let cappedEnd: number | undefined;
			if (endDay !== undefined && Number.isFinite(endDay)) {
				const normalisedEnd = Math.max(0, Math.floor(endDay));
				cappedEnd = Math.min(normalisedEnd, maxDay);
				if (cappedEnd < cappedStart) {
					cappedEnd = cappedStart;
				}
			}

			return {
				id: tier.id,
				label: tier.label.trim() || undefined,
				startDay: cappedStart,
				endDay: cappedEnd,
				refundPercent: Number.isFinite(refundPercent) ? Math.min(100, Math.max(0, refundPercent)) : 0,
				refundSource: tier.refundSource ?? 'coins',
			};
		});

		const ordered = parsed.sort((a, b) => a.startDay - b.startDay);
		for (let i = 0; i < ordered.length - 1; i += 1) {
			const current = ordered[i];
			const next = ordered[i + 1];
			if (current.endDay === undefined) {
				errors.push(`Tier ${i + 1}: End day must be set before the next tier starts.`);
			} else if (current.endDay >= next.startDay) {
				errors.push(`Tiers ${i + 1} and ${i + 2} overlap. Adjust start/end days.`);
			}
		}

		return { tiers: ordered, errors };
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setValidationErrors([]);

		const formData = new FormData(event.currentTarget);
		const submittedOptionKey = (formData.get('subscriptionLength') ?? formState.subscriptionOptionKey ?? '') as string;
		let resolvedSubscriptionLengthValue = formState.subscriptionLengthDays;
		let matchedOption: SubscriptionOption | undefined;
		if (submittedOptionKey) {
			matchedOption = subscriptionOptionList.find((option) => option.id === submittedOptionKey);
			if (matchedOption) {
				resolvedSubscriptionLengthValue = String(matchedOption.value);
			} else if (submittedOptionKey.startsWith('custom-')) {
				resolvedSubscriptionLengthValue = submittedOptionKey.slice('custom-'.length);
			}
		}
		const selectedDiscountId = matchedOption?.discountId
			?? (submittedOptionKey && !submittedOptionKey.startsWith('custom-') ? formState.subscriptionDayDiscountId : null);
		console.debug('[RefundPolicy] Submit selection', {
			submittedOptionKey,
			resolvedSubscriptionLengthValue,
			matchedOptionId: matchedOption?.id ?? null,
			matchedOptionDiscountId: selectedDiscountId,
			prevState: {
				subscriptionLengthDays: formState.subscriptionLengthDays,
				subscriptionOptionKey: formState.subscriptionOptionKey,
				subscriptionDayDiscountId: formState.subscriptionDayDiscountId,
			},
		});

		if (
			resolvedSubscriptionLengthValue !== formState.subscriptionLengthDays
			|| (submittedOptionKey && submittedOptionKey !== formState.subscriptionOptionKey)
		) {
			setFormState((prev) => ({
				...prev,
				subscriptionLengthDays: resolvedSubscriptionLengthValue,
				subscriptionOptionKey: submittedOptionKey || null,
				subscriptionDayDiscountId: selectedDiscountId,
			}));
		}

		const errors: string[] = [];
		const name = formState.name.trim();
		if (!name) {
			errors.push('Policy name is required.');
		}

		const subscriptionLength = resolvedSubscriptionLengthValue.trim() === ''
			? NaN
			: Number(resolvedSubscriptionLengthValue);
		const normalisedSubscriptionLength = Number.isFinite(subscriptionLength) && subscriptionLength > 0
			? Math.max(1, Math.floor(subscriptionLength))
			: NaN;
		if (!Number.isFinite(normalisedSubscriptionLength)) {
			errors.push('Subscription length must be a positive number of days.');
		}

		if (formState.tiers.length === 0) {
			errors.push('Add at least one refund tier.');
		}

		const { tiers, errors: tierErrors } = buildTierPayload(Number.isFinite(normalisedSubscriptionLength) ? normalisedSubscriptionLength : null);
		if (tierErrors.length > 0) {
			errors.push(...tierErrors);
		}

		if (errors.length > 0) {
			setValidationErrors(errors);
			return;
		}

		const payload: RefundPolicyCreateInput | RefundPolicyUpdateInput = {
			name,
			subscriptionLengthDays: normalisedSubscriptionLength,
			subscriptionDayDiscountId: selectedDiscountId,
			tiers,
			appliesToCategoryIds: formState.categoryIds,
			active: formState.active,
		};
		console.debug('[RefundPolicy] Payload prepared', payload);

		try {
			setSubmitting(true);
			if (modalMode === 'create') {
				const id = await createPolicy(payload as RefundPolicyCreateInput);
				if (id) {
					addToast('Refund policy created successfully.', 'success');
				}
			} else if (modalMode === 'edit' && editingPolicyId) {
				await updatePolicy(editingPolicyId, payload as RefundPolicyUpdateInput);
				addToast('Refund policy updated.', 'success');
			}
			closeModal();
		} catch (error) {
			console.error('Failed to save refund policy', error);
			addToast((error as Error).message ?? 'Failed to save refund policy.', 'error');
		} finally {
			setSubmitting(false);
		}
	};

	const handleToggleActive = useCallback(async (policy: RefundPolicySchema) => {
		if (!policy.id) return;
		try {
			setTogglingId(policy.id);
			await updatePolicy(policy.id, { active: !policy.active });
			addToast(`Policy ${policy.active ? 'disabled' : 'activated'}.`, 'success');
			await fetchPolicies();
		} catch (error) {
			console.error('Failed to toggle policy active state', error);
			addToast((error as Error).message ?? 'Failed to update policy.', 'error');
		} finally {
			setTogglingId(null);
		}
	}, [updatePolicy, addToast, fetchPolicies]);

	const confirmDelete = useCallback((policy: RefundPolicySchema) => {
		setDeleteTarget(policy);
	}, []);

	const handleDelete = async () => {
		if (!deleteTarget || !deleteTarget.id) return;
		try {
			setDeleteLoading(true);
			await deletePolicy(deleteTarget.id);
			addToast('Refund policy deleted.', 'success');
			setDeleteTarget(null);
		} catch (error) {
			console.error('Failed to delete policy', error);
			addToast((error as Error).message ?? 'Failed to delete policy.', 'error');
		} finally {
			setDeleteLoading(false);
		}
	};

	const handleRefresh = () => {
		void fetchPolicies();
	};

	const refundPolicyTableData = useMemo<RefundPolicyRow[]>(() => {
		return policies.map((policy, index) => {
			const fallbackId = policy.id ?? `policy-${index}`;
			const linkedOption = policy.subscriptionDayDiscountId
				? subscriptionOptionByDiscountId.get(policy.subscriptionDayDiscountId)
				: null;
			const categoriesLabel = policy.appliesToCategoryIds && policy.appliesToCategoryIds.length > 0
				? policy.appliesToCategoryIds
					.map((id) => categoryLabelMap.get(id) ?? id)
					.join(', ')
				: 'All categories';
			return {
				id: fallbackId,
				name: policy.name ?? 'Untitled Policy',
				active: policy.active,
				subscriptionLengthDays: policy.subscriptionLengthDays ?? 0,
				subscriptionDayDiscountId: policy.subscriptionDayDiscountId,
				linkedDiscountLabel: linkedOption?.label ?? null,
				linkedDiscountId: policy.subscriptionDayDiscountId ?? null,
				categoriesLabel,
				tierCount: policy.tiers.length,
				policy,
			};
		});
	}, [policies, categoryLabelMap, subscriptionOptionByDiscountId]);

	const refundPolicyColumns = useMemo<DataTableColumnDef<RefundPolicyRow>[]>(() => [
		{
			accessorKey: 'name',
			header: 'Policy',
			cell: ({ row }) => {
				const { policy, categoriesLabel } = row.original;
				return (
					<div className="flex flex-col gap-1">
						<div className="flex items-center gap-2">
							<span className="text-sm font-semibold text-gray-900">{policy.name ?? 'Untitled Policy'}</span>
							<span
								className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
									policy.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
								}`}
							>
								{policy.active ? 'Active' : 'Inactive'}
							</span>
						</div>
						<div className="text-xs text-gray-500">
							<span className="font-medium text-gray-600">Categories:</span>{' '}
							{categoriesLabel}
						</div>
					</div>
				);
			},
			meta: {
				cellClassName: 'align-top',
			},
		},
		{
			accessorKey: 'subscriptionLengthDays',
			header: 'Subscription',
			cell: ({ row }) => {
				const { subscriptionLengthDays, linkedDiscountLabel, linkedDiscountId } = row.original;
				return (
					<div className="flex flex-col gap-1 text-sm text-gray-700">
						<span className="font-medium text-gray-900">{subscriptionLengthDays} day(s)</span>
						{linkedDiscountLabel ? (
							<span className="flex items-center gap-1 text-xs text-purple-600">
								<Tag className="h-3 w-3" />
								<span className="font-medium">{linkedDiscountLabel}</span>
								{linkedDiscountId ? (
									<span className="text-[10px] text-purple-400">({linkedDiscountId})</span>
								) : null}
							</span>
						) : linkedDiscountId ? (
							<span className="text-xs text-amber-600">Linked ID: {linkedDiscountId}</span>
						) : (
							<span className="text-xs text-gray-500">No linked discount</span>
						)}
					</div>
				);
			},
		},
		{
			id: 'tiers',
			header: 'Tiers',
			size: 320,
			cell: ({ row }) => {
				const { policy } = row.original;
				return (
					<div className="flex flex-col gap-2">
						{policy.tiers.map((tier, index) => (
							<div key={tier.id ?? `${policy.id ?? 'policy'}-tier-${index}`} className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
								<span className="font-medium text-gray-700">{tier.label || `Tier ${index + 1}`}</span>
								<span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
									<Percent className="h-3 w-3" />
									{tier.refundPercent}%
								</span>
								<span className="text-[11px] text-gray-500">
									Days {tier.startDay}
									{tier.endDay !== undefined ? ` - ${tier.endDay}` : '+'}
								</span>
								<span className="text-[11px] text-gray-500">via {tier.refundSource === 'coins' ? 'Coins' : tier.refundSource}</span>
							</div>
						))}
					</div>
				);
			},
			meta: {
				cellClassName: 'align-top',
			},
		},
		{
			id: 'status',
			header: 'Status',
			enableSorting: false,
			cell: ({ row }) => {
				const { policy } = row.original;
				const isToggling = togglingId === policy.id;
				return (
					<div className="flex flex-col items-start gap-2">
						<ToggleSwitch
							checked={policy.active}
							disabled={isToggling}
							onChange={() => {
								void handleToggleActive(policy);
							}}
							ariaLabel={`Set policy ${policy.name ?? 'untitled'} ${policy.active ? 'inactive' : 'active'}`}
						/>
					</div>
				);
			},
			meta: {
				cellClassName: 'align-top',
			},
		},
		{
			id: 'actions',
			header: 'Actions',
			enableSorting: false,
			cell: ({ row }) => {
				const { policy } = row.original;
				return (
					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							onClick={() => handleEditClick(policy)}
							className="inline-flex items-center gap-2 rounded-md border border-purple-200 bg-white px-3 py-1.5 text-xs font-medium text-purple-700 transition hover:bg-purple-50"
						>
							<Pencil className="h-4 w-4" />
							Edit
						</button>
						<button
							type="button"
							onClick={() => confirmDelete(policy)}
							className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
						>
							<Trash2 className="h-4 w-4" />
							Delete
						</button>
					</div>
				);
			},
			meta: {
				cellClassName: 'align-top text-right',
			},
		},
	], [togglingId, handleToggleActive, handleEditClick, confirmDelete]);

	const emptyTableMessage = (
		<div className="py-16 text-center">
			<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-600">
				<Coins className="h-6 w-6" />
			</div>
			<h2 className="mt-4 text-xl font-semibold text-gray-900">No refund policies yet</h2>
			<p className="mt-2 text-gray-600">Create your first policy to control refund tiers for subscriptions.</p>
			<button
				type="button"
				onClick={handleCreateClick}
				className="mt-6 inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
			>
				<Plus className="h-4 w-4" />
				Create Policy
			</button>
		</div>
	);

	return (
		<div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
			<div className="max-w-7xl mx-auto space-y-8">
				<div className="flex items-start justify-between flex-wrap gap-4">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Refund Policies</h1>
						<p className="mt-2 text-gray-600">
							Define refund tiers for subscriptions and control how coins are returned to users.
						</p>
					</div>
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={handleRefresh}
							className="inline-flex items-center gap-2 rounded-md border border-purple-200 bg-white px-4 py-2 text-sm font-medium text-purple-700 shadow-sm transition hover:bg-purple-50"
						>
							<RefreshCw className="h-4 w-4" />
							Refresh
						</button>
						<button
							type="button"
							onClick={handleCreateClick}
							className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
						>
							<Plus className="h-4 w-4" />
							New Policy
						</button>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="rounded-lg border border-purple-100 bg-white p-4 shadow-sm">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium text-gray-600">Total Policies</span>
							<Layers className="h-5 w-5 text-purple-500" />
						</div>
						<p className="mt-2 text-2xl font-bold text-gray-900">{stats.total}</p>
					</div>
					<div className="rounded-lg border border-green-100 bg-white p-4 shadow-sm">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium text-gray-600">Active Policies</span>
							<ToggleRight className="h-5 w-5 text-green-500" />
						</div>
						<p className="mt-2 text-2xl font-bold text-gray-900">{stats.active}</p>
					</div>
					<div className="rounded-lg border border-yellow-100 bg-white p-4 shadow-sm">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium text-gray-600">Inactive Policies</span>
							<ToggleLeft className="h-5 w-5 text-yellow-500" />
						</div>
						<p className="mt-2 text-2xl font-bold text-gray-900">{stats.inactive}</p>
					</div>
					<div className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium text-gray-600">Total Tiers</span>
							<Percent className="h-5 w-5 text-blue-500" />
						</div>
						<p className="mt-2 text-2xl font-bold text-gray-900">{stats.tiers}</p>
					</div>
				</div>


			<DataTable<RefundPolicyRow>
				columns={refundPolicyColumns}
				data={refundPolicyTableData}
				loading={loading}
				emptyMessage={emptyTableMessage}
				wrapperClassName="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
				tableClassName="min-w-full divide-y divide-gray-200 text-left text-sm"
				headerBaseClassName="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500"
				cellBaseClassName="px-6 py-4 text-sm text-gray-700 align-middle"
				pagination={{
					currentPage,
					pageSize,
					totalItems: totalItems ?? 0,
					onPageChange: setCurrentPage,
					onPageSizeChange: setPageSize,
				}}
				searchFields={searchFields.map(f => ({ value: f.name, label: f.label }))}
				searchField={searchField}
				searchValue={searchValue}
				onSearchFieldChange={setSearchField}
				onSearchValueChange={setSearchValue}
			/>
		</div>			<Dialog
				open={modalOpen}
				onClose={closeModal}
				title={modalMode === 'create' ? 'Create Refund Policy' : 'Edit Refund Policy'}
				size="xxl"
				footer={(
					<div className="flex items-center justify-end gap-3">
						<button
							type="button"
							onClick={closeModal}
							className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
							disabled={submitting}
						>
							Cancel
						</button>
						<button
							type="submit"
							form="refund-policy-form"
							className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:opacity-60"
							disabled={submitting}
						>
							{submitting ? 'Saving…' : modalMode === 'create' ? 'Create Policy' : 'Save Changes'}
						</button>
					</div>
				)}
			>
				<form id="refund-policy-form" className="space-y-6" onSubmit={handleSubmit}>
					{validationErrors.length > 0 && (
						<div className="rounded-md border border-red-200 bg-red-50 p-4">
							<div className="flex items-start gap-3">
								<AlertTriangle className="h-5 w-5 text-red-500" />
								<div>
									<h3 className="text-sm font-semibold text-red-700">Please fix the following:</h3>
									<ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-600">
										{validationErrors.map((error) => (
											<li key={error}>{error}</li>
										))}
									</ul>
								</div>
							</div>
						</div>
					)}

					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<label className="block text-sm font-medium text-gray-700">Policy Name</label>
							<input
								type="text"
								value={formState.name}
								onChange={(event) => handleFieldChange('name', event.target.value)}
								className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
								placeholder="e.g. Monthly Subscription Refund"
								required
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700">Subscription Length</label>
							<select
								name="subscriptionLength"
								value={formState.subscriptionOptionKey ?? ''}
								onChange={(event) => handleSubscriptionSelectChange(event.target.value)}
								className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
								required
								disabled={subscriptionOptionList.length === 0 && !formState.subscriptionLengthDays}
							>
								<option value="">Select subscription length</option>
								{subscriptionOptionList.map((option) => (
									<option key={option.id} value={option.id}>
										{option.label}
									</option>
								))}
							</select>
							<div className="mt-1 space-y-1">
								{dayDiscountsLoading ? (
									<p className="text-xs text-gray-500">Loading subscription lengths…</p>
								) : null}
								{subscriptionOptionList.length === 0 ? (
									<p className="text-xs text-red-500">
										Configure subscription durations in the Days &amp; Discounts page to enable refund policies.
									</p>
								) : (
									<p className="text-xs text-gray-500">Options mirror the day counts defined in Days &amp; Discounts.</p>
								)}
								{formState.subscriptionDayDiscountId ? (
									<p className="text-xs text-purple-600">
										Linked discount:{' '}
										<span className="font-medium">
											{selectedSubscriptionOption?.label ?? `ID ${formState.subscriptionDayDiscountId}`}
										</span>
									</p>
								) : (
									<p className="text-xs text-gray-500">Choose a Days &amp; Discounts entry to link this policy.</p>
								)}
							</div>
						</div>
					</div>

					<div>
						<div className="flex items-center justify-between">
							<label className="block text-sm font-medium text-gray-700">Applies to Categories</label>
							{formState.categoryIds.length > 0 ? (
								<button
									type="button"
									onClick={() => setFormState((prev) => ({ ...prev, categoryIds: [] }))}
									className="text-xs font-medium text-purple-600 hover:text-purple-700"
								>
									Clear selection
								</button>
							) : null}
						</div>
						<div className="mt-2 rounded-md border border-gray-200 bg-white p-3">
							{categoriesLoading ? (
								<div className="flex items-center gap-2 text-sm text-gray-500">
									<RefreshCw className="h-4 w-4 animate-spin" />
									<span>Loading categories…</span>
								</div>
							) : categoryOptions.length === 0 ? (
								<p className="text-sm text-gray-500">No categories found. Create categories to target policies.</p>
							) : (
								<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
									{categoryOptions.map((category) => (
										<label key={category.id} className="flex items-center gap-2 rounded-md border border-transparent px-2 py-1 text-sm text-gray-700 hover:bg-purple-50">
											<input
												type="checkbox"
												checked={formState.categoryIds.includes(category.id)}
												onChange={() => handleCategoryToggle(category.id)}
												className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
											/>
											<span>{category.name}</span>
										</label>
									))}
								</div>
							)}
						</div>
						<p className="mt-2 text-xs text-gray-500">Leave blank to apply this policy to every category.</p>
					</div>

					<div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
						<div>
							<p className="text-sm font-medium text-gray-800">Policy is {formState.active ? 'Active' : 'Inactive'}</p>
							<p className="text-xs text-gray-500">Inactive policies will not be applied during refunds.</p>
						</div>
						<div className="flex flex-col items-center gap-1">
							<ToggleSwitch
								checked={formState.active}
								onChange={(nextValue) => handleFieldChange('active', nextValue)}
								ariaLabel={`Set policy ${formState.active ? 'inactive' : 'active'}`}
							/>
							<span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
								{formState.active ? 'On' : 'Off'}
							</span>
						</div>
					</div>

					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="text-lg font-semibold text-gray-900">Refund Tiers</h3>
							<button
								type="button"
								onClick={handleAddTier}
								className="inline-flex items-center gap-2 rounded-md border border-purple-200 bg-white px-3 py-1.5 text-sm font-medium text-purple-700 transition hover:bg-purple-50"
							>
								<Plus className="h-4 w-4" />
								Add Tier
							</button>
						</div>

						<div className="space-y-4">
							{formState.tiers.map((tier, index) => (
								<div key={tier.key} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
									<div className="flex items-center justify-between">
										<h4 className="text-sm font-semibold text-gray-800">Tier {index + 1}</h4>
										<button
											type="button"
											onClick={() => handleRemoveTier(tier.key)}
											className="text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-60"
											disabled={formState.tiers.length <= 1}
										>
											Remove
										</button>
									</div>

									<div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
										<div>
											<label className="block text-xs font-medium text-gray-600">Label</label>
											<input
												type="text"
												value={tier.label}
												onChange={(event) => handleTierChange(tier.key, 'label', event.target.value)}
												className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
												placeholder="e.g. First Week"
											/>
										</div>
										<div>
											<label className="block text-xs font-medium text-gray-600">Start Day</label>
											<input
												type="number"
												min={0}
												value={tier.startDay}
												onChange={(event) => handleTierChange(tier.key, 'startDay', event.target.value)}
												className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
												required
											/>
										</div>
										<div>
											<label className="block text-xs font-medium text-gray-600">End Day (optional)</label>
											<input
												type="number"
												min={0}
												value={tier.endDay}
												onChange={(event) => handleTierChange(tier.key, 'endDay', event.target.value)}
												className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
												placeholder="Leave blank for open ended"
											/>
										</div>
										<div>
											<label className="block text-xs font-medium text-gray-600">Refund Percent</label>
											<input
												type="number"
												min={0}
												max={100}
												value={tier.refundPercent}
												onChange={(event) => handleTierChange(tier.key, 'refundPercent', event.target.value)}
												className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
												required
											/>
										</div>
										<div>
											<label className="block text-xs font-medium text-gray-600">Refund Source</label>
											<select
												value={tier.refundSource}
												onChange={(event) => handleTierChange(tier.key, 'refundSource', event.target.value as RefundSource)}
												className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
											>
												<option value="coins">Coins</option>
											</select>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</form>
			</Dialog>

			<ConfirmDialog
				open={Boolean(deleteTarget)}
				title="Delete refund policy?"
				description={deleteTarget ? (
					<span>
						This will permanently remove the policy <strong>{deleteTarget.name}</strong> and all of its tiers.
					</span>
				) : undefined}
				confirmLabel="Delete"
				cancelLabel="Cancel"
				variant="danger"
				onConfirm={handleDelete}
				onCancel={() => setDeleteTarget(null)}
				loading={deleteLoading}
			/>
		</div>
	);
};

export default AdminRefundPolicyPage;
