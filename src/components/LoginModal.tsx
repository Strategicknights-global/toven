import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { useLoginModalStore } from '../stores/loginModalStore';
import { useSignupModalStore } from '../stores/signupModalStore';
import { useToastStore } from '../stores/toastStore';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const { close: closeLogin } = useLoginModalStore();
  const { open: openSignup } = useSignupModalStore();
  const [showPassword, setShowPassword] = React.useState(false);
  const addToast = useToastStore((state) => state.addToast);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    try {
      await onLogin(email, password);
    } finally {
      setIsLoading(false);
    }
  };

  const switchToSignup = () => {
    closeLogin();
    openSignup();
  };

  const handlePasswordReset = async () => {
    if (isResetting) {
      return;
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      addToast('Enter your email address first so we can send the reset link.', 'warning');
      return;
    }
    setIsResetting(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      addToast('Password reset email sent. Check your inbox for further steps.', 'success');
    } catch (error) {
      console.error('Failed to send password reset email', error);
      addToast('We could not send the reset email. Double-check the address and try again.', 'error');
    } finally {
      setIsResetting(false);
    }
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
        <h2 className="text-2xl font-bold text-purple-600 mb-2">Welcome Back!</h2>
        <p className="text-gray-600 mb-6 text-sm">Log in to manage your account and subscriptions.</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="peer w-full px-3 py-2 pt-5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-transparent"
              required
            />
            <label htmlFor="email" className="absolute left-3 top-4 text-gray-500 text-sm transition-all duration-200 peer-focus:-top-2 peer-focus:text-xs peer-focus:text-purple-600 peer-valid:-top-2 peer-valid:text-xs peer-valid:text-purple-600 bg-white px-1">
              Email *
            </label>
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
              Password *
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
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={isResetting || isLoading}
              className="text-xs font-medium text-purple-600 transition hover:text-purple-700 disabled:opacity-60"
            >
              {isResetting ? 'Sending reset link…' : 'Forgot password?'}
            </button>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'LOGGING IN...' : 'LOG IN'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <button
            onClick={switchToSignup}
            className="text-purple-600 hover:underline font-medium"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginModal;
