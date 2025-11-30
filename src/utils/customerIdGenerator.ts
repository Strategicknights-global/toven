import { doc, getDoc, setDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';

const COUNTER_COLLECTION = 'counters';
const CUSTOMER_COUNTER_DOC = 'customerIdCounter';

/**
 * Generate the next customer ID in the format C-1, C-2, C-3, etc.
 * Uses Firestore transaction to ensure atomicity and prevent duplicates
 */
export async function generateNextCustomerId(): Promise<string> {
  const counterRef = doc(db, COUNTER_COLLECTION, CUSTOMER_COUNTER_DOC);

  try {
    const nextNumber = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      let currentValue = 0;
      if (counterDoc.exists()) {
        currentValue = counterDoc.data()?.value || 0;
      }
      
      const nextValue = currentValue + 1;
      
      if (counterDoc.exists()) {
        transaction.update(counterRef, { 
          value: nextValue,
          updatedAt: new Date()
        });
      } else {
        transaction.set(counterRef, { 
          value: nextValue,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      return nextValue;
    });

    return `C-${nextNumber}`;
  } catch (error) {
    console.error('Error generating customer ID:', error);
    throw new Error('Failed to generate customer ID');
  }
}

/**
 * Get the current counter value (for reference/debugging)
 */
export async function getCurrentCustomerCounter(): Promise<number> {
  const counterRef = doc(db, COUNTER_COLLECTION, CUSTOMER_COUNTER_DOC);
  const counterDoc = await getDoc(counterRef);
  
  if (counterDoc.exists()) {
    return counterDoc.data()?.value || 0;
  }
  
  return 0;
}

/**
 * Initialize or reset the counter (admin use only)
 */
export async function initializeCustomerCounter(startValue: number = 0): Promise<void> {
  const counterRef = doc(db, COUNTER_COLLECTION, CUSTOMER_COUNTER_DOC);
  await setDoc(counterRef, {
    value: startValue,
    createdAt: new Date(),
    updatedAt: new Date()
  });
}
