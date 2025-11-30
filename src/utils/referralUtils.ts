import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Generates a unique referral code
 * Format: 6-8 character alphanumeric code (uppercase)
 */
export async function generateUniqueReferralCode(length: number = 6): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    try {
      // Check if code already exists in users collection
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('referralCode', '==', code));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log('Generated unique referral code:', code);
        return code;
      }
      
      console.log('Code already exists, retrying...', code);
    } catch (error) {
      console.error('Error checking referral code uniqueness:', error);
      // If there's an error checking, still return the code
      // This prevents signup from failing due to database issues
      return code;
    }

    attempts++;
  }

  // If we couldn't generate a unique code in maxAttempts, try with a longer code
  if (length < 8) {
    return generateUniqueReferralCode(length + 1);
  }

  // As a last resort, generate a code with timestamp
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const randomPart = Array.from({ length: 4 }, () => 
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
  return randomPart + timestamp;
}

/**
 * Validates if a referral code exists and returns the user ID of the referrer
 */
export async function validateReferralCode(code: string): Promise<string | null> {
  if (!code || code.trim() === '') {
    return null;
  }

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('referralCode', '==', code.trim().toUpperCase()));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    return snapshot.docs[0].id;
  }

  return null;
}
