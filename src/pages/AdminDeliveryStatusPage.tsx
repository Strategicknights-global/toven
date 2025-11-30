import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, CheckCircle2, ClipboardList, Loader2, MapPin, Navigation2, Package, RefreshCcw, Search, Truck, User, UserCheck } from 'lucide-react';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import Dialog from '../components/Dialog';
import type { DeliveryAssignmentSchema, DeliveryAssignmentStatus } from '../schemas/DeliveryAssignmentSchema';
import { DELIVERY_ASSIGNMENT_STATUSES } from '../schemas/DeliveryAssignmentSchema';
import { useDeliveryAssignmentsStore } from '../stores/deliveryAssignmentsStore';
import { getDisplayCustomerId } from '../utils/customerDisplay';

const statusColorMap: Record<DeliveryAssignmentStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  assigned: 'bg-blue-100 text-blue-700',
  'picked-up': 'bg-teal-100 text-teal-700',
  'en-route': 'bg-purple-100 text-purple-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

const statusLabels: Record<DeliveryAssignmentStatus, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  'picked-up': 'Picked Up',
  'en-route': 'En Route',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const statusPriority: Record<DeliveryAssignmentStatus, number> = {
  pending: 0,
  assigned: 1,
  'picked-up': 2,
  'en-route': 3,
  delivered: 4,
  cancelled: 5,
};

const inProgressStatuses = new Set<DeliveryAssignmentStatus>(['assigned', 'picked-up', 'en-route']);

const getStatusBadgeClass = (status: DeliveryAssignmentStatus | null | undefined): string => {
  if (!status) {
    return 'bg-slate-100 text-slate-600';
  }
  return statusColorMap[status] ?? 'bg-slate-100 text-slate-600';
};

const toCoordinateString = (value: number | null | undefined): string | null => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  return value.toFixed(6);
};

