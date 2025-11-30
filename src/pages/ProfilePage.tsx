import React, { useEffect, useState } from 'react';
import { MapPin, Trash2, Edit2, Star, Plus, Mail, Phone, User as UserIcon, CalendarClock, GraduationCap } from 'lucide-react';
import { useUserRoleStore } from '../stores/userRoleStore';
import { useProfileStore } from '../stores/profileStore';
import { useStudentVerificationStore } from '../stores/studentVerificationStore';
import { useUserDeliveryLocationsStore } from '../stores/userDeliveryLocationsStore';
import { useVerificationLocationsStore } from '../stores/verificationLocationsStore';
import { useConfigStore } from '../stores/configStore';
import { PERMISSIONS } from '../permissions';
import Dialog from '../components/Dialog';
import LocationPicker from '../components/LocationPicker';
import VerificationLocationCombobox from '../components/VerificationLocationCombobox';
import type { UserDeliveryLocationSchema } from '../schemas/UserDeliveryLocationSchema';
import { DEFAULT_STUDENT_DISCOUNT_PERCENT } from '../firestore/ConfigModel';

const MAX_STUDENT_PROOF_BYTES = 5 * 1024 * 1024;

const createEmptyVerificationForm = () => ({
  studentId: '',
  institutionName: '',
  course: '',
  yearOfStudy: '',
  expectedGraduation: '',
  studentIdCardImage: '',
});

type VerificationFormState = ReturnType<typeof createEmptyVerificationForm>;

