import React from 'react';
import { Eye, EyeOff, MapPin } from 'lucide-react';
import { useSignupModalStore } from '../stores/signupModalStore';
import { useLoginModalStore } from '../stores/loginModalStore';
import LocationPicker from './LocationPicker';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignup: (
    fullName: string,
    phone: string,
    email: string,
    userType: string,
    password: string,
    deliveryLocation: DeliveryLocationSignupPayload,
    referralCode?: string,
  ) => Promise<void> | void;
}

export interface DeliveryLocationSignupPayload {
  locationName: string;
  address: string;
  coordinates: string;
  landmark?: string;
  contactPhone?: string;
  contactName?: string;
}

const DELIVERY_LOCATION_OPTIONS = ['Home', 'Office', 'PG'] as const;

const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/g; // eslint-disable-line no-control-regex

const sanitizeSingleLine = (value: string) =>
  value
    .replace(CONTROL_CHAR_REGEX, '')
    .replace(/[<>]/g, '');

const sanitizePhoneNumber = (value: string) => {
  const cleaned = value.replace(/[^+0-9]/g, '');
  if (!cleaned) {
    return '';
  }
  if (cleaned.startsWith('+')) {
    return `+${cleaned.slice(1).replace(/\D/g, '')}`;
  }
  return cleaned.replace(/\D/g, '');
};

const sanitizeEmail = (value: string) => value.replace(/\s/g, '');

const sanitizeReferralCode = (value: string) => value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