const buildMapsUrl = (assignment: DeliveryAssignmentSchema): string | null => {
  const latString = toCoordinateString(assignment.latitude);
  const lngString = toCoordinateString(assignment.longitude);
  if (latString && lngString) {
    const destination = encodeURIComponent(`${latString},${lngString}`);
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  }
  const fallback = assignment.address?.trim() || assignment.deliveryLocationName?.trim();
  if (!fallback) {
    return null;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fallback)}`;
};

const formatDistance = (distanceKm: number): string => {
  if (typeof distanceKm !== 'number' || Number.isNaN(distanceKm)) {
    return '0 km';
  }
  return `${distanceKm.toFixed(2)} km`;
};

const formatTimestamp = (value: Date | null | undefined): string => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleString();
  }
  return '—';
};

type StatusFilter = 'all' | DeliveryAssignmentStatus;

const AdminDeliveryStatusPage: React.FC = () => {
  const assignments = useDeliveryAssignmentsStore((state) => state.assignments);
  const loading = useDeliveryAssignmentsStore((state) => state.loading);
  const loadAssignments = useDeliveryAssignmentsStore((state) => state.loadAssignments);
  const unloadAssignments = useDeliveryAssignmentsStore((state) => state.unloadAssignments);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState<DeliveryAssignmentSchema | null>(null);

  const selectedAssignmentDisplayId = useMemo(() => {
    if (!selectedAssignment) {
      return '—';
    }
    return getDisplayCustomerId(selectedAssignment.customerShortId, selectedAssignment.customerId);
  }, [selectedAssignment]);

  const initialisedRef = useRef(false);
  useEffect(() => {
    if (!initialisedRef.current) {
      initialisedRef.current = true;
      void loadAssignments();
    }
    return () => {
      unloadAssignments();
    };
  }, [loadAssignments, unloadAssignments]);

  const summary = useMemo(() => {
    const statusTotals: Record<DeliveryAssignmentStatus, number> = {
      pending: 0,
      assigned: 0,
      'picked-up': 0,
      'en-route': 0,
      delivered: 0,
      cancelled: 0,
    };

    assignments.forEach((assignment) => {
      const resolved = (assignment.status ?? 'pending') as DeliveryAssignmentStatus;
      statusTotals[resolved] += 1;
    });

    const assignedCount = assignments.filter((assignment) => Boolean(assignment.assignPersonId)).length;
    const inProgress = assignments.filter((assignment) => inProgressStatuses.has((assignment.status ?? 'pending') as DeliveryAssignmentStatus)).length;

    return {
      total: assignments.length,
      statusTotals,
      assignedCount,
      unassignedCount: assignments.length - assignedCount,
      deliveredCount: statusTotals.delivered,
      inProgressCount: inProgress,
    } as const;
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    const baseList = statusFilter === 'all'
      ? assignments
      : assignments.filter((assignment) => {
          const current = (assignment.status ?? 'pending') as DeliveryAssignmentStatus;
          return current === statusFilter;
        });

    const term = searchTerm.trim().toLowerCase();
    const scopedList = term
      ? baseList.filter((assignment) => {
          const candidate = [
            assignment.customerName,
            assignment.customerId,
            assignment.packageName,
            assignment.assignPersonName,
            assignment.deliveryLocationName,
            assignment.tripNumber,
            assignment.mobileNumber,
            assignment.status,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return candidate.includes(term);
        })
      : baseList;

    return [...scopedList].sort((a, b) => {
      const aStatus = (a.status ?? 'pending') as DeliveryAssignmentStatus;
      const bStatus = (b.status ?? 'pending') as DeliveryAssignmentStatus;
      const statusCompare = statusPriority[aStatus] - statusPriority[bStatus];
      if (statusCompare !== 0) {
        return statusCompare;
      }
      const aTime = a.updatedAt instanceof Date ? a.updatedAt.getTime() : 0;
      const bTime = b.updatedAt instanceof Date ? b.updatedAt.getTime() : 0;
      if (aTime !== bTime) {
        return bTime - aTime;
      }
      return (a.customerName || '').localeCompare(b.customerName || '', undefined, { sensitivity: 'base' });
    });
  }, [assignments, searchTerm, statusFilter]);

  const columns = useMemo<DataTableColumnDef<DeliveryAssignmentSchema>[]>(
    () => [
      {
        id: 'customer',
        header: 'Customer',
        accessorKey: 'customerName',
        meta: { cellClassName: 'align-top' },
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="flex items-center gap-1 font-semibold text-slate-900">
              <User size={16} className="text-purple-500" />
              {row.original.customerName || '—'}
            </p>
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <ClipboardList size={14} className="text-slate-400" />
              Trip {row.original.tripNumber || '—'}
            </p>
            {(() => {
              const displayId = getDisplayCustomerId(row.original.customerShortId, row.original.customerId);
              if (displayId === '—') {
                return null;
              }
              return (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  CID: <span className="font-mono text-xs">{displayId}</span>
                </span>
              );
            })()}
          </div>
        ),
      },
      {
        id: 'package',
        header: 'Package',
        accessorKey: 'packageName',
        meta: { cellClassName: 'align-top' },
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-medium text-slate-800">{row.original.packageName || '—'}</p>
            {row.original.mealType ? (
              <p className="text-xs uppercase tracking-wide text-slate-400">{row.original.mealType}</p>
            ) : null}
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <Package size={14} className="text-purple-500" />
              {formatDistance(row.original.distanceKm)} from hub
            </p>
          </div>
        ),
      },
      {
        id: 'assignedTo',
        header: 'Assigned To',
        meta: { cellClassName: 'align-top' },
        cell: ({ row }) => {
          const partner = row.original.assignPersonName;
          return (
            <div className="space-y-1 text-sm">
              <p className="flex items-center gap-2 font-medium text-slate-800">
                <UserCheck size={16} className="text-emerald-600" />
                {partner || 'Unassigned'}
              </p>
              <p className="text-xs text-slate-500">{row.original.mobileNumber || '—'}</p>
            </div>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        meta: { cellClassName: 'align-top' },
        cell: ({ row }) => {
          const status = (row.original.status ?? 'pending') as DeliveryAssignmentStatus;
          return (
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusBadgeClass(status)}`}>
              {statusLabels[status]}
            </span>
          );
        },
      },
      {
        id: 'updatedAt',
        header: 'Last Updated',
        accessorKey: 'updatedAt',
        meta: { cellClassName: 'align-top text-sm text-slate-600' },
        cell: ({ row }) => formatTimestamp(row.original.updatedAt),
      },
      {
        id: 'actions',
        header: 'Actions',
        meta: { cellClassName: 'align-top' },
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedAssignment(row.original)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Activity size={14} />
              View
            </button>
            {(() => {
              const mapsUrl = buildMapsUrl(row.original);
              if (!mapsUrl) {
                return (
                  <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-400">
                    <Navigation2 size={14} />
                    No location
                  </span>
                );
              }
              return (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 transition hover:border-purple-300 hover:bg-purple-100"
                >
                  <Navigation2 size={14} />
                  Directions
                </a>
              );
            })()}
          </div>
        ),
      },
    ],
    [],
  );

  const activeStatus = (assignment: DeliveryAssignmentSchema): DeliveryAssignmentStatus => {
    return (assignment.status ?? 'pending') as DeliveryAssignmentStatus;
  };

  return (
    <div className="space-y-8 p-6 pb-10">
      <header className="space-y-3">
        <div className="flex items-center gap-3 text-purple-600">
          <Truck size={26} />
          <p className="text-sm font-semibold uppercase tracking-wide">Delivery Operations</p>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h1 className="text-3xl font-semibold text-slate-900">Delivery Status Overview</h1>
          <button
            type="button"
            onClick={() => {
              void loadAssignments();
            }}
            className="inline-flex items-center gap-2 rounded-md border border-purple-200 bg-white px-3 py-2 text-sm font-semibold text-purple-700 transition hover:border-purple-300 hover:bg-purple-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
            Refresh feed
          </button>
        </div>
        <p className="max-w-3xl text-sm text-slate-500">
          Monitor every delivery in flight, track handoffs, and spot delays before they escalate. Filter by status or search by customer, partner, or trip to focus on what matters now.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <ClipboardList size={16} className="text-purple-500" />
            Total Deliveries
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.total}</p>
          <p className="text-xs text-slate-500">{summary.assignedCount} assigned • {summary.unassignedCount} waiting</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Activity size={16} className="text-amber-500" />
            In Progress
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.inProgressCount}</p>
          <p className="text-xs text-slate-500">Includes assigned, picked up, and en route trips</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <CheckCircle2 size={16} className="text-emerald-600" />
            Delivered Today
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.deliveredCount}</p>
          <p className="text-xs text-slate-500">Completed drops across all delivery partners</p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              statusFilter === 'all' ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-slate-200 bg-white text-slate-600 hover:border-purple-200 hover:text-purple-700'
            }`}
          >
            All
            <span className="rounded-full bg-slate-900/10 px-2 py-0.5 text-[10px] font-bold text-slate-700">{summary.total}</span>
          </button>
          {DELIVERY_ASSIGNMENT_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                statusFilter === status ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-slate-200 bg-white text-slate-600 hover:border-purple-200 hover:text-purple-700'
              }`}
            >
              {statusLabels[status]}
              <span className="rounded-full bg-slate-900/10 px-2 py-0.5 text-[10px] font-bold text-slate-700">{summary.statusTotals[status]}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by customer, partner, package, or location"
              className="w-full rounded-md border border-slate-300 bg-white px-10 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/60"
            />
          </div>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Clear
            </button>
          )}
        </div>
        <DataTable
          columns={columns}
          data={filteredAssignments}
          loading={loading}
          emptyMessage={<div className="py-10 text-center text-sm text-slate-500">No deliveries match the current filters.</div>}
        />
      </section>

      <Dialog
        open={Boolean(selectedAssignment)}
        onClose={() => setSelectedAssignment(null)}
        title="Delivery snapshot"
        description="Detailed view of the selected delivery assignment."
        size="lg"
      >
        {selectedAssignment ? (
          <div className="space-y-4 text-sm text-slate-700">
            <section className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</h3>
                <p className="mt-2 flex items-center gap-2 text-base font-semibold text-slate-900">
                  <User size={16} className="text-purple-500" />
                  {selectedAssignment.customerName || '—'}
                </p>
                <p className="text-xs text-slate-500">Customer ID: {selectedAssignmentDisplayId}</p>
                <p className="mt-1 inline-flex items-center gap-2 text-xs text-slate-500">
                  <ClipboardList size={14} className="text-slate-400" />
                  Trip {selectedAssignment.tripNumber || '—'}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</h3>
                <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusBadgeClass(activeStatus(selectedAssignment))}`}>
                  {statusLabels[activeStatus(selectedAssignment)]}
                </span>
                <p className="mt-2 text-xs text-slate-500">Last updated: {formatTimestamp(selectedAssignment.updatedAt)}</p>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assignment</h3>
              <div className="mt-2 space-y-2 text-sm">
                <p className="flex items-center gap-2 text-slate-700">
                  <UserCheck size={16} className="text-emerald-600" />
                  {selectedAssignment.assignPersonName || 'Unassigned'}
                </p>
                <p className="inline-flex items-center gap-2 text-xs text-slate-500">
                  <Truck size={14} className="text-purple-500" />
                  Distance: {formatDistance(selectedAssignment.distanceKm)}
                </p>
                <p className="inline-flex items-center gap-2 text-xs text-slate-500">
                  <Package size={14} className="text-purple-500" />
                  {selectedAssignment.packageName || '—'}
                  {selectedAssignment.mealType ? (
                    <span className="text-[11px] uppercase tracking-wide text-slate-400">{selectedAssignment.mealType}</span>
                  ) : null}
                </p>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery Address</h3>
              <div className="mt-2 space-y-1 text-sm">
                <p className="flex items-start gap-2 text-slate-700">
                  <MapPin size={16} className="mt-0.5 text-slate-400" />
                  <span>{selectedAssignment.address || '—'}</span>
                </p>
                <p className="text-xs text-slate-500">
                  Location tag: {selectedAssignment.deliveryLocationName || '—'}
                </p>
                <p className="text-xs text-slate-500">
                  Coordinates: {toCoordinateString(selectedAssignment.latitude) ?? '—'} / {toCoordinateString(selectedAssignment.longitude) ?? '—'}
                </p>
                {buildMapsUrl(selectedAssignment) ? (
                  <a
                    href={buildMapsUrl(selectedAssignment) ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-[11px] font-semibold text-purple-600 transition hover:border-purple-300 hover:bg-purple-100"
                  >
                    <Navigation2 size={12} />
                    Directions
                  </a>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
};

export default AdminDeliveryStatusPage;
