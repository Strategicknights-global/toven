import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Trash2, Edit2, Star, Plus, Loader2, Package, Truck } from 'lucide-react';
import { useUserRoleStore } from '../stores/userRoleStore';
import { useUserDeliveryLocationsStore } from '../stores/userDeliveryLocationsStore';
import { useProfileStore } from '../stores/profileStore';
import Dialog from '../components/Dialog';
import LocationPicker from '../components/LocationPicker';
import type { UserDeliveryLocationSchema } from '../schemas/UserDeliveryLocationSchema';
import { useDeliveryAssignmentsStore } from '../stores/deliveryAssignmentsStore';
import type { DeliveryAssignmentSchema, DeliveryAssignmentStatus } from '../schemas/DeliveryAssignmentSchema';

const STATUS_LABELS: Record<DeliveryAssignmentStatus, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  'picked-up': 'Picked Up',
  'en-route': 'En Route',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_STYLES: Record<DeliveryAssignmentStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  assigned: 'bg-blue-100 text-blue-700',
  'picked-up': 'bg-teal-100 text-teal-700',
  'en-route': 'bg-purple-100 text-purple-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

const ACTIVE_STATUSES = new Set<DeliveryAssignmentStatus>(['pending', 'assigned', 'picked-up', 'en-route']);

const resolveTimestamp = (assignment: DeliveryAssignmentSchema): Date | null => {
  const candidates: Array<Date | null | undefined> = [assignment.updatedAt, assignment.createdAt];
  const valid = candidates.find((value) => value instanceof Date && !Number.isNaN(value.getTime()));
  return valid instanceof Date ? valid : null;
};