const SignupModal: React.FC<SignupModalProps> = ({ isOpen, onClose, onSignup }) => {
  const [fullName, setFullName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [emailFocused, setEmailFocused] = React.useState(false);
  const [userType, setUserType] = React.useState('Individual');
  const [password, setPassword] = React.useState('');
  const [referralCode, setReferralCode] = React.useState('');
  
  // Delivery location fields
  const [deliveryLocationName, setDeliveryLocationName] = React.useState<typeof DELIVERY_LOCATION_OPTIONS[number]>(DELIVERY_LOCATION_OPTIONS[0]);
  const [deliveryLocationCoordinates, setDeliveryLocationCoordinates] = React.useState('');

  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const { close: closeSignup } = useSignupModalStore();
  const { open: openLogin } = useLoginModalStore();

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }
    setFormError(null);
    setSubmitting(false);
    setDeliveryLocationName(DELIVERY_LOCATION_OPTIONS[0]);
    setDeliveryLocationCoordinates('');
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) {
      return;
    }

    setFormError(null);

    // Validate delivery location
    const cleanedDeliveryLocationName = sanitizeSingleLine(deliveryLocationName).trim();
    if (!cleanedDeliveryLocationName) {
      setFormError('Please provide a name for your delivery location (e.g., Home, Office).');
      return;
    }
    if (!deliveryLocationCoordinates) {
      setFormError('Please select your delivery location on the map.');
      return;
    }

    try {
      setSubmitting(true);
      const cleanedFullName = sanitizeSingleLine(fullName).trim();
      const cleanedPhone = sanitizePhoneNumber(phone);
      const cleanedEmail = sanitizeEmail(email).trim();
      const cleanedReferralCode = sanitizeReferralCode(referralCode);

      if (!cleanedPhone) {
        setFormError('Please provide a valid phone number.');
        setSubmitting(false);
        return;
      }

      const generatedAddress = `Coordinates: ${deliveryLocationCoordinates}`;
      const deliveryLocation: DeliveryLocationSignupPayload = {
        locationName: cleanedDeliveryLocationName,
        address: generatedAddress,
        coordinates: deliveryLocationCoordinates,
      };

      await onSignup(
        cleanedFullName,
        cleanedPhone,
        cleanedEmail,
        userType,
        password,
        deliveryLocation,
        cleanedReferralCode || undefined,
      );
    } catch (error) {
      setFormError((error as Error).message ?? 'Failed to sign up.');
    } finally {
      setSubmitting(false);
    }
  };

  const switchToLogin = () => {
    closeSignup();
    openLogin();
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl max-w-md w-full relative max-h-[calc(100vh-2rem)] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl font-bold"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold text-purple-600 mb-2">Create an Account</h2>
        <p className="text-gray-600 mb-6 text-sm">Join today it takes less than a minute.</p>
        {formError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(sanitizeSingleLine(e.target.value))}
              className="peer w-full px-3 py-2 pt-5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-transparent"
              required
            />
            <label htmlFor="fullName" className="absolute left-3 top-4 text-gray-500 text-sm transition-all duration-200 peer-focus:-top-2 peer-focus:text-xs peer-focus:text-purple-600 peer-valid:-top-2 peer-valid:text-xs peer-valid:text-purple-600 bg-white px-1">
              Full Name *
            </label>
          </div>
          <div className="relative">
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(sanitizePhoneNumber(e.target.value))}
              className="peer w-full px-3 py-2 pt-5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-transparent"
              required
            />
            <label htmlFor="phone" className="absolute left-3 top-4 text-gray-500 text-sm transition-all duration-200 peer-focus:-top-2 peer-focus:text-xs peer-focus:text-purple-600 peer-valid:-top-2 peer-valid:text-xs peer-valid:text-purple-600 bg-white px-1">
              Phone *
            </label>
          </div>
          <div className="relative">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(sanitizeEmail(e.target.value))}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              className="peer w-full px-3 py-2 pt-5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-transparent"
              required
            />
            <label htmlFor="email" className={`absolute left-3 text-gray-500 text-sm transition-all duration-200 bg-white px-1 pointer-events-none ${email || emailFocused ? '-top-2 text-xs text-purple-600' : 'top-4'}`}>
              Email *
            </label>
          </div>
          <div className="mb-2 relative">
            <select
              id="userType"
              value={userType}
              onChange={(e) => setUserType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none"
            >
              <option value="Individual">Individual</option>
              <option value="Corporate">Corporate</option>
              <option value="Student">Student</option>
            </select>

            {/* Dropdown Arrow Icon */}
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <svg
                className="w-4 h-4 text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Delivery Location Section */}
          <div className="rounded-md border border-green-200 bg-green-50/60 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-green-700 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Delivery Location Details *
            </h3>
            <p className="text-xs text-green-600">Choose a label and pin the spot so we know where to deliver.</p>

            <div>
              <label htmlFor="deliveryLocationName" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-green-700">
                Location Name *
              </label>
              <select
                id="deliveryLocationName"
                value={deliveryLocationName}
                onChange={(event) => setDeliveryLocationName(event.target.value as typeof DELIVERY_LOCATION_OPTIONS[number])}
                className="w-full rounded-md border border-green-200 px-3 py-2 text-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-300 bg-white"
                required
              >
                {DELIVERY_LOCATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-green-700">
                Location on Map *
              </label>
              <LocationPicker
                coordinates={deliveryLocationCoordinates}
                onCoordinatesChange={setDeliveryLocationCoordinates}
                buttonText="Select on Map"
                buttonClassName="w-full bg-green-600 text-white py-2 px-3 rounded-md hover:bg-green-700 font-semibold text-sm uppercase tracking-wide"
              />
              {deliveryLocationCoordinates ? (
                <p className="mt-2 text-xs text-green-700">Pinned at: {deliveryLocationCoordinates}</p>
              ) : (
                <p className="mt-2 text-xs text-green-600">Tap the button above to drop a pin on the map.</p>
              )}
            </div>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="peer w-full px-3 pr-12 py-2 pt-5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-transparent"
              required
            />
            <label htmlFor="password" className="absolute left-3 top-4 text-gray-500 text-sm transition-all duration-200 peer-focus:-top-2 peer-focus:text-xs peer-focus:text-purple-600 peer-valid:-top-2 peer-valid:text-xs peer-valid:text-purple-600 bg-white px-1">
              Create Password *
            </label>
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-400 transition hover:text-purple-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <div className="relative">
            <input
              id="referralCode"
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(sanitizeReferralCode(e.target.value))}
              className="peer w-full px-3 py-2 pt-5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-transparent"
              placeholder="Optional"
            />
            <label htmlFor="referralCode" className="absolute left-3 top-4 text-gray-500 text-sm transition-all duration-200 peer-focus:-top-2 peer-focus:text-xs peer-focus:text-purple-600 peer-valid:-top-2 peer-valid:text-xs peer-valid:text-purple-600 bg-white px-1">
              Referral Code (Optional)
            </label>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account? <button onClick={switchToLogin} className="text-purple-600 hover:underline font-medium">Log in</button>
        </p>
      </div>
    </div>
  );
};

export default SignupModal;
