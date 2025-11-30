import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ClipboardList, Eye, Loader2, MapPin, Navigation2, Package, Phone, User } from 'lucide-react';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import Dialog from '../components/Dialog';
import type { DeliveryAssignmentSchema } from '../schemas/DeliveryAssignmentSchema';
import { useDeliveryAssignmentsStore } from '../stores/deliveryAssignmentsStore';
import { useUserRoleStore } from '../stores/userRoleStore';
import { getDisplayCustomerId } from '../utils/customerDisplay';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';

const toCoordinateString = (value: number | null | undefined): string | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return value.toFixed(6);
};

const buildMapsUrl = (assignment: DeliveryAssignmentSchema): string | null => {
  const { latitude, longitude, address } = assignment;
  const latString = toCoordinateString(latitude);
  const lngString = toCoordinateString(longitude);
  if (latString && lngString) {
    const destination = encodeURIComponent(`${latString},${lngString}`);
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  }
  const fallbackDestination = address?.trim() || assignment.deliveryLocationName?.trim();
  if (!fallbackDestination) {
    return null;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fallbackDestination)}`;
};

const formatDistance = (distanceKm: number): string => {
  if (typeof distanceKm !== 'number' || Number.isNaN(distanceKm)) {
    return '0 km';
  }
  return `${distanceKm.toFixed(2)} km`;
};

const toDateValue = (value: Date | string | number | null | undefined): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const formatAssignmentDate = (assignment: DeliveryAssignmentSchema): string => {
  const rawTrip = assignment.tripNumber?.trim();
  if (rawTrip) {
    const parsedTrip = toDateValue(rawTrip);
    return parsedTrip ? parsedTrip.toLocaleDateString() : rawTrip;
  }

  const createdAt = toDateValue(assignment.createdAt ?? null);
  if (createdAt) {
    return createdAt.toLocaleDateString();
  }

  const updatedAt = toDateValue(assignment.updatedAt ?? null);
  if (updatedAt) {
    return updatedAt.toLocaleDateString();
  }

  return '—';
};

const statusColorMap: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  assigned: 'bg-blue-100 text-blue-700',
  'picked-up': 'bg-teal-100 text-teal-700',
  'en-route': 'bg-purple-100 text-purple-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

const getStatusBadgeClass = (status: string | null | undefined): string => {
  if (!status) {
    return 'bg-slate-100 text-slate-600';
  }
  return statusColorMap[status] ?? 'bg-slate-100 text-slate-600';
};

const DeliveryDetailsPage: React.FC = () => {
  const assignments = useDeliveryAssignmentsStore((state) => state.assignments);
  const loading = useDeliveryAssignmentsStore((state) => state.loading);
  const loadAssignments = useDeliveryAssignmentsStore((state) => state.loadAssignments);
  const unloadAssignments = useDeliveryAssignmentsStore((state) => state.unloadAssignments);
  const markAsCompleted = useDeliveryAssignmentsStore((state) => state.markAsCompleted);
  const completingId = useDeliveryAssignmentsStore((state) => state.completingId);
  const paginatedData = useDeliveryAssignmentsStore((state) => state.paginatedData);
  const currentUserId = useUserRoleStore((state) => state.user?.uid ?? null);

  const [selectedAssignment, setSelectedAssignment] = useState<DeliveryAssignmentSchema | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('deliveryPersonId');
  const [searchValue, setSearchValue] = useState('');
  const [tripFilter, setTripFilter] = useState<string>('all');
  const searchFields = useMemo(() => getSearchFieldsForCollection('deliveryAssignments'), []);

  useEffect(() => {
    const search = searchValue ? { field: searchField, type: 'text' as const, value: searchValue } : null;
    void paginatedData({ pageNumber: currentPage, pageSize, search });
  }, [currentPage, pageSize, searchField, searchValue, paginatedData]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchField, searchValue]);

  useEffect(() => {
    setCurrentPage(1);
  }, [tripFilter]);

  const initialAssignmentsLoadRef = useRef(false);
  useEffect(() => {
    if (initialAssignmentsLoadRef.current) {
      return;
    }
    initialAssignmentsLoadRef.current = true;
    void loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    return () => {
      unloadAssignments();
    };
  }, [unloadAssignments]);

  const handleView = useCallback((assignment: DeliveryAssignmentSchema) => {
    setSelectedAssignment(assignment);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setSelectedAssignment(null);
  }, []);

  const handleMarkComplete = useCallback(
    (assignmentId: string) => {
      void markAsCompleted(assignmentId);
    },
    [markAsCompleted],
  );

  const assignmentsForUser = useMemo(() => {
    if (!currentUserId) {
      return assignments;
    }
    return assignments.filter((assignment) => assignment.assignPersonId === currentUserId);
  }, [assignments, currentUserId]);

  const distinctTripNumbers = useMemo(() => {
    const set = new Set<string>();
    assignmentsForUser.forEach((assignment) => {
      const value = assignment.tripNumber?.trim();
      if (value) {
        set.add(value);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [assignmentsForUser]);

  const filteredAssignments = useMemo(() => {
    if (tripFilter === 'all') {
      return assignmentsForUser;
    }
    return assignmentsForUser.filter((assignment) => (assignment.tripNumber?.trim() ?? '') === tripFilter);
  }, [assignmentsForUser, tripFilter]);

  useEffect(() => {
    if (!selectedAssignment) {
      return;
    }
    const stillVisible = filteredAssignments.some((assignment) => assignment.id === selectedAssignment.id);
    if (!stillVisible) {
      setSelectedAssignment(null);
    }
  }, [selectedAssignment, filteredAssignments]);

  const columns = useMemo<DataTableColumnDef<DeliveryAssignmentSchema>[]>(
    () => [
      {
        id: 'customerShortId',
        accessorKey: 'customerShortId',
        header: 'Short ID',
        meta: { cellClassName: 'text-sm font-medium text-slate-700' },
        cell: ({ row }) => {
          const displayId = getDisplayCustomerId(row.original.customerShortId, row.original.customerId);
          return (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
              CID: {displayId}
            </span>
          );
        },
      },
      {
        id: 'customerName',
        accessorKey: 'customerName',
        header: 'Customer Name',
        meta: { cellClassName: 'text-sm text-slate-700' },
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-semibold text-slate-800">{row.original.customerName || '—'}</p>
            {(() => {
              const displayId = getDisplayCustomerId(row.original.customerShortId, row.original.customerId);
              if (displayId === '—') {
                return null;
              }
              return (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  <User size={12} className="text-purple-500" /> CID: {displayId}
                </span>
              );
            })()}
          </div>
        ),
      },
      {
        id: 'mobileNumber',
        accessorKey: 'mobileNumber',
        header: 'Mobile',
        meta: { cellClassName: 'text-sm text-slate-600' },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Phone size={16} className="text-emerald-600" />
            <span>{row.original.mobileNumber || '—'}</span>
          </div>
        ),
      },
      {
        id: 'package',
        accessorKey: 'packageName',
        header: 'Package',
        meta: { cellClassName: 'text-sm text-slate-600' },
        cell: ({ row }) => (
          <div className="flex items-start gap-2">
            <Package size={16} className="mt-0.5 text-purple-500" />
            <div className="leading-tight">
              <p className="font-medium text-slate-700">{row.original.packageName || '—'}</p>
              {row.original.mealType ? (
                <p className="text-xs uppercase tracking-wide text-slate-400">{row.original.mealType}</p>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        id: 'tripDate',
        header: 'Date',
        meta: { cellClassName: 'text-sm text-slate-600' },
        cell: ({ row }) => formatAssignmentDate(row.original),
      },
      {
        id: 'distance',
        accessorKey: 'distanceKm',
        header: 'Distance',
        meta: { headerClassName: 'text-right', cellClassName: 'text-sm text-right text-slate-700' },
        cell: ({ row }) => formatDistance(row.original.distanceKm),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        meta: { cellClassName: 'text-sm' },
        cell: ({ row }) => {
          const status = row.original.status ?? 'pending';
          return (
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusBadgeClass(status)}`}>
              {status.replace('-', ' ')}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        meta: { cellClassName: 'align-top' },
        cell: ({ row }) => {
          const assignment = row.original;
          const mapsUrl = buildMapsUrl(assignment);
          const isDelivered = assignment.status?.toLowerCase() === 'delivered';
          const isCompleting = completingId === assignment.id;
          return (
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={mapsUrl ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                  mapsUrl
                    ? 'border-purple-200 bg-purple-50 text-purple-700 hover:border-purple-300 hover:bg-purple-100'
                    : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                }`}
                aria-disabled={!mapsUrl}
                onClick={(event) => {
                  if (!mapsUrl) {
                    event.preventDefault();
                  }
                }}
              >
                <Navigation2 size={14} />
                Location
              </a>
              <button
                type="button"
                onClick={() => handleView(assignment)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Eye size={14} />
                View
              </button>
              <button
                type="button"
                disabled={isDelivered || isCompleting}
                onClick={() => handleMarkComplete(assignment.id)}
                className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold text-white transition ${
                  isDelivered
                    ? 'bg-emerald-300 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isCompleting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}<span>{isDelivered ? 'Completed' : 'Mark Complete'}</span>
              </button>
            </div>
          );
        },
      },
    ],
    [completingId, handleMarkComplete, handleView],
  );

  const totalCompleted = useMemo(
    () => filteredAssignments.filter((item) => item.status?.toLowerCase() === 'delivered').length,
    [filteredAssignments],
  );

  const pendingCount = filteredAssignments.length - totalCompleted;

  return (
    <div className="space-y-8 p-6 pb-10">
      <header className="space-y-3">
        <div className="flex items-center gap-3 text-purple-600">
          <ClipboardList size={24} />
          <p className="text-sm font-semibold uppercase tracking-wide">Delivery Management</p>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h1 className="text-3xl font-semibold text-slate-900">Delivery Details</h1>
          <div className="flex flex-wrap gap-6 text-sm text-slate-600">
            <span className="flex items-center gap-2">
              <Navigation2 size={18} className="text-purple-500" />
              Total: <strong className="text-slate-800">{filteredAssignments.length}</strong>
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              Completed: <strong className="text-slate-800">{totalCompleted}</strong>
            </span>
            <span className="flex items-center gap-2">
              <Loader2 size={18} className="text-amber-500" />
              Pending: <strong className="text-slate-800">{pendingCount}</strong>
            </span>
          </div>
        </div>
        <p className="max-w-3xl text-sm text-slate-500">
          Only deliveries assigned to you are listed below. Jump into navigation, view order details, or mark a drop as complete in one place.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
        <div className="space-y-1">
          <label htmlFor="tripFilter" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Trip
          </label>
          <select
            id="tripFilter"
            value={tripFilter}
            onChange={(event) => setTripFilter(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/60"
          >
            <option value="all">All trips</option>
            {distinctTripNumbers.map((trip) => (
              <option key={trip} value={trip}>
                {trip}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section>
        <DataTable
          columns={columns}
          data={filteredAssignments}
          loading={loading}
          emptyMessage={<div className="py-10 text-center text-sm text-slate-500">No delivery assignments currently assigned to you.</div>}
          pagination={{
            currentPage,
            pageSize,
            totalItems: filteredAssignments.length,
            onPageChange: setCurrentPage,
            onPageSizeChange: setPageSize,
          }}
          searchFields={searchFields.map(f => ({ value: f.name, label: f.label }))}
          searchField={searchField}
          searchValue={searchValue}
          onSearchFieldChange={setSearchField}
          onSearchValueChange={setSearchValue}
        />
      </section>

      <Dialog
        open={Boolean(selectedAssignment)}
        onClose={handleCloseDialog}
        title="Delivery overview"
        description="Detailed view of the selected delivery assignment."
        size="lg"
      >
        {selectedAssignment ? (
          <div className="space-y-4 text-sm text-slate-700">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</h3>
              <div className="mt-2 space-y-1">
                <p className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <User size={18} className="text-purple-500" />
                  {selectedAssignment.customerName || '—'}
                </p>
                {(() => {
                  const displayId = getDisplayCustomerId(selectedAssignment.customerShortId, selectedAssignment.customerId);
                  if (displayId === '—') {
                    return null;
                  }
                  return (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        CID: {displayId}
                      </span>
                    </div>
                  );
                })()}
                <p className="inline-flex items-center gap-2 text-xs text-slate-500">
                  <Phone size={14} className="text-emerald-600" />
                  {selectedAssignment.mobileNumber || '—'}
                </p>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Package</h4>
                <p className="mt-2 text-sm font-medium text-slate-800">{selectedAssignment.packageName || '—'}</p>
                {selectedAssignment.mealType ? (
                  <p className="text-xs uppercase tracking-wide text-slate-400">{selectedAssignment.mealType}</p>
                ) : null}
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</h4>
                <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusBadgeClass(selectedAssignment.status ?? 'pending')}`}>
                  {(selectedAssignment.status ?? 'pending').replace('-', ' ')}
                </span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last Updated</h4>
                <p className="mt-2 text-xs text-slate-700">{selectedAssignment.updatedAt ? new Date(selectedAssignment.updatedAt).toLocaleString() : '—'}</p>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery Address</h4>
              <div className="mt-2 space-y-1 text-sm">
                <p className="flex items-start gap-2 text-slate-700">
                  <MapPin size={16} className="mt-0.5 text-slate-400" />
                  <span>{selectedAssignment.address || '—'}</span>
                </p>
                <p className="text-xs text-slate-500">
                  Distance from hub: {formatDistance(selectedAssignment.distanceKm)}
                </p>
                <p className="text-xs text-slate-500">
                  Trip: {selectedAssignment.tripNumber || '—'}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>Lat: {toCoordinateString(selectedAssignment.latitude) ?? '—'}</span>
                  <span>Lng: {toCoordinateString(selectedAssignment.longitude) ?? '—'}</span>
                  {buildMapsUrl(selectedAssignment) ? (
                    <a
                      href={buildMapsUrl(selectedAssignment) ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-600 transition hover:border-purple-300 hover:bg-purple-100"
                    >
                      <Navigation2 size={12} />
                      Directions
                    </a>
                  ) : null}
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
};

export default DeliveryDetailsPage;
