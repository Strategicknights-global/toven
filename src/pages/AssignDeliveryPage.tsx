import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardList, Loader2, MapPin, Navigation2, Package, Phone, Plus, UserCheck, Users } from 'lucide-react';
import type { Row } from '@tanstack/react-table';
import DataTable, { type DataTableColumnDef, type DataTableGroupOptions } from '../components/DataTable';
import type { DeliveryAssignmentSchema, DeliveryPersonSummary } from '../schemas/DeliveryAssignmentSchema';
import { useDeliveryAssignmentsStore } from '../stores/deliveryAssignmentsStore';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';
import { getDisplayCustomerId } from '../utils/customerDisplay';

type AssignmentActionCellProps = {
  assignment: DeliveryAssignmentSchema;
  deliveryPersons: DeliveryPersonSummary[];
  assigning: boolean;
  preferredPersonId: string | null;
  onAssign: (assignmentId: string, personId: string) => void;
  onClear: (assignmentId: string) => void;
};

const UNASSIGNED_LOCATION_KEY = '__unassigned__';
const UNASSIGNED_LOCATION_LABEL = 'No delivery location set';
const UNGROUPED_GROUP_KEY = '__ungrouped__';
const UNGROUPED_GROUP_LABEL = 'Ungrouped';
const NO_TRIP_GROUP_KEY = '__no_trip__';
const NO_TRIP_GROUP_LABEL = 'No trip assigned';
const NO_TRIP_FILTER_VALUE = '__no_trip_filter__';

type GroupHeaderActionsProps = {
  groupId: string | null;
  groupLabel: string;
  deliveryPersons: DeliveryPersonSummary[];
  assignmentCount: number;
  onAssignGroup: (groupId: string, personId: string) => void;
  assigning: boolean;
};

const GroupHeaderActions: React.FC<GroupHeaderActionsProps> = ({
  groupId,
  deliveryPersons,
  assignmentCount,
  onAssignGroup,
  assigning,
}) => {
  const [selectedPerson, setSelectedPerson] = useState<string>('');

  if (!groupId || groupId === UNGROUPED_GROUP_KEY) {
    return null;
  }

  const handleAssign = () => {
    if (!selectedPerson || !groupId) {
      return;
    }
    onAssignGroup(groupId, selectedPerson);
    setSelectedPerson('');
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedPerson}
        onChange={(event) => setSelectedPerson(event.target.value)}
        className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/60"
        disabled={assigning}
      >
        <option value="">Assign all to...</option>
        {deliveryPersons.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleAssign}
        disabled={assigning || !selectedPerson}
        className="rounded-md bg-purple-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-purple-700 disabled:opacity-50"
      >
        {assigning ? 'Assigning...' : `Assign ${assignmentCount}`}
      </button>
    </div>
  );
};

type TripSelectorProps = {
  assignment: DeliveryAssignmentSchema;
  tripLabels: string[];
  disabled: boolean;
  onAssignTrip: (assignmentId: string, label: string | null) => void;
};