const DeliveryStatusPage: React.FC = () => {
  const { user } = useUserRoleStore();
  const { profileData } = useProfileStore();
  const { locations, loading: loadingLocations, submitting: submittingLocation, deletingId, updatingId, loadLocations, createLocation, updateLocation, deleteLocation, setAsDefault } = useUserDeliveryLocationsStore();
  const assignments = useDeliveryAssignmentsStore((state) => state.assignments);
  const assignmentsLoading = useDeliveryAssignmentsStore((state) => state.loading);
  const loadAssignments = useDeliveryAssignmentsStore((state) => state.loadAssignments);
  const unloadAssignments = useDeliveryAssignmentsStore((state) => state.unloadAssignments);

  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState<UserDeliveryLocationSchema | null>(null);
  const [locationForm, setLocationForm] = useState({
    locationName: '',
    address: '',
    coordinates: '',
    landmark: '',
    contactPhone: '',
    contactName: '',
    isDefault: false
  });
  const [deletingLocation, setDeletingLocation] = useState<UserDeliveryLocationSchema | null>(null);
  const assignmentsInitialisedRef = useRef(false);

  useEffect(() => {
    if (user) {
      loadLocations(user.uid);
    }
  }, [user, loadLocations]);

  useEffect(() => {
    if (!user?.uid) {
      unloadAssignments();
      assignmentsInitialisedRef.current = false;
      return;
    }
    if (!assignmentsInitialisedRef.current) {
      assignmentsInitialisedRef.current = true;
      void loadAssignments();
    }
    return () => {
      unloadAssignments();
      assignmentsInitialisedRef.current = false;
    };
  }, [user?.uid, loadAssignments, unloadAssignments]);

  const userAssignments = useMemo(() => {
    if (!user?.uid) {
      return [] as DeliveryAssignmentSchema[];
    }
    return assignments.filter((assignment) => assignment.customerId === user.uid);
  }, [assignments, user?.uid]);

  const activeDeliveries = useMemo(() => {
    return [...userAssignments]
      .filter((assignment) => ACTIVE_STATUSES.has((assignment.status ?? 'pending') as DeliveryAssignmentStatus))
      .sort((a, b) => {
        const aTime = resolveTimestamp(a)?.getTime() ?? 0;
        const bTime = resolveTimestamp(b)?.getTime() ?? 0;
        return bTime - aTime;
      });
  }, [userAssignments]);

  const recentHistory = useMemo(() => {
    return [...userAssignments]
      .filter((assignment) => !ACTIVE_STATUSES.has((assignment.status ?? 'pending') as DeliveryAssignmentStatus))
      .sort((a, b) => {
        const aTime = resolveTimestamp(a)?.getTime() ?? 0;
        const bTime = resolveTimestamp(b)?.getTime() ?? 0;
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [userAssignments]);

  const deliveredCount = useMemo(
    () => userAssignments.filter((assignment) => (assignment.status ?? 'pending') === 'delivered').length,
    [userAssignments],
  );

  // Delivery Location Handlers
  const handleOpenLocationDialog = (location?: UserDeliveryLocationSchema) => {
    if (location) {
      setEditingLocation(location);
      setLocationForm({
        locationName: location.locationName,
        address: location.address,
        coordinates: location.coordinates,
        landmark: location.landmark || '',
        contactPhone: location.contactPhone || '',
        contactName: location.contactName || '',
        isDefault: location.isDefault
      });
    } else {
      setEditingLocation(null);
      setLocationForm({
        locationName: '',
        address: '',
        coordinates: '20.5937,78.9629', // Default to India center
        landmark: '',
        contactPhone: '',
        contactName: '',
        isDefault: false
      });
    }
    setShowLocationDialog(true);
  };

  const handleCloseLocationDialog = () => {
    setShowLocationDialog(false);
    setEditingLocation(null);
  };

  const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setLocationForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setLocationForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmitLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (editingLocation) {
      // Update existing location
      const result = await updateLocation(editingLocation.id!, locationForm);
      if (result) {
        handleCloseLocationDialog();
      }
    } else {
      // Create new location
      const result = await createLocation({
        userId: user.uid,
        userName: profileData.fullName || user.email || 'Unknown',
        ...locationForm
      });
      if (result) {
        handleCloseLocationDialog();
      }
    }
  };

  const handleDeleteLocation = async () => {
    if (!deletingLocation) return;
    await deleteLocation(deletingLocation.id!);
    setDeletingLocation(null);
  };

  const handleSetDefaultLocation = async (locationId: string) => {
    if (!user) return;
    await setAsDefault(locationId, user.uid);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Delivery Status</h1>
      
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-2xl font-semibold mb-2">Track Your Deliveries</h2>
        <p className="text-gray-600 mb-6">Stay up to date on every add-on headed your way and review recent drops.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-green-50 p-6 rounded-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700">
                <Truck size={18} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-green-900">Active Deliveries</h3>
                <p className="text-sm text-green-700">{activeDeliveries.length} in progress</p>
              </div>
            </div>
            {assignmentsLoading ? (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking for delivery updates…
              </div>
            ) : activeDeliveries.length === 0 ? (
              <p className="text-sm text-green-700">No active deliveries right now. We will notify you when the next drop is on the move.</p>
            ) : (
              <div className="space-y-3">
                {activeDeliveries.map((assignment) => {
                  const status = (assignment.status ?? 'pending') as DeliveryAssignmentStatus;
                  const timestamp = resolveTimestamp(assignment);
                  const locationLabel = assignment.deliveryLocationName || assignment.address || 'Scheduled delivery';
                  return (
                    <div key={assignment.id} className="rounded-lg border border-green-200 bg-white/70 p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-green-900">{assignment.packageName || 'Meal delivery'}</p>
                          <p className="text-xs text-green-700">Trip {assignment.tripNumber || '—'} · {locationLabel}</p>
                          <p className="text-xs text-green-600">Updated {timestamp ? timestamp.toLocaleString() : 'Recently'}</p>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[status]}`}>
                          {STATUS_LABELS[status]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="bg-blue-50 p-6 rounded-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <Package size={18} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-blue-900">Recent Deliveries</h3>
                <p className="text-sm text-blue-700">{deliveredCount} completed</p>
              </div>
            </div>
            {assignmentsLoading ? (
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                Fetching delivery history…
              </div>
            ) : recentHistory.length === 0 ? (
              <p className="text-sm text-blue-700">No delivery history yet. Your completed deliveries will show up here.</p>
            ) : (
              <div className="space-y-3">
                {recentHistory.map((assignment) => {
                  const status = (assignment.status ?? 'delivered') as DeliveryAssignmentStatus;
                  const timestamp = resolveTimestamp(assignment);
                  const locationLabel = assignment.deliveryLocationName || assignment.address || 'Delivery location';
                  return (
                    <div key={assignment.id} className="rounded-lg border border-blue-200 bg-white/70 p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-blue-900">{assignment.packageName || 'Meal delivery'}</p>
                          <p className="text-xs text-blue-700">Trip {assignment.tripNumber || '—'} · {locationLabel}</p>
                          <p className="text-xs text-blue-600">Completed {timestamp ? timestamp.toLocaleString() : 'recently'}</p>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[status]}`}>
                          {STATUS_LABELS[status]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delivery Locations Section */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Delivery Locations</h2>
          <button
            onClick={() => handleOpenLocationDialog()}
            className="flex items-center gap-2 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <Plus size={16} />
            Add Location
          </button>
        </div>

        {loadingLocations ? (
          <div className="text-center py-4">
            <p className="text-gray-600">Loading locations...</p>
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <MapPin size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 mb-2">No delivery locations added yet</p>
            <p className="text-sm text-gray-500">Add your delivery locations to make ordering easier</p>
          </div>
        ) : (
          <div className="space-y-3">
            {locations.map((location) => (
              <div
                key={location.id}
                className={`border rounded-lg p-4 ${
                  location.isDefault ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin size={18} className="text-purple-600" />
                      <h3 className="font-semibold text-gray-900">{location.locationName}</h3>
                      {location.isDefault && (
                        <span className="flex items-center gap-1 text-xs bg-purple-600 text-white px-2 py-1 rounded-full">
                          <Star size={12} fill="currentColor" />
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-1">{location.address}</p>
                    {location.landmark && (
                      <p className="text-xs text-gray-500 mb-1">Landmark: {location.landmark}</p>
                    )}
                    <p className="text-xs text-gray-500 mb-1">
                      Coordinates: {location.coordinates}
                    </p>
                    {location.contactName && (
                      <p className="text-xs text-gray-600">Contact: {location.contactName}</p>
                    )}
                    {location.contactPhone && (
                      <p className="text-xs text-gray-600">Phone: {location.contactPhone}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    {!location.isDefault && (
                      <button
                        onClick={() => handleSetDefaultLocation(location.id!)}
                        disabled={updatingId === location.id}
                        className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-md disabled:opacity-50"
                        title="Set as default"
                      >
                        <Star size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenLocationDialog(location)}
                      disabled={updatingId === location.id}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md disabled:opacity-50"
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => setDeletingLocation(location)}
                      disabled={deletingId === location.id}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Location Dialog */}
      <Dialog
        open={showLocationDialog}
        onClose={handleCloseLocationDialog}
        title={editingLocation ? 'Edit Delivery Location' : 'Add Delivery Location'}
        size="lg"
      >
        <form onSubmit={handleSubmitLocation} className="space-y-4">
          <div>
            <label htmlFor="locationName" className="block text-sm font-medium text-gray-700 mb-1">
              Location Name *
            </label>
            <input
              type="text"
              id="locationName"
              name="locationName"
              value={locationForm.locationName}
              onChange={handleLocationInputChange}
              placeholder="e.g., Home, Office, Mom's Place"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <textarea
              id="address"
              name="address"
              value={locationForm.address}
              onChange={handleLocationInputChange}
              rows={3}
              placeholder="Enter full delivery address"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label htmlFor="landmark" className="block text-sm font-medium text-gray-700 mb-1">
              Landmark (Optional)
            </label>
            <input
              type="text"
              id="landmark"
              name="landmark"
              value={locationForm.landmark}
              onChange={handleLocationInputChange}
              placeholder="e.g., Near City Mall"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Coordinates *
            </label>
            <LocationPicker
              coordinates={locationForm.coordinates}
              onCoordinatesChange={(coords) => setLocationForm(prev => ({ ...prev, coordinates: coords }))}
              buttonText="Select Location on Map"
              buttonClassName="w-full"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name (Optional)
              </label>
              <input
                type="text"
                id="contactName"
                name="contactName"
                value={locationForm.contactName}
                onChange={handleLocationInputChange}
                placeholder="Recipient name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-1">
                Contact Phone (Optional)
              </label>
              <input
                type="tel"
                id="contactPhone"
                name="contactPhone"
                value={locationForm.contactPhone}
                onChange={handleLocationInputChange}
                placeholder="Phone number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isDefault"
              name="isDefault"
              checked={locationForm.isDefault}
              onChange={handleLocationInputChange}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700">
              Set as default delivery location
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submittingLocation}
              className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {submittingLocation ? 'Saving...' : editingLocation ? 'Update Location' : 'Add Location'}
            </button>
            <button
              type="button"
              onClick={handleCloseLocationDialog}
              className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingLocation}
        onClose={() => setDeletingLocation(null)}
        title="Delete Delivery Location"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete the location <strong>"{deletingLocation?.locationName}"</strong>? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDeleteLocation}
              disabled={deletingId === deletingLocation?.id}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            >
              {deletingId === deletingLocation?.id ? 'Deleting...' : 'Delete'}
            </button>
            <button
              onClick={() => setDeletingLocation(null)}
              className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default DeliveryStatusPage;