import React, { useState, useMemo } from 'react';
import Dialog from './Dialog';
import { useUsersStore } from '../stores/usersStore';
import { useToastStore } from '../stores/toastStore';
import { RoleModel, ConfigModel } from '../firestore';
import { firebaseConfig } from '../firebase';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';

interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
}

const roleOptions = [
  { value: 'Delivery', label: 'Delivery' },
  { value: 'Chef', label: 'Chef' },
  { value: 'Admin', label: 'Admin' },
];

const prefixOptions = ['Mr', 'Mrs', 'Ms'];
const specializationOptions = [
  'Indian Cuisine',
  'Italian Cuisine',
  'Chinese Cuisine',
  'Continental Cuisine',
  'Mexican Cuisine'
];
const experienceOptions = [
  '0-2 years',
  '3-5 years',
  '6-10 years',
  '10+ years'
];

const AddUserDialog: React.FC<AddUserDialogProps> = ({ open, onClose }) => {
  const { refreshUsers } = useUsersStore();
  const addToast = useToastStore(s => s.addToast);
  const [submitting, setSubmitting] = useState(false);

  // Basic info state
  const [prefix, setPrefix] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [roleType, setRoleType] = useState('Delivery');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Delivery specific
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');

  // Chef specific
  const [specialization, setSpecialization] = useState('');
  const [experience, setExperience] = useState('');

  const fullName = useMemo(() => [firstName, lastName].filter(Boolean).join(' '), [firstName, lastName]);

  const reset = () => {
    setPrefix(''); setFirstName(''); setLastName(''); setEmail(''); setContactNumber('');
    setIsActive(true); setRoleType('Delivery'); setPassword(''); setConfirmPassword('');
    setVehicleNumber(''); setVehicleModel(''); setSpecialization(''); setExperience('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !email || !contactNumber || !roleType) {
      addToast('Please fill all required fields', 'error');
      return;
    }
    const needsPassword = roleType === 'Delivery' || roleType === 'Chef';
    if (needsPassword) {
      if (!password) {
        addToast('Password required for selected role', 'error');
        return;
      }
      if (password !== confirmPassword) {
        addToast('Passwords do not match', 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      // Determine initial role assignment:
      // 1. Try per-role default from config
      // 2. Fallback to legacy global default
      // 3. Fallback to role by name match
      const cfg = await ConfigModel.get();
      const sanitizeRoleId = (value?: string | null) => (value && value.trim().length > 0 ? value : undefined);
      const configRoleByType = (type: string) => {
        if (type === 'Delivery') return cfg.defaultDeliveryRoleId;
        if (type === 'Chef') return cfg.defaultChefRoleId;
        if (type === 'Admin') return cfg.defaultAdminRoleId;
        return undefined;
      };

      let selectedRoleId = sanitizeRoleId(configRoleByType(roleType));
      if (!selectedRoleId) selectedRoleId = sanitizeRoleId(cfg.defaultRoleId); // legacy fallback
      if (!selectedRoleId) {
        const roles = await RoleModel.findAll();
        const matchedRole = roles.find(r => r.name.toLowerCase() === roleType.toLowerCase());
        selectedRoleId = sanitizeRoleId(matchedRole?.id);
      }
      const roleIds = selectedRoleId ? [selectedRoleId] : [];

  // Auth creation (Firebase Auth) could be integrated here if needed.

      // We use UserModel directly via dynamic import to avoid circular
      const { UserModel } = await import('../firestore');
      let authUid: string | undefined;
      if (needsPassword) {
        // Create user with a secondary (ephemeral) app so current session isn't replaced.
        let secondaryAuth;
        try {
          const secondaryName = 'secondary-admin';
          const existing = getApps().find(a => a.name === secondaryName);
          const secondaryApp = existing || initializeApp(firebaseConfig, secondaryName);
          secondaryAuth = getAuth(secondaryApp);
          const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
          authUid = cred.user.uid;
        } catch (authErr) {
          throw new Error('Auth creation failed: ' + (authErr as Error).message);
        } finally {
          // Sign out from secondary auth to free memory (does not affect primary session)
          try { await secondaryAuth?.signOut(); } catch { /* ignore */ }
        }
      }

      // Build payload without undefined fields to satisfy validator
      const payload: any = {
        fullName: fullName || firstName,
        phone: contactNumber,
        email,
        userType: roleType,
        roles: roleIds,
        firstName,
        lastName,
        isActive,
        contactNumber,
        roleType
      };
      if (prefix) payload.prefix = prefix; // only include if user selected

      if (roleType === 'Delivery') {
        if (vehicleNumber) payload.vehicleNumber = vehicleNumber;
        if (vehicleModel) payload.vehicleModel = vehicleModel;
      }
      if (roleType === 'Chef') {
        if (specialization) payload.specialization = specialization;
        if (experience) payload.experience = experience;
      }

  await UserModel.create(payload, authUid);

      addToast('User created', 'success');
      await refreshUsers();
      reset();
      onClose();
    } catch (err) {
      addToast('Failed to create user: ' + (err as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => { if (!submitting) { onClose(); reset(); } }}
      title="Add User"
      description="Add a new user with role-specific details"
      size="xl"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => { if (!submitting) { onClose(); reset(); } }}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-60"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-user-form"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? 'Creating…' : 'Create User'}
          </button>
        </div>
      }
    >
      <form id="add-user-form" onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <section>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Prefix</label>
              <select value={prefix} onChange={e => setPrefix(e.target.value)} className="w-full border rounded-md px-2 py-1 text-sm">
                <option value="">None</option>
                {prefixOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">First Name *</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full border rounded-md px-2 py-1 text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Last Name</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} className="w-full border rounded-md px-2 py-1 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded-md px-2 py-1 text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contact Number *</label>
              <input value={contactNumber} onChange={e => setContactNumber(e.target.value)} className="w-full border rounded-md px-2 py-1 text-sm" required />
            </div>
            <div>
              <label className="flex items-center gap-2 mt-5 text-xs font-medium text-slate-600">
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} /> Active?
              </label>
            </div>
          </div>
        </section>

        {/* Roles and Permissions */}
        <section>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Roles & Permissions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Role *</label>
              <select value={roleType} onChange={e => setRoleType(e.target.value)} className="w-full border rounded-md px-2 py-1 text-sm" required>
                {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {(roleType === 'Delivery' || roleType === 'Chef') && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Password *</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded-md px-2 py-1 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Confirm Password *</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full border rounded-md px-2 py-1 text-sm" required />
                </div>
              </>
            )}
          </div>
        </section>

        {/* Conditional Sections */}
        {roleType === 'Delivery' && (
          <section>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Delivery Person Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Vehicle Number</label>
                <input value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} className="w-full border rounded-md px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Vehicle Model</label>
                <input value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} className="w-full border rounded-md px-2 py-1 text-sm" />
              </div>
            </div>
          </section>
        )}

        {roleType === 'Chef' && (
          <section>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Chef Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Specialization</label>
                <select value={specialization} onChange={e => setSpecialization(e.target.value)} className="w-full border rounded-md px-2 py-1 text-sm">
                  <option value="">Select specialization</option>
                  {specializationOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Experience</label>
                <select value={experience} onChange={e => setExperience(e.target.value)} className="w-full border rounded-md px-2 py-1 text-sm">
                  <option value="">Select experience level</option>
                  {experienceOptions.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
            </div>
          </section>
        )}

        {roleType === 'Admin' && (
          <section>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Admin</h3>
            <p className="text-xs text-slate-500">No additional details required</p>
          </section>
        )}
      </form>
    </Dialog>
  );
};

export default AddUserDialog;