const TripSelector: React.FC<TripSelectorProps> = ({ assignment, tripLabels, disabled, onAssignTrip }) => {
  const currentValue = assignment.tripNumber?.trim() ?? '';

  const options = useMemo(() => {
    const unique = new Set<string>(tripLabels.map((label) => label.trim()));
    if (currentValue && !unique.has(currentValue)) {
      unique.add(currentValue);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [tripLabels, currentValue]);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextValue = event.target.value;
    if (nextValue === currentValue) {
      return;
    }
    onAssignTrip(assignment.id, nextValue.length > 0 ? nextValue : null);
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
        className="min-w-[110px] rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/60 disabled:opacity-70"
      >
        <option value="">No trip</option>
        {options.map((label) => (
          <option key={label} value={label}>
            {label}
          </option>
        ))}
      </select>
      {disabled ? <Loader2 size={14} className="animate-spin text-purple-500" /> : null}
    </div>
  );
};

const getAssignmentLocationKey = (assignment: DeliveryAssignmentSchema): string => {
  const trimmedName = assignment.deliveryLocationName?.trim();
  return assignment.deliveryLocationId ?? trimmedName ?? UNASSIGNED_LOCATION_KEY;
};

const getAssignmentLocationLabel = (assignment: DeliveryAssignmentSchema): string => {
  const trimmedName = assignment.deliveryLocationName?.trim();
  return trimmedName ?? UNASSIGNED_LOCATION_LABEL;
};

const getAssignmentGroupLabel = (assignment: DeliveryAssignmentSchema): string => {
  const label = assignment.groupName?.trim() || assignment.groupNumber?.trim();
  if (label && label.length > 0) {
    return label;
  }
  return UNGROUPED_GROUP_LABEL;
};

const getAssignmentGroupValue = (assignment: DeliveryAssignmentSchema): string => {
  const value = assignment.groupNumber?.trim();
  return value && value.length > 0 ? value : UNGROUPED_GROUP_KEY;
};

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
  const fallbackDestination = address?.trim() || getAssignmentLocationLabel(assignment);
  if (!fallbackDestination) {
    return null;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fallbackDestination)}`;
};

const AssignmentActionCell: React.FC<AssignmentActionCellProps> = ({
  assignment,
  deliveryPersons,
  assigning,
  preferredPersonId,
  onAssign,
  onClear,
}) => {
  const [selectedPerson, setSelectedPerson] = useState<string>(() => assignment.assignPersonId ?? preferredPersonId ?? '');

  useEffect(() => {
    if (assignment.assignPersonId) {
      setSelectedPerson(assignment.assignPersonId);
    } else if (preferredPersonId) {
      setSelectedPerson(preferredPersonId);
    } else {
      setSelectedPerson('');
    }
  }, [assignment.assignPersonId, preferredPersonId]);

  const handleAssign = () => {
    if (!selectedPerson) {
      return;
    }
    onAssign(assignment.id, selectedPerson);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="text-[11px] font-medium leading-tight text-slate-500">
          {assignment.assignPersonName ? (
            <span>
              Assigned to <span className="font-semibold text-slate-700">{assignment.assignPersonName}</span>
            </span>
          ) : (
            <span className="text-amber-600">Pending assignment</span>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          <select
            value={selectedPerson}
            onChange={(event) => setSelectedPerson(event.target.value)}
            className="min-w-[160px] rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/60"
            disabled={assigning}
          >
            <option value="">Select partner</option>
            {deliveryPersons.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
                {person.activeTrips != null ? ` (Trips: ${person.activeTrips})` : ''}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleAssign}
              disabled={assigning || !selectedPerson}
              className="inline-flex items-center rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-green-700 disabled:opacity-60"
            >
              {assignment.assignPersonId ? 'Reassign' : 'Assign'}
            </button>
            <button
              type="button"
              onClick={() => onClear(assignment.id)}
              disabled={assigning || !assignment.assignPersonId}
              className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-rose-400 hover:text-rose-600 disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AssignDeliveryPage: React.FC = () => {
  const assignments = useDeliveryAssignmentsStore((state) => state.assignments);
  const deliveryPersons = useDeliveryAssignmentsStore((state) => state.deliveryPersons);
  const loading = useDeliveryAssignmentsStore((state) => state.loading);
  const assigningId = useDeliveryAssignmentsStore((state) => state.assigningId);
  const assigningGroupId = useDeliveryAssignmentsStore((state) => state.assigningGroupId);
  const loadAssignments = useDeliveryAssignmentsStore((state) => state.loadAssignments);
  const unloadAssignments = useDeliveryAssignmentsStore((state) => state.unloadAssignments);
  const loadDeliveryPersons = useDeliveryAssignmentsStore((state) => state.loadDeliveryPersons);
  const assignDelivery = useDeliveryAssignmentsStore((state) => state.assignDelivery);
  const assignGroupDelivery = useDeliveryAssignmentsStore((state) => state.assignGroupDelivery);
  const clearAssignment = useDeliveryAssignmentsStore((state) => state.clearAssignment);
  const totalItems = useDeliveryAssignmentsStore((state) => state.totalItems);
  const paginatedData = useDeliveryAssignmentsStore((state) => state.paginatedData);
  const tripLabels = useDeliveryAssignmentsStore((state) => state.tripLabels);
  const tripLabelsLoading = useDeliveryAssignmentsStore((state) => state.tripLabelsLoading);
  const tripCreateLoading = useDeliveryAssignmentsStore((state) => state.tripCreateLoading);
  const tripUpdatingId = useDeliveryAssignmentsStore((state) => state.tripUpdatingId);
  const loadTripLabels = useDeliveryAssignmentsStore((state) => state.loadTripLabels);
  const createTripLabel = useDeliveryAssignmentsStore((state) => state.createTripLabel);
  const assignTrip = useDeliveryAssignmentsStore((state) => state.assignTrip);

  const [tripFilter, setTripFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [personFilter, setPersonFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('deliveryPersonId');
  const [searchValue, setSearchValue] = useState('');
  const searchFields = useMemo(() => getSearchFieldsForCollection('deliveryAssignments'), []);

  useEffect(() => {
    const search = searchValue ? { field: searchField, type: 'text' as const, value: searchValue } : null;
    void paginatedData({ pageNumber: currentPage, pageSize, search });
  }, [currentPage, pageSize, searchField, searchValue, paginatedData]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchField, searchValue]);

  const initialAssignmentsLoadRef = useRef(false);
  useEffect(() => {
    if (initialAssignmentsLoadRef.current) {
      return;
    }
    initialAssignmentsLoadRef.current = true;
    void loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    void loadDeliveryPersons();
    void loadTripLabels();
    return () => {
      unloadAssignments();
    };
  }, [loadDeliveryPersons, loadTripLabels, unloadAssignments]);

  const availableTrips = useMemo(() => {
    const set = new Set<string>();
    tripLabels.forEach((label) => {
      const trimmed = label.trim();
      if (trimmed.length > 0) {
        set.add(trimmed);
      }
    });
    assignments.forEach((item) => {
      const value = item.tripNumber?.trim();
      if (value) {
        set.add(value);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [tripLabels, assignments]);

  const distinctGroupNumbers = useMemo(() => {
    const map = new Map<string, string>();
    assignments.forEach((item) => {
      const key = getAssignmentGroupValue(item);
      const label = getAssignmentGroupLabel(item);
      if (!map.has(key)) {
        map.set(key, label);
      }
    });
    const entries = Array.from(map.entries());
    entries.sort((a, b) => a[1].localeCompare(b[1], undefined, { sensitivity: 'base' }));
    return entries;
  }, [assignments]);


  const preferredPersonId = useMemo(() => {
    if (personFilter === 'all' || personFilter === 'unassigned') {
      return null;
    }
    return personFilter;
  }, [personFilter]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      const tripValue = assignment.tripNumber?.trim() ?? '';
      const matchesTrip =
        tripFilter === 'all'
          ? true
          : tripFilter === NO_TRIP_FILTER_VALUE
          ? tripValue.length === 0
          : tripValue === tripFilter;
      const groupValue = getAssignmentGroupValue(assignment);
      const matchesGroup = groupFilter === 'all' || groupValue === groupFilter;
      const matchesPerson =
        personFilter === 'all'
          ? true
          : personFilter === 'unassigned'
          ? !assignment.assignPersonId
          : assignment.assignPersonId === personFilter;
      return matchesTrip && matchesGroup && matchesPerson;
    });
  }, [assignments, tripFilter, groupFilter, personFilter]);

  const sortedAssignments = useMemo(() => {
    return [...filteredAssignments].sort((a, b) => {
      const groupCompare = getAssignmentGroupLabel(a).localeCompare(
        getAssignmentGroupLabel(b),
        undefined,
        { sensitivity: 'base' }
      );
      if (groupCompare !== 0) {
        return groupCompare;
      }
      const locationCompare = getAssignmentLocationLabel(a).localeCompare(
        getAssignmentLocationLabel(b),
        undefined,
        { sensitivity: 'base' }
      );
      if (locationCompare !== 0) {
        return locationCompare;
      }
      return a.customerName.localeCompare(b.customerName, undefined, { sensitivity: 'base' });
    });
  }, [filteredAssignments]);

  const metrics = useMemo(() => {
    const total = assignments.length;
    const assigned = assignments.filter((assignment) => assignment.assignPersonId).length;
    const unassigned = total - assigned;
    const avgDistance = total
      ? assignments.reduce((sum, assignment) => sum + assignment.distanceKm, 0) / total
      : 0;
    return { total, assigned, unassigned, avgDistance: Number(avgDistance.toFixed(1)) };
  }, [assignments]);

  const handleAssign = useCallback(
    (assignmentId: string, personId: string) => {
      void assignDelivery(assignmentId, personId);
    },
    [assignDelivery]
  );

  const handleClear = useCallback(
    (assignmentId: string) => {
      void clearAssignment(assignmentId);
    },
    [clearAssignment]
  );

  const handleAssignGroup = useCallback(
    (groupId: string, personId: string) => {
      void assignGroupDelivery(groupId, personId);
    },
    [assignGroupDelivery]
  );

  const handleAssignTrip = useCallback(
    (assignmentId: string, tripLabel: string | null) => {
      void assignTrip(assignmentId, tripLabel);
    },
    [assignTrip]
  );

  const handleCreateTrip = useCallback(async () => {
    const rawInput = window.prompt('Enter trip name (leave blank to auto-generate):');
    if (rawInput == null) {
      return;
    }
    const trimmed = rawInput.trim();
    const created = await createTripLabel(trimmed.length > 0 ? trimmed : undefined);
    if (created) {
      setTripFilter(created);
    }
  }, [createTripLabel]);

  const columns = useMemo<DataTableColumnDef<DeliveryAssignmentSchema>[]>(
    () => [
      {
        id: 'customer',
        accessorKey: 'customerName',
        header: 'Customer',
        meta: { cellClassName: 'text-sm text-slate-700 whitespace-normal break-words' },
        cell: ({ row }) => (
          <div className="space-y-1 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">{row.original.customerName}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {(() => {
                const displayId = getDisplayCustomerId(row.original.customerShortId, row.original.customerId);
                if (displayId === '—') {
                  return null;
                }
                return (
                  <span className="inline-flex items-center gap-1">
                    <ClipboardList size={12} className="text-purple-500" />
                    CID: {displayId}
                  </span>
                );
              })()}
              <span className="inline-flex items-center gap-1">
                <Phone size={12} className="text-emerald-600" />
                {row.original.mobileNumber}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: 'package',
        accessorKey: 'packageName',
        header: 'Package',
        meta: { cellClassName: 'text-sm text-slate-600 whitespace-normal break-words' },
        cell: ({ row }) => (
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <Package size={16} className="mt-0.5 text-purple-500" />
            <div className="leading-tight">
              <p className="font-medium text-slate-700">{row.original.packageName}</p>
              {row.original.mealType ? (
                <p className="text-xs uppercase tracking-wide text-slate-400">{row.original.mealType}</p>
              ) : null}
              <p className="text-xs text-slate-400">Distance: {row.original.distanceKm.toFixed(1)} km</p>
            </div>
          </div>
        ),
      },
      {
        id: 'deliveryLocation',
        accessorFn: (row) => getAssignmentLocationLabel(row),
        header: 'Delivery Location',
        meta: { cellClassName: 'text-sm whitespace-normal break-words' },
        cell: ({ row }) => {
          const assignment = row.original;
          const locationLabel = getAssignmentLocationLabel(assignment);
          const groupDisplay = getAssignmentGroupLabel(assignment);
          const latString = toCoordinateString(assignment.latitude);
          const lngString = toCoordinateString(assignment.longitude);
          const mapsUrl = buildMapsUrl(assignment);
          return (
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-slate-800">{locationLabel}</p>
              <p className="text-xs font-medium tracking-wide text-slate-400">Group: {groupDisplay}</p>
              <p className="flex items-start gap-2 text-xs text-slate-500">
                <MapPin size={14} className="mt-0.5 text-slate-400" />
                <span>{assignment.address}</span>
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Lat: {latString ?? '—'}</span>
                <span>Lng: {lngString ?? '—'}</span>
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-600 transition hover:border-purple-300 hover:bg-purple-100"
                  >
                    <Navigation2 size={12} />
                    Directions
                  </a>
                ) : null}
                <span>Distance: {assignment.distanceKm.toFixed(1)} km</span>
              </div>
            </div>
          );
        },
      },
      {
        id: 'tripNumber',
        accessorKey: 'tripNumber',
        header: 'Trip Number',
        meta: { cellClassName: 'text-sm font-medium text-slate-700' },
        cell: ({ row }) => (
          <TripSelector
            assignment={row.original}
            tripLabels={availableTrips}
            disabled={tripUpdatingId === row.original.id}
            onAssignTrip={handleAssignTrip}
          />
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        meta: { cellClassName: 'align-top min-w-[210px]' },
        cell: ({ row }) => (
          <AssignmentActionCell
            assignment={row.original}
            deliveryPersons={deliveryPersons}
            assigning={assigningId === row.original.id}
            preferredPersonId={preferredPersonId}
            onAssign={handleAssign}
            onClear={handleClear}
          />
        ),
      },
    ],
    [deliveryPersons, assigningId, preferredPersonId, handleAssign, handleClear, availableTrips, tripUpdatingId, handleAssignTrip]
  );

  const groupingOptions = useMemo<DataTableGroupOptions<DeliveryAssignmentSchema>[]>(() => [
    {
      id: 'trip',
      getGroupKey: (row: Row<DeliveryAssignmentSchema>) => {
        const tripValue = row.original.tripNumber?.trim();
        return tripValue && tripValue.length > 0 ? tripValue : NO_TRIP_GROUP_KEY;
      },
      getGroupLabel: ({ rawKey }) => {
        if (typeof rawKey === 'string' && rawKey.trim().length > 0 && rawKey !== NO_TRIP_GROUP_KEY) {
          return rawKey.trim();
        }
        return NO_TRIP_GROUP_LABEL;
      },
      renderGroupHeader: ({ label, rows }) => {
        const uniqueGroups = new Set(
          rows
            .map((item) => item.original.groupNumber?.trim())
            .filter((value): value is string => Boolean(value && value.length > 0)),
        );
        return (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Navigation2 size={16} className="text-purple-600" />
              <span>{label}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-wide text-slate-500">
              <span>{rows.length} assignments</span>
              <span>{uniqueGroups.size} groups</span>
            </div>
          </div>
        );
      },
      headerRowClassName: 'bg-purple-50/60',
      headerCellClassName: 'py-2 text-[11px] font-semibold tracking-[0.14em] text-purple-700',
      fallbackLabel: NO_TRIP_GROUP_LABEL,
    },
    {
      id: 'group',
      getGroupKey: (row: Row<DeliveryAssignmentSchema>) => getAssignmentGroupValue(row.original),
      getGroupLabel: ({ rows, rawKey }) => {
        const first = rows[0]?.original;
        return first ? getAssignmentGroupLabel(first) : typeof rawKey === 'string' ? rawKey : UNGROUPED_GROUP_LABEL;
      },
      renderGroupHeader: ({ label, rows }) => {
        const uniqueLocations = new Set(
          rows.map((item) => getAssignmentLocationLabel(item.original))
        );
        const firstAssignment = rows[0]?.original;
        const groupId = firstAssignment?.groupId ?? null;
        const isAssigningThisGroup = assigningGroupId === groupId;
        return (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Users size={16} className="text-purple-600" />
              <span>{label}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} className="text-purple-500" />
                  {uniqueLocations.size} location{uniqueLocations.size === 1 ? '' : 's'}
                </span>
                <span>{rows.length} assignments</span>
              </div>
              <GroupHeaderActions
                groupId={groupId}
                groupLabel={label}
                deliveryPersons={deliveryPersons}
                assignmentCount={rows.length}
                onAssignGroup={handleAssignGroup}
                assigning={isAssigningThisGroup}
              />
            </div>
          </div>
        );
      },
      headerRowClassName: 'bg-purple-100/70',
    headerCellClassName: 'py-2 text-[11px] font-semibold tracking-[0.14em] text-purple-700',
      fallbackLabel: UNGROUPED_GROUP_LABEL,
    },
    {
      id: 'location',
      getGroupKey: (row: Row<DeliveryAssignmentSchema>) => getAssignmentLocationKey(row.original),
      getGroupLabel: ({ rows, rawKey }) => {
        const first = rows[0]?.original;
        if (first) {
          return getAssignmentLocationLabel(first);
        }
        if (typeof rawKey === 'string' && rawKey.trim().length > 0) {
          return rawKey.trim();
        }
        return UNASSIGNED_LOCATION_LABEL;
      },
      renderGroupHeader: ({ label, rows }) => {
        const assignment = rows[0]?.original;
        const latString = assignment ? toCoordinateString(assignment.latitude) : null;
        const lngString = assignment ? toCoordinateString(assignment.longitude) : null;
        const mapsUrl = assignment ? buildMapsUrl(assignment) : null;
        return (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <MapPin size={14} className="text-purple-500" />
              <span>{label}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium uppercase tracking-wide text-slate-500">
              <span>{rows.length} assignments</span>
              <span>Lat {latString ?? '—'}</span>
              <span>Lng {lngString ?? '—'}</span>
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-600 transition hover:border-purple-300 hover:bg-purple-100"
                >
                  <Navigation2 size={12} /> Directions
                </a>
              ) : null}
            </div>
          </div>
        );
      },
      headerRowClassName: 'bg-purple-50/60',
    headerCellClassName: 'py-2 text-[11px] font-semibold tracking-[0.14em] text-purple-600 pl-6',
      fallbackLabel: UNASSIGNED_LOCATION_LABEL,
    },
  ], [assigningGroupId, deliveryPersons, handleAssignGroup]);

  return (
    <div className="space-y-8 p-6">
      <header className="space-y-2">
        <div className="flex items-center gap-3 text-purple-600">
          <ClipboardList size={24} />
          <p className="text-sm font-semibold uppercase tracking-wide">Delivery Operations</p>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h1 className="text-3xl font-semibold text-slate-900">Assign Delivery</h1>
          <div className="flex gap-6 text-sm text-slate-600">
            <span className="flex items-center gap-2">
              <Users size={18} className="text-purple-500" />
              Total: <strong className="text-slate-800">{metrics.total}</strong>
            </span>
            <span className="flex items-center gap-2">
              <UserCheck size={18} className="text-emerald-600" />
              Assigned: <strong className="text-slate-800">{metrics.assigned}</strong>
            </span>
            <span className="flex items-center gap-2">
              <Navigation2 size={18} className="text-orange-500" />
              Avg Distance: <strong className="text-slate-800">{metrics.avgDistance} km</strong>
            </span>
          </div>
        </div>
        <p className="max-w-3xl text-sm text-slate-500">
          Filter by trip, delivery group, or partner to prioritise today&apos;s assignments. Use the inline
          actions to quickly dispatch or reassign orders.
        </p>
      </header>

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="tripFilter" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Trip Number
            </label>
            <button
              type="button"
              onClick={handleCreateTrip}
              disabled={tripCreateLoading || tripLabelsLoading}
              className="inline-flex items-center gap-1 rounded-md border border-purple-200 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-purple-600 transition hover:border-purple-300 hover:bg-purple-50 disabled:opacity-50"
            >
              {tripCreateLoading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              {tripCreateLoading ? 'Creating' : 'New Trip'}
            </button>
          </div>
          <select
            id="tripFilter"
            value={tripFilter}
            onChange={(event) => setTripFilter(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/60"
            disabled={tripLabelsLoading}
          >
            <option value="all">All trips</option>
            <option value={NO_TRIP_FILTER_VALUE}>No trip assigned</option>
            {availableTrips.map((trip) => (
              <option key={trip} value={trip}>
                {trip}
              </option>
            ))}
          </select>
          {tripLabelsLoading ? (
            <p className="text-[11px] text-slate-400">Loading trips...</p>
          ) : null}
        </div>
        <div className="space-y-1">
          <label htmlFor="groupFilter" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Delivery Group
          </label>
          <select
            id="groupFilter"
            value={groupFilter}
            onChange={(event) => setGroupFilter(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/60"
          >
            <option value="all">All groups</option>
            {distinctGroupNumbers.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="personFilter" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Assign Person
          </label>
          <select
            id="personFilter"
            value={personFilter}
            onChange={(event) => setPersonFilter(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/60"
          >
            <option value="all">All partners</option>
            <option value="unassigned">Unassigned only</option>
            {deliveryPersons.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section>
        <DataTable
          columns={columns}
          data={sortedAssignments}
          loading={loading}
          emptyMessage={
            loading
              ? 'Fetching delivery assignments...'
              : 'No assignments match the selected filters.'
          }
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
          groupOptions={groupingOptions}
          wrapperClassName="max-w-full overflow-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-950/5 ring-1 ring-slate-200/60"
          tableClassName="min-w-full table-fixed divide-y divide-slate-200 text-left text-sm"
          headerBaseClassName="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500/80"
          cellBaseClassName="px-4 py-3 text-sm text-slate-700 align-top whitespace-normal break-words"
        />
      </section>
    </div>
  );
};

export default AssignDeliveryPage;