const ProfilePage: React.FC = () => {
  const { user, userType, roles, hasPermission } = useUserRoleStore();
  const { profileData, loading: profileLoading, updating, loadProfile, updateProfile, setProfileData } = useProfileStore();
  const { userVerifications, loading: loadingVerifications, loadUserVerifications, createVerification, submitting: submittingVerification } = useStudentVerificationStore();
  const { locations, loading: loadingLocations, submitting: submittingLocation, deletingId, updatingId, loadLocations, createLocation, updateLocation, deleteLocation, setAsDefault } = useUserDeliveryLocationsStore();
  const { locations: verificationLocations, loading: verificationLocationsLoading, loadLocations: loadVerificationLocations } = useVerificationLocationsStore();
  const config = useConfigStore((state) => state.config);
  const configLoaded = useConfigStore((state) => state.loaded);
  const loadConfig = useConfigStore((state) => state.loadConfig);

  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [verificationForm, setVerificationForm] = useState<VerificationFormState>(createEmptyVerificationForm);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [studentIdProofName, setStudentIdProofName] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const resetVerificationForm = () => {
    setVerificationForm(createEmptyVerificationForm());
    setVerificationError(null);
    setStudentIdProofName('');
  };

  useEffect(() => {
    if (!configLoaded) {
      void loadConfig();
    }
  }, [configLoaded, loadConfig]);

  const studentDiscountPercent = Number(
    config?.studentDiscountPercent ?? DEFAULT_STUDENT_DISCOUNT_PERCENT,
  );
  const studentDiscountLabel = Number.isFinite(studentDiscountPercent) && studentDiscountPercent > 0
    ? (Number.isInteger(studentDiscountPercent) ? `${studentDiscountPercent}%` : `${studentDiscountPercent.toFixed(1)}%`)
    : '6%';

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

  useEffect(() => {
    if (!user) {
      return;
    }
    loadProfile(user.uid);
    loadLocations(user.uid);
    void loadVerificationLocations();
  }, [user, loadProfile, loadLocations, loadVerificationLocations]);

  useEffect(() => {
    if (!user) {
      return;
    }
    if ((profileData.userType || userType) === 'Student') {
      loadUserVerifications(user.uid);
    }
  }, [user, profileData.userType, userType, loadUserVerifications]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData({ [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await updateProfile(user.uid, profileData);
      setIsEditing(false);
    } catch {
      // Error handling is done in the store
    }
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    if (user) {
      void loadProfile(user.uid);
    }
  };

  const fallbackDisplayName = user?.displayName ?? '';
  const fallbackEmail = user?.email ?? '';
  const profileName = profileData.fullName?.trim() || fallbackDisplayName || fallbackEmail || 'Add your name';
  const displayedUserType = profileData.userType || userType || 'Not set';
  const initials = React.useMemo(() => {
    const source = (profileData.fullName?.trim() || fallbackDisplayName || fallbackEmail).trim();
    if (!source) {
      return 'U';
    }
    return source
      .split(/\s+/)
      .slice(0, 2)
      .map((segment) => segment.charAt(0).toUpperCase())
      .join('') || 'U';
  }, [profileData.fullName, fallbackDisplayName, fallbackEmail]);

  const membershipSince = React.useMemo(() => {
    if (!user?.metadata.creationTime) {
      return 'Unknown';
    }
    return new Date(user.metadata.creationTime).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [user?.metadata.creationTime]);

  const lastSignIn = React.useMemo(() => {
    if (!user?.metadata.lastSignInTime) {
      return 'Unknown';
    }
    return new Date(user.metadata.lastSignInTime).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [user?.metadata.lastSignInTime]);

  const primaryLocation = React.useMemo(() => {
    if (locations.length === 0) {
      return null;
    }
    return locations.find((location) => location.isDefault) ?? locations[0];
  }, [locations]);

  const primaryLocationAddress = primaryLocation?.address?.trim() ?? '';

  const contactDetails = React.useMemo(
    () => [
      {
        label: 'Email',
        value: profileData.email?.trim() || fallbackEmail || 'Add your email address',
        icon: Mail,
      },
      {
        label: 'Phone',
        value: profileData.phone?.trim() || 'Add your phone number',
        icon: Phone,
      },
      {
        label: 'Primary Delivery Location',
        value: primaryLocationAddress || 'Add a delivery location',
        icon: MapPin,
      },
    ],
    [profileData.email, profileData.phone, fallbackEmail, primaryLocationAddress],
  );

  const handleVerificationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVerificationError(null);
    const fieldName = name as keyof VerificationFormState;
    setVerificationForm((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleStudentProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setVerificationForm((prev) => ({ ...prev, studentIdCardImage: '' }));
      setStudentIdProofName('');
      return;
    }

    if (file.size > MAX_STUDENT_PROOF_BYTES) {
      setVerificationError('Please upload a file smaller than 5 MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setVerificationForm((prev) => ({ ...prev, studentIdCardImage: (reader.result as string) ?? '' }));
      setStudentIdProofName(file.name);
      setVerificationError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setVerificationError(null);

    const requiredFields: Array<{ key: keyof VerificationFormState; label: string }> = [
      { key: 'studentId', label: 'Student ID' },
      { key: 'institutionName', label: 'Institution name' },
      { key: 'course', label: 'Course' },
      { key: 'yearOfStudy', label: 'Year of study' },
    ];

    for (const field of requiredFields) {
      if (!verificationForm[field.key].trim()) {
        setVerificationError(`${field.label} is required.`);
        return;
      }
    }

    if (!verificationForm.studentIdCardImage) {
      setVerificationError('Please upload your student ID proof.');
      return;
    }

    const result = await createVerification({
      userId: user.uid,
      userName: profileData.fullName?.trim() || user.email || 'Unknown',
      userEmail: profileData.email ?? user.email ?? undefined,
      userPhone: profileData.phone ?? undefined,
      studentId: verificationForm.studentId.trim(),
      institutionName: verificationForm.institutionName.trim(),
      course: verificationForm.course.trim(),
      yearOfStudy: verificationForm.yearOfStudy.trim(),
      expectedGraduation: verificationForm.expectedGraduation.trim() || undefined,
      studentIdCardImage: verificationForm.studentIdCardImage,
    });

    if (result) {
      setShowVerificationForm(false);
      resetVerificationForm();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  const latestVerification = userVerifications[0];

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

  if (!user) {
    return (
      <div className="p-6 text-center">
        <p>Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="grid gap-10">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Profile</h1>
          <p className="mt-2 text-sm text-gray-500">
            Review your personal information, manage delivery locations, and keep your verification up to date.
          </p>
        </div>

        <section className="rounded-3xl bg-white shadow-sm ring-1 ring-gray-100/80 px-6 py-8 md:px-10">
          {profileLoading && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-dashed border-purple-200 bg-purple-50/70 px-4 py-3 text-sm text-purple-700">
              <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-purple-600" />
              Refreshing your profile…
            </div>
          )}
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-2xl font-semibold text-purple-700">
                {initials}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold text-gray-900">{profileName}</h2>
                  <span className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700">
                    <UserIcon className="h-3.5 w-3.5" />
                    {displayedUserType}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Keep your details accurate so deliveries always reach you on time.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 self-start">
              {isEditing ? (
                <button
                  type="button"
                  onClick={handleCancelEditing}
                  className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:border-amber-300 hover:bg-amber-100"
                >
                  Cancel editing
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white px-4 py-2 text-sm font-medium text-purple-700 transition hover:border-purple-400 hover:bg-purple-50"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white px-6 py-5 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Contact Details</h3>
              <dl className="mt-4 space-y-4">
                {contactDetails.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-gray-500">{label}</dt>
                      <dd className="text-sm text-gray-900">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>

            {hasPermission(PERMISSIONS.USER_PROFILE_VIEW) && (
              <div className="rounded-2xl border border-gray-100 bg-white px-6 py-5 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Account Snapshot</h3>
                <dl className="mt-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
                      <UserIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-gray-500">Account Type</dt>
                      <dd className="text-sm text-gray-900">{displayedUserType}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
                      <CalendarClock className="h-4 w-4" />
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-gray-500">Member Since</dt>
                      <dd className="text-sm text-gray-900">{membershipSince}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
                      <CalendarClock className="h-4 w-4" />
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-gray-500">Last Sign In</dt>
                      <dd className="text-sm text-gray-900">{lastSignIn}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
                      <Star className="h-4 w-4" />
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-gray-500">Roles</dt>
                      <dd className="mt-1 flex flex-wrap gap-2 text-sm text-gray-900">
                        {roles.length > 0 ? (
                          roles.map((role) => (
                            <span key={role.id} className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                              {role.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">No roles assigned</span>
                        )}
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </section>

        {isEditing && (
          <section className="rounded-3xl bg-white shadow-sm ring-1 ring-gray-100/80 px-6 py-8 md:px-10">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Edit Profile</h2>
              <p className="mt-1 text-sm text-gray-500">Update how we reach you and personalise your experience.</p>
            </div>
            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="fullName" className="text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={profileData.fullName ?? ''}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={profileData.phone ?? ''}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={profileData.email ?? ''}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="userType" className="text-sm font-medium text-gray-700">User Type</label>
                  <select
                    id="userType"
                    name="userType"
                    value={profileData.userType ?? ''}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select user type</option>
                    <option value="Student">Student</option>
                    <option value="Individual">Individual</option>
                    <option value="Corporate">Corporate</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="verificationLocationName" className="text-sm font-medium text-gray-700">Verification Location</label>
                  <VerificationLocationCombobox
                    value={profileData.verificationLocationName || ''}
                    onChange={(value) => setProfileData({ verificationLocationName: value })}
                    locations={verificationLocations}
                    loading={verificationLocationsLoading}
                    placeholder="Select or type a location"
                  />
                  <p className="text-xs text-gray-500">Where you'd like to verify your identity if needed</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelEditing}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updating ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </section>
        )}

        {profileData.userType === 'Student' && (
          <section className="rounded-3xl bg-white shadow-sm ring-1 ring-gray-100/80 px-6 py-8 md:px-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Student Verification</h2>
                <p className="mt-1 text-sm text-gray-500">Upload the required details to unlock student pricing and perks.</p>
              </div>
              {!loadingVerifications && latestVerification && (
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusColor(latestVerification.status)}`}>
                  {latestVerification.status.charAt(0).toUpperCase() + latestVerification.status.slice(1)}
                </span>
              )}
            </div>

            <div className="mt-6 space-y-6">
              <div className="rounded-2xl border border-dashed border-purple-200 bg-purple-50/60 px-5 py-4">
                <div className="flex items-start gap-3 text-sm text-purple-800">
                  <div className="rounded-full bg-white p-2 text-purple-600">
                    <GraduationCap className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-purple-900">Student verification details</p>
                    <p className="text-xs text-purple-700">
                      Upload your student ID to unlock an extra {studentDiscountLabel} off every subscription. We verify it once and keep the
                      savings applied to your plan.
                    </p>
                  </div>
                </div>
              </div>

              {loadingVerifications ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-purple-200 bg-purple-50/60 px-6 py-10 text-sm text-purple-700">
                  <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-purple-600" />
                  Loading verification status…
                </div>
              ) : latestVerification ? (
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                  <div className="space-y-2 text-sm text-gray-700">
                    <p><strong>Student ID:</strong> {latestVerification.studentId}</p>
                    <p><strong>Institution:</strong> {latestVerification.institutionName}</p>
                    <p><strong>Course:</strong> {latestVerification.course}</p>
                    <p><strong>Year of Study:</strong> {latestVerification.yearOfStudy}</p>
                    {latestVerification.expectedGraduation && (
                      <p><strong>Expected Graduation:</strong> {latestVerification.expectedGraduation}</p>
                    )}
                    {latestVerification.createdAt && (
                      <p><strong>Submitted:</strong> {new Date(latestVerification.createdAt).toLocaleDateString()}</p>
                    )}
                    {latestVerification.status === 'approved' && latestVerification.reviewedAt && (
                      <p className="text-green-600"><strong>Approved:</strong> {new Date(latestVerification.reviewedAt).toLocaleDateString()}</p>
                    )}
                  </div>

                  {latestVerification.status === 'rejected' && (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                      {latestVerification.reviewedAt && (
                        <p><strong>Rejected:</strong> {new Date(latestVerification.reviewedAt).toLocaleDateString()}</p>
                      )}
                      {latestVerification.statusNote && (
                        <p className="mt-1"><strong>Reason:</strong> {latestVerification.statusNote}</p>
                      )}
                    </div>
                  )}

                  {latestVerification.status === 'rejected' && (
                    <button
                      onClick={() => {
                        resetVerificationForm();
                        setShowVerificationForm(true);
                      }}
                      className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
                    >
                      Submit new verification
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  {!showVerificationForm ? (
                    <div className="rounded-2xl border border-dashed border-purple-200 bg-purple-50/40 px-6 py-10 text-center text-sm text-purple-700">
                      <p>You haven&apos;t submitted student verification yet.</p>
                      <button
                        onClick={() => {
                          resetVerificationForm();
                          setShowVerificationForm(true);
                        }}
                        className="mt-4 inline-flex items-center justify-center rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
                      >
                        Verify student status
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitVerification} className="space-y-4 rounded-2xl border border-gray-100 bg-white px-6 py-6 shadow-sm">
                      {verificationError && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          {verificationError}
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-1">
                            Student ID *
                          </label>
                          <input
                            type="text"
                            id="studentId"
                            name="studentId"
                            value={verificationForm.studentId}
                            onChange={handleVerificationInputChange}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="institutionName" className="block text-sm font-medium text-gray-700 mb-1">
                            Institution Name *
                          </label>
                          <input
                            type="text"
                            id="institutionName"
                            name="institutionName"
                            value={verificationForm.institutionName}
                            onChange={handleVerificationInputChange}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-1">
                            Course *
                          </label>
                          <input
                            type="text"
                            id="course"
                            name="course"
                            value={verificationForm.course}
                            onChange={handleVerificationInputChange}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="yearOfStudy" className="block text-sm font-medium text-gray-700 mb-1">
                            Year of Study *
                          </label>
                          <input
                            type="text"
                            id="yearOfStudy"
                            name="yearOfStudy"
                            value={verificationForm.yearOfStudy}
                            onChange={handleVerificationInputChange}
                            placeholder="e.g., 2nd Year"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="expectedGraduation" className="block text-sm font-medium text-gray-700 mb-1">
                            Expected Graduation (optional)
                          </label>
                          <input
                            type="text"
                            id="expectedGraduation"
                            name="expectedGraduation"
                            value={verificationForm.expectedGraduation}
                            onChange={handleVerificationInputChange}
                            placeholder="e.g., May 2025"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="studentIdCardImage" className="block text-sm font-medium text-gray-700 mb-1">
                          Student ID proof (image or PDF, max 5 MB) *
                        </label>
                        <input
                          type="file"
                          id="studentIdCardImage"
                          accept="image/*,application/pdf"
                          onChange={handleStudentProofUpload}
                          className="w-full rounded-md border border-dashed border-purple-300 bg-white px-3 py-2 text-sm text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-300"
                          required={!verificationForm.studentIdCardImage}
                        />
                        {studentIdProofName && (
                          <p className="mt-1 text-xs text-purple-600">Selected file: {studentIdProofName}</p>
                        )}
                      </div>

                      <div className="flex flex-col gap-3 text-sm text-gray-600">
                        <div className="flex gap-3">
                          <button
                            type="submit"
                            disabled={submittingVerification}
                            className="flex-1 rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {submittingVerification ? 'Submitting…' : 'Submit verification'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowVerificationForm(false);
                              resetVerificationForm();
                            }}
                            className="rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 transition hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        <section className="rounded-3xl bg-white shadow-sm ring-1 ring-gray-100/80 px-6 py-8 md:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Delivery Locations</h2>
              <p className="mt-1 text-sm text-gray-500">Save your go-to drop-off points for faster checkout.</p>
            </div>
            <button
              onClick={() => handleOpenLocationDialog()}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
            >
              <Plus size={16} />
              Add Location
            </button>
          </div>

          <div className="mt-6">
            {loadingLocations ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-purple-200 bg-purple-50/60 px-6 py-10 text-sm text-purple-700">
                <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-purple-600" />
                Loading locations…
              </div>
            ) : locations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-purple-200 bg-purple-50/40 px-6 py-10 text-center">
                <MapPin size={40} className="mx-auto text-purple-400" />
                <p className="mt-3 text-sm font-medium text-purple-700">No delivery locations added yet</p>
                <p className="mt-1 text-xs text-purple-600">Add delivery locations to make ordering easier.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {locations.map((location) => (
                  <div
                    key={location.id}
                    className={`rounded-2xl border p-5 shadow-sm transition ${
                      location.isDefault ? 'border-purple-500 bg-purple-50/80' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <MapPin size={18} className="text-purple-600" />
                          <h3 className="font-semibold text-gray-900">{location.locationName}</h3>
                          {location.isDefault && (
                            <span className="flex items-center gap-1 rounded-full bg-purple-600 px-2 py-1 text-xs font-semibold text-white">
                              <Star size={12} fill="currentColor" />
                              Default
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-gray-700">{location.address}</p>
                        {location.landmark && (
                          <p className="text-xs text-gray-500">Landmark: {location.landmark}</p>
                        )}
                        <p className="text-xs text-gray-500">Coordinates: {location.coordinates}</p>
                        {location.contactName && (
                          <p className="text-xs text-gray-600">Contact: {location.contactName}</p>
                        )}
                        {location.contactPhone && (
                          <p className="text-xs text-gray-600">Phone: {location.contactPhone}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {!location.isDefault && (
                          <button
                            onClick={() => handleSetDefaultLocation(location.id!)}
                            disabled={updatingId === location.id}
                            className="rounded-md p-2 text-gray-600 transition hover:bg-purple-50 hover:text-purple-600 disabled:opacity-50"
                            title="Set as default"
                          >
                            <Star size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenLocationDialog(location)}
                          disabled={updatingId === location.id}
                          className="rounded-md p-2 text-gray-600 transition hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => setDeletingLocation(location)}
                          disabled={deletingId === location.id}
                          className="rounded-md p-2 text-gray-600 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
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
        </section>
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
              placeholder="Enter complete address"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location on Map *
            </label>
            <LocationPicker
              coordinates={locationForm.coordinates}
              onCoordinatesChange={(coords) => {
                setLocationForm(prev => ({ ...prev, coordinates: coords }));
              }}
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
                placeholder="e.g., John Doe"
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
                placeholder="e.g., +1234567890"
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
              className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
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
              disabled={submittingLocation}
              className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
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
        title="Delete Location"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <strong>{deletingLocation?.locationName}</strong>? This action cannot be undone.
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
              disabled={deletingId === deletingLocation?.id}
              className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default ProfilePage;