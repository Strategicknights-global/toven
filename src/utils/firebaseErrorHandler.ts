import { FirebaseError } from 'firebase/app';

/**
 * Map Firebase error codes to user-friendly error messages
 */
export const getFirebaseErrorMessage = (error: unknown): string => {
  if (error instanceof FirebaseError) {
    const code = error.code;

    // Authentication errors
    const authErrorMap: Record<string, string> = {
      'auth/invalid-credential': 'Invalid email or password. Please try again.',
      'auth/user-not-found': 'No account found with this email. Please sign up.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/user-disabled': 'This account has been disabled. Contact support.',
      'auth/too-many-requests': 'Too many login attempts. Please try again later.',
      'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
      'auth/operation-not-allowed': 'Sign-in method is not enabled. Contact support.',
      'auth/invalid-api-key': 'Invalid API key configuration.',
      'auth/network-request-failed': 'Network error. Please check your connection and try again.',
      'auth/internal-error': 'An internal error occurred. Please try again later.',
      'auth/requires-recent-login': 'Please log in again to perform this action.',
      'auth/invalid-user-token': 'Your session has expired. Please log in again.',
      'auth/provider-already-linked': 'This account is already linked to another provider.',
      'auth/oauth-provider-not-supported': 'This sign-in method is not supported.',
    };

    return authErrorMap[code] || `Authentication error: ${code}`;
  }

  if (error instanceof Error) {
    // Check if it's a Firestore or other Firebase error by looking at the message
    const message = error.message;

    if (message.includes('auth/')) {
      // Try to extract error code from message
      const match = message.match(/auth\/[a-z-]+/);
      if (match) {
        return getFirebaseErrorMessage(new FirebaseError(match[0], message));
      }
    }

    return message;
  }

  return 'An unexpected error occurred. Please try again.';
};

/**
 * Extract Firebase error code from error object
 */
export const getFirebaseErrorCode = (error: unknown): string | null => {
  if (error instanceof FirebaseError) {
    return error.code;
  }

  if (error instanceof Error) {
    const match = error.message.match(/auth\/[a-z-]+/);
    return match ? match[0] : null;
  }

  return null;
};
