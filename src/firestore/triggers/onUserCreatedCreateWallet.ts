import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const onUserCreatedCreateWallet = onDocumentCreated('users/{userId}', async (event) => {
  const snapshot = event.data;
  const userId = event.params.userId as string;

  if (!snapshot) {
    logger.warn('No snapshot provided for user creation event', { userId });
    return;
  }

  try {
    const existingWallet = await db
      .collection('wallets')
      .where('customerId', '==', userId)
      .limit(1)
      .get();

    if (!existingWallet.empty) {
      logger.info('Wallet already exists for user', { userId });
      return;
    }

    const walletData = {
      customerId: userId,
      customerName: snapshot.get('fullName') ?? null,
      customerEmail: snapshot.get('email') ?? null,
      coins: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('wallets').add(walletData);
    logger.info('Wallet created for new user', { userId });
  } catch (error) {
    logger.error('Failed to create wallet for user', { userId, error });
    throw error;
  }
});
