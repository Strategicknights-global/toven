import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	Ban,
	CalendarClock,
	CheckCircle2,
	ClipboardList,
	Eye,
	Layers,
	ListOrdered,
	Phone,
	User,
	UtensilsCrossed,
	XCircle,
} from 'lucide-react';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import Dialog from '../components/Dialog';
import IconButton from '../components/IconButton';
import { useSubscriptionRequestsStore } from '../stores/subscriptionRequestsStore';
import type { SubscriptionRequestSchema, SubscriptionRequestStatus } from '../schemas/SubscriptionRequestSchema';
import { auth } from '../firebase';
import { UserModel } from '../firestore';
import { ROUTES } from '../AppRoutes';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';
import { SubscriptionDepositModel } from '../firestore';
import { getDisplayCustomerId } from '../utils/customerDisplay';

const dietLabel: Record<'mixed' | 'pure-veg', string> = {
	mixed: 'Mixed diet',
	'pure-veg': 'Pure Veg',
};

const statusMeta: Record<SubscriptionRequestStatus, { label: string; badge: string; accent: string }> = {
	pending: {
		label: 'Pending review',
		badge: 'bg-amber-50 text-amber-700 border-amber-200',
		accent: 'text-amber-600',
	},
	approved: {
		label: 'Approved',
		badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
		accent: 'text-emerald-600',
	},
	rejected: {
		label: 'Rejected',
		badge: 'bg-red-50 text-red-600 border-red-200',
		accent: 'text-red-600',
	},
	cancelled: {
		label: 'Cancelled',
		badge: 'bg-gray-50 text-gray-600 border-gray-200',
		accent: 'text-gray-600',
	},
};

const formatCurrency = (value: number): string => {
	const rounded = Math.round(value);
	return `₹${rounded.toLocaleString('en-IN')}`;
};

