import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import type { firestore } from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const LOGS_PREFIX = 'logs-';

type DocumentData = firestore.DocumentData;

function sanitizeSnapshotData(data: DocumentData | undefined): Record<string, unknown> | null {
  if (!data) {
    return null;
  }

  return JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
}

function createCollectionLogger(collection: string) {
  const logsCollection = `${LOGS_PREFIX}${collection}`;

  return onDocumentWritten(`${collection}/{docId}`, async (event) => {
    const docId = event.params.docId as string;
    const beforeData = sanitizeSnapshotData(event.data?.before?.data());
    const afterData = sanitizeSnapshotData(event.data?.after?.data());

    if (!beforeData && !afterData) {
      logger.info('Skipping log for event with no before/after data', { collection, docId });
      return;
    }

    const changeType = !beforeData
      ? 'create'
      : !afterData
        ? 'delete'
        : 'update';

    try {
      await db.collection(logsCollection).add({
        collection,
        docId,
        changeType,
        changedAt: admin.firestore.FieldValue.serverTimestamp(),
        before: beforeData,
        after: afterData,
      });

      logger.debug('Logged change', { collection, docId, logsCollection, changeType });
    } catch (error) {
      logger.error('Failed to write change log', { collection, docId, error });
      throw error;
    }
  });
}

export const logAddonCategoriesChanges = createCollectionLogger('addonCategories');
export const logAddonRequestsChanges = createCollectionLogger('addonRequests');
export const logBannersChanges = createCollectionLogger('banners');
export const logCancelledMealsChanges = createCollectionLogger('cancelledMeals');
export const logCategoriesChanges = createCollectionLogger('categories');
export const logCoinRequestsChanges = createCollectionLogger('coinRequests');
export const logConfigsChanges = createCollectionLogger('configs');
export const logCouponsChanges = createCollectionLogger('coupons');
export const logCustomerInquiriesChanges = createCollectionLogger('customerInquiries');
export const logCustomerLoginsChanges = createCollectionLogger('customerLogins');
export const logDayDiscountsChanges = createCollectionLogger('dayDiscounts');
export const logDeliveryAssignmentsChanges = createCollectionLogger('deliveryAssignments');
export const logExpensesChanges = createCollectionLogger('expenses');
export const logFoodItemsChanges = createCollectionLogger('foodItems');
export const logGrnsChanges = createCollectionLogger('grns');
export const logPackagesChanges = createCollectionLogger('packages');
export const logProductsChanges = createCollectionLogger('products');
export const logReferralsChanges = createCollectionLogger('referrals');
export const logRefundPoliciesChanges = createCollectionLogger('refundPolicies');
export const logRolesChanges = createCollectionLogger('roles');
export const logStudentVerificationsChanges = createCollectionLogger('studentVerifications');
export const logSubscriptionDepositsChanges = createCollectionLogger('subscriptionDeposits');
export const logSubscriptionRequestsChanges = createCollectionLogger('subscriptionRequests');
export const logUserDeliveryLocationsChanges = createCollectionLogger('userDeliveryLocations');
export const logUserGroupsChanges = createCollectionLogger('userGroups');
export const logUsersChanges = createCollectionLogger('users');
export const logVerificationLocationsChanges = createCollectionLogger('verificationLocations');
export const logWalletsChanges = createCollectionLogger('wallets');