const formatDate = (value?: Date | null): string => {
	if (!value || !(value instanceof Date) || Number.isNaN(value.getTime())) {
		return '—';
	}
	try {
		return new Intl.DateTimeFormat('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		}).format(value);
	} catch (error) {
		console.error('Failed to format date', error);
		return value.toLocaleDateString();
	}
};

const formatDateTime = (value?: Date | null): string => {
	if (!value || !(value instanceof Date) || Number.isNaN(value.getTime())) {
		return '—';
	}
	try {
		return new Intl.DateTimeFormat('en-IN', {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(value);
	} catch (error) {
		console.error('Failed to format datetime', error);
		return value.toLocaleString();
	}
};

const resolveImageSource = (value?: string | null): string | null => {
	if (!value || typeof value !== 'string') {
		return null;
	}
	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}
	if (/^(data:|https?:\/\/)/i.test(trimmed)) {
		return trimmed;
	}
	return `data:image/*;base64,${trimmed}`;
};

const SubscriptionRequestsPage: React.FC = () => {
	const {
		requests,
		loading,
		updatingId,
		loadRequests,
		updateStatus,
		totalItems,
		paginatedData,
	} = useSubscriptionRequestsStore();

	const navigate = useNavigate();

	const [viewingRequest, setViewingRequest] = useState<SubscriptionRequestSchema | null>(null);
	const [decisionRequest, setDecisionRequest] = useState<SubscriptionRequestSchema | null>(null);
	const [decisionAction, setDecisionAction] = useState<'approve' | 'reject' | 'cancel'>('approve');
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(1000);
	const [searchField, setSearchField] = useState('id');
	const [searchValue, setSearchValue] = useState('');
	const searchFields = useMemo(() => getSearchFieldsForCollection('subscriptionRequests'), []);
	const [decisionNote, setDecisionNote] = useState('');
	const [decisionError, setDecisionError] = useState<string | null>(null);
	const [decisionLoading, setDecisionLoading] = useState(false);
	const [reviewer, setReviewer] = useState<{ id: string; name: string } | null>(null);
	const [viewingPaymentProof, setViewingPaymentProof] = useState<{ imageSrc: string; fileName?: string } | null>(null);
	const [viewingDepositInvoice, setViewingDepositInvoice] = useState<{ imageSrc: string; fileName?: string } | null>(null);

	useEffect(() => {
		const search = searchValue ? { field: searchField, type: 'text' as const, value: searchValue } : null;
		void paginatedData({ pageNumber: currentPage, pageSize, search });
	}, [currentPage, pageSize, searchField, searchValue, paginatedData]);

	// Reset to page 1 when search changes
	useEffect(() => {
		setCurrentPage(1);
	}, [searchField, searchValue]);

		const initialLoadRef = useRef(false);
		useEffect(() => {
			if (initialLoadRef.current) {
				return;
			}
			initialLoadRef.current = true;
			void loadRequests();
		}, [loadRequests]);

	useEffect(() => {
		const currentUser = auth.currentUser;
		if (!currentUser) {
			return;
		}

		let active = true;
		(async () => {
			let resolvedName = currentUser.displayName?.trim() ?? '';
			try {
				const record = await UserModel.findById(currentUser.uid);
				if (record?.fullName && record.fullName.trim().length > 0) {
					resolvedName = record.fullName.trim();
				}
			} catch (error) {
				console.error('Failed to resolve reviewer name', error);
			}
			if (!resolvedName) {
				resolvedName = currentUser.email?.split('@')[0] ?? 'Admin';
			}
			if (active) {
				setReviewer({ id: currentUser.uid, name: resolvedName });
			}
		})();

		return () => {
			active = false;
		};
	}, []);

	const sortedRequests = useMemo(() => {
		return [...requests].sort((a, b) => {
			const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
			const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
			return bTime - aTime;
		});
	}, [requests]);

	const metrics = useMemo(() => {
		const totalRequests = requests.length;
		const pendingRequests = requests.filter((item) => item.status === 'pending');
		const approvedRequests = requests.filter((item) => item.status === 'approved');
		const rejectedRequests = requests.filter((item) => item.status === 'rejected');
		const cancelledRequests = requests.filter((item) => item.status === 'cancelled');
		const projectedRevenue = approvedRequests.reduce((sum, item) => sum + item.summary.totalPayable, 0);
		const pendingValue = pendingRequests.reduce((sum, item) => sum + item.summary.totalPayable, 0);
		const averageTicket = approvedRequests.length > 0
			? projectedRevenue / approvedRequests.length
			: 0;
		return {
			totalRequests,
			pending: pendingRequests.length,
			approved: approvedRequests.length,
			rejected: rejectedRequests.length,
			cancelled: cancelledRequests.length,
			projectedRevenue,
			pendingValue,
			averageTicket,
		};
	}, [requests]);

	const viewingRequestPaymentProofSrc = viewingRequest ? resolveImageSource(viewingRequest.paymentProofImageBase64) : null;
	const [viewingRequestDepositInvoiceSrc, setViewingRequestDepositInvoiceSrc] = useState<string | null>(null);
	const [viewingRequestDepositInvoiceFileName, setViewingRequestDepositInvoiceFileName] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		const loadDepositForViewingRequest = async () => {
			if (!viewingRequest || !viewingRequest.userId) {
				if (active) {
					setViewingRequestDepositInvoiceSrc(null);
					setViewingRequestDepositInvoiceFileName(null);
				}
				return;
			}

			try {
				const deposit = await SubscriptionDepositModel.findByUserId(viewingRequest.userId);
				if (!active) return;
				if (deposit?.invoiceImageBase64) {
					setViewingRequestDepositInvoiceSrc(resolveImageSource(deposit.invoiceImageBase64));
					setViewingRequestDepositInvoiceFileName(deposit.invoiceFileName ?? null);
				} else {
					setViewingRequestDepositInvoiceSrc(null);
					setViewingRequestDepositInvoiceFileName(null);
				}
			} catch (error) {
				console.error('Failed to load subscription deposit for request dialog', error);
				if (active) {
					setViewingRequestDepositInvoiceSrc(null);
					setViewingRequestDepositInvoiceFileName(null);
				}
			}
		};

		void loadDepositForViewingRequest();

		return () => {
			active = false;
		};
	}, [viewingRequest]);

	const openDecisionModal = useCallback((request: SubscriptionRequestSchema, action: 'approve' | 'reject' | 'cancel') => {
		setDecisionRequest(request);
		setDecisionAction(action);
		setDecisionNote('');
		setDecisionError(null);
	}, []);

	const handleCloseDecision = useCallback(() => {
		if (decisionLoading) {
			return;
		}
		setDecisionRequest(null);
		setDecisionNote('');
		setDecisionError(null);
	}, [decisionLoading]);

	const handleDecisionConfirm = useCallback(async () => {
		if (!decisionRequest) {
			return;
		}
		if (decisionAction === 'reject' && decisionNote.trim().length === 0) {
			setDecisionError('Please add a short note explaining the rejection.');
			return;
		}

		const reviewerId = reviewer?.id ?? 'system';
		const reviewerName = reviewer?.name ?? 'Admin';
		const nextStatus: SubscriptionRequestStatus = decisionAction === 'approve'
			? 'approved'
			: decisionAction === 'reject'
				? 'rejected'
				: 'cancelled';

		setDecisionLoading(true);
		try {
			const updated = await updateStatus(decisionRequest.id!, {
				status: nextStatus,
				statusNote: decisionNote.trim().length > 0 ? decisionNote.trim() : null,
				reviewedBy: reviewerId,
				reviewedByName: reviewerName,
			});
			setDecisionRequest(null);
			setDecisionNote('');
			setDecisionError(null);
			if (updated?.status === 'approved') {
				navigate(ROUTES.ADMIN_SUBSCRIPTION_SUBSCRIBERS);
			}
		} catch (error) {
			console.error('Failed to update subscription request status', error);
		} finally {
			setDecisionLoading(false);
		}
	}, [decisionAction, decisionNote, decisionRequest, navigate, reviewer, updateStatus]);

	const columns = useMemo<DataTableColumnDef<SubscriptionRequestSchema>[]>(() => [
		{
			id: 'customer',
			header: 'Customer',
			meta: { cellClassName: 'align-top' },
			cell: ({ row }) => {
				const request = row.original;
				const displayId = getDisplayCustomerId(request.customerShortId, request.userId);
				return (
					<div className="space-y-1 text-sm text-slate-700">
						<p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
							<User size={16} className="text-purple-500" />
							{request.userName}
						</p>
						<div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
							{request.userEmail ? (
								<span className="inline-flex items-center gap-1">
									<span className="font-medium text-slate-600">Email:</span> {request.userEmail}
								</span>
							) : null}
							{request.userPhone ? (
								<span className="inline-flex items-center gap-1">
									<Phone size={12} className="text-slate-400" />
									{request.userPhone}
								</span>
							) : null}
						</div>
						{displayId !== '—' ? (
							<span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
								CID: <span className="font-mono text-xs">{displayId}</span>
							</span>
						) : null}
						<p className="text-xs text-slate-400">Requested on {formatDateTime(request.createdAt)}</p>
					</div>
				);
			},
		},
		{
			id: 'plan',
			header: 'Plan details',
			meta: { cellClassName: 'align-top' },
			cell: ({ row }) => {
				const request = row.original;
				return (
					<div className="space-y-2 text-sm text-slate-600">
						<div>
							<p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
								<Layers size={16} className="text-purple-500" />
								{request.categoryName}
							</p>
							<p className="text-xs text-slate-500">{dietLabel[request.dietPreference]} • {request.durationDays} days</p>
						</div>
						<div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
							<span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-600">
								<CalendarClock size={12} />
								{formatDate(request.startDate)} → {formatDate(request.endDate)}
							</span>
						</div>
					</div>
				);
			},
		},
		{
			id: 'selections',
			header: 'Meal slots',
			meta: { cellClassName: 'align-top' },
			cell: ({ row }) => {
				const request = row.original;
				return (
					<ul className="space-y-1 text-xs text-slate-600">
						{request.selections.map((selection) => (
							<li key={`${selection.mealType}-${selection.packageId}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/70 bg-white px-3 py-2 shadow-sm">
								<span className="flex items-center gap-2 font-medium text-slate-700">
									<UtensilsCrossed size={14} className="text-purple-500" />
									{selection.mealType}
								</span>
								<div className="text-right text-xs text-slate-500">
									<p className="font-semibold text-slate-700">{selection.packageName}</p>
									<p>{formatCurrency(selection.pricePerDay)} / day</p>
								</div>
							</li>
						))}
					</ul>
				);
			},
		},
		{
			id: 'billing',
			header: 'Billing summary',
			meta: { cellClassName: 'align-top' },
			cell: ({ row }) => {
				const request = row.original;
				const summary = request.summary;
				return (
					<div className="space-y-1 text-sm text-slate-600">
						<div className="flex items-center justify-between text-xs">
							<span>Subtotal</span>
							<span className="font-semibold text-slate-900">{formatCurrency(summary.subtotal)}</span>
						</div>
						{summary.discountAmount > 0 && (
							<div className="flex items-center justify-between text-xs text-emerald-600">
								<span>Duration discount ({summary.discountPercent}% )</span>
								<span>-{formatCurrency(summary.discountAmount)}</span>
							</div>
						)}
						{summary.couponDiscountAmount > 0 && summary.couponCode && (
							<div className="flex items-center justify-between text-xs text-purple-600">
								<span>Coupon {summary.couponCode}</span>
								<span>-{formatCurrency(summary.couponDiscountAmount)}</span>
							</div>
						)}
						<div className="mt-2 flex items-center justify-between text-sm font-semibold text-slate-900">
							<span>Total</span>
							<span>{formatCurrency(summary.totalPayable)}</span>
						</div>
					</div>
				);
			},
		},
		{
			id: 'status',
			header: 'Status',
			meta: { cellClassName: 'align-top' },
			cell: ({ row }) => {
				const request = row.original;
				const isExpired = request.endDate instanceof Date && request.endDate < new Date();
				const displayMeta = isExpired ? { label: 'Expired', badge: 'bg-gray-50 text-gray-600 border-gray-200', accent: 'text-gray-600' } : statusMeta[request.status];
				return (
					<div className="space-y-2 text-xs text-slate-500">
						<span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${displayMeta.badge}`}>
							<span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
							{displayMeta.label}
						</span>
						{request.statusNote ? (
							<p className="text-xs text-slate-500">
								<span className="font-semibold text-slate-600">Note:</span> {request.statusNote}
							</p>
						) : null}
						{request.reviewedByName ? (
							<p className="text-[11px] text-slate-400">Last updated by {request.reviewedByName} on {formatDateTime(request.reviewedAt)}</p>
						) : null}
					</div>
				);
			},
		},
		{
			id: 'actions',
			header: 'Actions',
			meta: { cellClassName: 'align-top' },
			cell: ({ row }) => {
				const request = row.original;
				const isPending = request.status === 'pending';
				const isUpdating = updatingId === request.id || decisionLoading;
				const isCancellable = request.status === 'approved' || request.status === 'pending';

				return (
					<div className="flex flex-wrap items-center gap-2">
						<IconButton
							label="Approve request"
							icon={<CheckCircle2 size={16} />}
							variant="primary"
							disabled={!isPending || isUpdating}
							onClick={() => openDecisionModal(request, 'approve')}
						/>
						<IconButton
							label="Reject request"
							icon={<XCircle size={16} />}
							variant="danger"
							disabled={!isPending || isUpdating}
							onClick={() => openDecisionModal(request, 'reject')}
						/>
						{isCancellable ? (
							<IconButton
								label="Mark as cancelled"
								icon={<Ban size={16} />}
								variant="danger"
								disabled={isUpdating}
								onClick={() => openDecisionModal(request, 'cancel')}
							/>
						) : null}
						<IconButton
							label="View details"
							icon={<Eye size={16} />}
							onClick={() => setViewingRequest(request)}
						/>
					</div>
				);
			},
		},
	], [decisionLoading, openDecisionModal, updatingId]);

	const activeDecisionTitle = decisionAction === 'approve'
		? 'Approve subscription request'
		: decisionAction === 'reject'
			? 'Reject subscription request'
			: 'Cancel subscription request';
	const activeDecisionDescription = decisionAction === 'approve'
		? 'Once approved, the subscription onboarding workflow will begin and the customer will be notified.'
		: decisionAction === 'reject'
			? 'Rejected requests are archived and the customer will be notified with your note.'
			: 'Cancelling moves the request to a closed state and pauses any active fulfilment. Add context if a refund was issued.';
	const decisionButtonLabel = decisionAction === 'approve'
		? 'Approve request'
		: decisionAction === 'reject'
			? 'Reject request'
			: 'Mark as cancelled';
	const decisionButtonClass = decisionAction === 'approve'
		? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-400 disabled:bg-emerald-300'
		: decisionAction === 'reject'
			? 'bg-red-600 hover:bg-red-700 focus:ring-red-400 disabled:bg-red-300'
			: 'bg-slate-700 hover:bg-slate-800 focus:ring-slate-500 disabled:bg-slate-400';
	const decisionNoteLabel = decisionAction === 'reject'
		? 'Rejection note (required)'
		: decisionAction === 'cancel'
			? 'Cancellation note (optional)'
			: 'Internal note (optional)';
	const decisionNotePlaceholder = decisionAction === 'reject'
		? 'Add a short reason that will be visible to collaborators.'
		: decisionAction === 'cancel'
			? 'Share why this subscription was cancelled or if a refund was issued.'
			: 'Share any context for the operations team (optional).';

	return (
		<div className="mx-auto max-w-6xl space-y-6 p-6">
			<header className="space-y-4">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="space-y-2">
						<p className="text-sm font-semibold uppercase tracking-wide text-purple-600">Admin • Subscription requests</p>
						<h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
							<ClipboardList size={30} className="text-purple-500" /> Review new subscriptions
						</h1>
						<p className="max-w-2xl text-sm text-slate-600">
							Triage new subscription submissions, verify plan selections, and progress them through onboarding.
						</p>
					</div>
				</div>

				<section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
					<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
						<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total subscriptions</p>
						<p className="mt-2 text-3xl font-bold text-slate-900">{metrics.totalRequests}</p>
						<p className="text-xs text-slate-500">All submissions received</p>
					</div>
					<div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
						<p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Pending</p>
						<p className="mt-2 text-2xl font-bold text-amber-800">{metrics.pending}</p>
						<p className="text-xs text-amber-700/80">Awaiting review • {formatCurrency(metrics.pendingValue)}</p>
					</div>
					<div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
						<p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Approved</p>
						<p className="mt-2 text-2xl font-bold text-emerald-700">{metrics.approved}</p>
						<p className="text-xs text-emerald-700/80">Live subscriptions</p>
					</div>
					<div className="rounded-xl border border-red-200 bg-red-50/70 p-4">
						<p className="text-xs font-semibold uppercase tracking-wide text-red-600">Rejected</p>
						<p className="mt-2 text-2xl font-bold text-red-600">{metrics.rejected}</p>
						<p className="text-xs text-red-600/80">Declined requests</p>
					</div>
					<div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
						<p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Cancelled</p>
						<p className="mt-2 text-2xl font-bold text-slate-900">{metrics.cancelled}</p>
						<p className="text-xs text-slate-500">Refunded or stopped</p>
					</div>
				</section>
				<section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					<div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4">
						<p className="text-xs font-semibold uppercase tracking-wide text-purple-600">Projected revenue</p>
						<p className="mt-2 text-2xl font-bold text-purple-700">{formatCurrency(metrics.projectedRevenue)}</p>
						<p className="text-xs text-purple-700/80">Approved pipeline</p>
					</div>
					<div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
						<p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Pending value</p>
						<p className="mt-2 text-2xl font-bold text-blue-700">{formatCurrency(metrics.pendingValue)}</p>
						<p className="text-xs text-blue-700/80">If all pending close</p>
					</div>
					<div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
						<p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Avg ticket size</p>
						<p className="mt-2 text-2xl font-bold text-emerald-700">{formatCurrency(metrics.averageTicket)}</p>
						<p className="text-xs text-emerald-700/80">Per approved request</p>
					</div>
				</section>
			</header>

		<DataTable<SubscriptionRequestSchema>
			data={sortedRequests}
			columns={columns}
			loading={loading}
			pagination={{
				currentPage,
				pageSize,
				totalItems: totalItems ?? 0,
				onPageChange: setCurrentPage,
				onPageSizeChange: setPageSize,
			}}
			searchFields={searchFields.map((f) => ({ value: f.name, label: f.label }))}
			searchField={searchField}
			searchValue={searchValue}
			onSearchFieldChange={setSearchField}
			onSearchValueChange={setSearchValue}
			emptyMessage="No subscription requests yet. Customers will appear here after completing checkout."
			enableSorting
		/>			<Dialog
				open={!!viewingRequest}
				onClose={() => setViewingRequest(null)}
				title={viewingRequest ? `Subscription for ${viewingRequest.userName}` : 'Subscription details'}
				description={viewingRequest ? `Review the full selection for ${viewingRequest.userName}.` : undefined}
				size="xl"
				footer={(
					<div className="flex justify-end">
						<button
							type="button"
							onClick={() => setViewingRequest(null)}
							className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
						>
							Close
						</button>
					</div>
				)}
			>
				{viewingRequest ? (
					<div className="space-y-6 text-sm text-slate-700">
						<section className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
							<div>
								<h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
									<User size={16} className="text-purple-500" /> Customer
								</h3>
								<dl className="mt-2 space-y-1 text-xs text-slate-600">
									<div className="flex justify-between gap-4">
										<dt className="font-medium text-slate-600">Name</dt>
										<dd className="text-right text-slate-700">{viewingRequest.userName}</dd>
									</div>
									<div className="flex justify-between gap-4">
										<dt className="font-medium text-slate-600">Email</dt>
										<dd className="text-right text-slate-700">{viewingRequest.userEmail ?? '—'}</dd>
									</div>
									<div className="flex justify-between gap-4">
										<dt className="font-medium text-slate-600">Phone</dt>
										<dd className="text-right text-slate-700">{viewingRequest.userPhone ?? '—'}</dd>
									</div>
									{(() => {
										const displayId = getDisplayCustomerId(viewingRequest.customerShortId, viewingRequest.userId);
										if (displayId === '—') {
											return null;
										}
										return (
											<div className="flex justify-between gap-4">
												<dt className="font-medium text-slate-600">Customer ID</dt>
												<dd className="text-right font-mono text-slate-800">{displayId}</dd>
											</div>
										);
									})()}
								</dl>
							</div>
							<div>
								<h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
									<ListOrdered size={16} className="text-purple-500" /> Timeline
								</h3>
								<dl className="mt-2 space-y-1 text-xs text-slate-600">
									<div className="flex justify-between gap-4">
										<dt className="font-medium text-slate-600">Requested</dt>
										<dd className="text-right text-slate-700">{formatDateTime(viewingRequest.createdAt)}</dd>
									</div>
									<div className="flex justify-between gap-4">
										<dt className="font-medium text-slate-600">Start date</dt>
										<dd className="text-right text-slate-700">{formatDate(viewingRequest.startDate)}</dd>
									</div>
									<div className="flex justify-between gap-4">
										<dt className="font-medium text-slate-600">End date</dt>
										<dd className="text-right text-slate-700">{formatDate(viewingRequest.endDate)}</dd>
									</div>
								</dl>
							</div>
						</section>

						<section className="rounded-xl border border-slate-200 bg-white p-4">
							<h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
								<UtensilsCrossed size={16} className="text-purple-500" /> Meal selections
							</h3>
							<ul className="mt-3 grid gap-3 sm:grid-cols-2">
								{viewingRequest.selections.map((selection) => (
									<li
										key={`${selection.mealType}-${selection.packageId}`}
										className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"
									>
										<p className="text-sm font-semibold text-slate-800">{selection.mealType}</p>
										<p className="mt-1 text-slate-600">{selection.packageName}</p>
										<p className="mt-2 text-slate-500">{formatCurrency(selection.pricePerDay)} per day</p>
									</li>
								))}
							</ul>
						</section>

						<section className="rounded-xl border border-slate-200 bg-white p-4">
							<h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
								<ListOrdered size={16} className="text-purple-500" /> Billing summary
							</h3>
							<div className="mt-3 space-y-2 text-sm text-slate-600">
								<div className="flex items-center justify-between text-xs">
									<span>Subtotal</span>
									<span className="font-semibold text-slate-900">{formatCurrency(viewingRequest.summary.subtotal)}</span>
								</div>
								{viewingRequest.summary.discountAmount > 0 && (
									<div className="flex items-center justify-between text-xs text-emerald-600">
										<span>Duration discount ({viewingRequest.summary.discountPercent}% )</span>
										<span>-{formatCurrency(viewingRequest.summary.discountAmount)}</span>
									</div>
								)}
								{viewingRequest.summary.couponDiscountAmount > 0 && viewingRequest.summary.couponCode && (
									<div className="flex items-center justify-between text-xs text-purple-600">
										<span>Coupon {viewingRequest.summary.couponCode}</span>
										<span>-{formatCurrency(viewingRequest.summary.couponDiscountAmount)}</span>
									</div>
								)}
								<div className="flex items-center justify-between text-base font-semibold text-slate-900">
									<span>Total payable</span>
									<span>{formatCurrency(viewingRequest.summary.totalPayable)}</span>
								</div>
							</div>
						</section>

						{viewingRequestPaymentProofSrc ? (
							<section className="rounded-xl border border-slate-200 bg-white p-4">
								<h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
									<CheckCircle2 size={16} className="text-emerald-500" /> Payment proof
								</h3>
								<div className="mt-3">
									<button
										type="button"
										onClick={() => setViewingPaymentProof({
											imageSrc: viewingRequestPaymentProofSrc,
											fileName: viewingRequest.paymentProofFileName ?? undefined,
										})}
										className="group relative w-full overflow-hidden rounded-lg border border-slate-200 transition hover:border-emerald-500 hover:shadow-md"
									>
										<img
											src={viewingRequestPaymentProofSrc}
											alt="Payment proof screenshot"
											className="max-h-64 w-full object-cover transition group-hover:opacity-90"
										/>
										<div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/20 group-hover:opacity-100">
											<Eye size={32} className="text-white" />
										</div>
									</button>
									{viewingRequest.paymentProofFileName ? (
										<p className="mt-2 text-xs text-slate-500">Uploaded: {viewingRequest.paymentProofFileName}</p>
									) : null}
									<p className="mt-1 text-xs text-slate-400">Click to view full size</p>
								</div>
							</section>
						) : null}

						{viewingRequestDepositInvoiceSrc ? (
							<section className="rounded-xl border border-slate-200 bg-white p-4">
								<h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
									<CheckCircle2 size={16} className="text-emerald-500" /> Deposit invoice
								</h3>
								<div className="mt-3">
									<button
										type="button"
										onClick={() => setViewingDepositInvoice({
											imageSrc: viewingRequestDepositInvoiceSrc,
											fileName: viewingRequestDepositInvoiceFileName ?? undefined,
										})}
										className="group relative w-full overflow-hidden rounded-lg border border-slate-200 transition hover:border-emerald-500 hover:shadow-md"
									>
										<img
											src={viewingRequestDepositInvoiceSrc}
											alt="Deposit invoice screenshot"
											className="max-h-64 w-full object-cover transition group-hover:opacity-90"
										/>
										<div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/20 group-hover:opacity-100">
											<Eye size={32} className="text-white" />
										</div>
									</button>
									{viewingRequestDepositInvoiceFileName ? (
										<p className="mt-2 text-xs text-slate-500">Uploaded: {viewingRequestDepositInvoiceFileName}</p>
									) : null}
									<p className="mt-1 text-xs text-slate-400">Click to view full size</p>
								</div>
							</section>
						) : null}

						<section className="rounded-xl border border-slate-200 bg-white p-4">
							<h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">Status history</h3>
							<div className="mt-2 space-y-1 text-xs text-slate-600">
								<p>
									Current status: <span className={`font-semibold ${statusMeta[viewingRequest.status].accent}`}>{statusMeta[viewingRequest.status].label}</span>
								</p>
								{viewingRequest.statusNote ? (
									<p><span className="font-medium text-slate-600">Note:</span> {viewingRequest.statusNote}</p>
								) : null}
								{viewingRequest.reviewedByName ? (
									<p>
										Reviewed by {viewingRequest.reviewedByName} on {formatDateTime(viewingRequest.reviewedAt)}
									</p>
								) : (
									<p>This request has not been reviewed yet.</p>
								)}
							</div>
						</section>
					</div>
				) : null}
			</Dialog>

			<Dialog
				open={!!decisionRequest}
				onClose={handleCloseDecision}
				title={activeDecisionTitle}
				description={decisionRequest ? `${decisionRequest.userName} • ${decisionRequest.categoryName}` : undefined}
				size="md"
				footer={(
					<div className="flex justify-end gap-3">
						<button
							type="button"
							onClick={handleCloseDecision}
							disabled={decisionLoading}
							className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleDecisionConfirm}
							disabled={decisionLoading}
							className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 ${decisionButtonClass} disabled:cursor-not-allowed disabled:opacity-80`}
						>
							{decisionLoading ? 'Processing…' : decisionButtonLabel}
						</button>
					</div>
				)}
			>
				{decisionRequest ? (
					<div className="space-y-4 text-sm text-slate-700">
						<p className="text-slate-600">{activeDecisionDescription}</p>
						<div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
							<p className="font-semibold text-slate-800">Summary</p>
							<ul className="mt-2 space-y-1">
								<li>Customer: {decisionRequest.userName}</li>
								<li>Plan: {decisionRequest.categoryName}</li>
								<li>Duration: {decisionRequest.durationDays} days ({formatDate(decisionRequest.startDate)} → {formatDate(decisionRequest.endDate)})</li>
								<li>Total payable: {formatCurrency(decisionRequest.summary.totalPayable)}</li>
							</ul>
						</div>
						<div className="space-y-2">
							<label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="decision-note">
								{decisionNoteLabel}
							</label>
							<textarea
								id="decision-note"
								value={decisionNote}
								onChange={(event) => {
									setDecisionNote(event.target.value);
									if (decisionError) {
										setDecisionError(null);
									}
								}}
								rows={4}
								className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
								placeholder={decisionNotePlaceholder}
							/>
							{decisionError ? <p className="text-xs font-medium text-red-600">{decisionError}</p> : null}
						</div>
					</div>
				) : null}
			</Dialog>

			<Dialog
				open={!!viewingPaymentProof}
				onClose={() => setViewingPaymentProof(null)}
				title="Payment Proof"
				description={viewingPaymentProof?.fileName ? `File: ${viewingPaymentProof.fileName}` : 'Screenshot of payment confirmation'}
				size="xl"
				footer={(
					<div className="flex justify-end">
						<button
							type="button"
							onClick={() => setViewingPaymentProof(null)}
							className="rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
						>
							Close
						</button>
					</div>
				)}
			>
				{viewingPaymentProof ? (
					<div className="space-y-4">
						<img
							src={viewingPaymentProof.imageSrc}
							alt="Payment proof screenshot - full size"
							className="w-full rounded-lg border border-slate-200 shadow-sm"
						/>
					</div>
				) : null}
			</Dialog>

			<Dialog
				open={!!viewingDepositInvoice}
				onClose={() => setViewingDepositInvoice(null)}
				title="Deposit Invoice"
				description={viewingDepositInvoice?.fileName ? `File: ${viewingDepositInvoice.fileName}` : 'Screenshot of deposit invoice'}
				size="xl"
				footer={(
					<div className="flex justify-end">
						<button
							type="button"
							onClick={() => setViewingDepositInvoice(null)}
							className="rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
						>
							Close
						</button>
					</div>
				)}
			>
				{viewingDepositInvoice ? (
					<div className="space-y-4">
						<img
							src={viewingDepositInvoice.imageSrc}
							alt="Deposit invoice screenshot - full size"
							className="w-full rounded-lg border border-slate-200 shadow-sm"
						/>
					</div>
				) : null}
			</Dialog>
		</div>
	);
};

export default SubscriptionRequestsPage;
