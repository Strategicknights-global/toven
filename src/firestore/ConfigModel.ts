import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const DEFAULT_STUDENT_DISCOUNT_PERCENT = 6;
export const DEFAULT_ADDON_ORDER_CUTOFF_HOUR = 18;
export const DEFAULT_SUBSCRIPTION_PAUSE_CUTOFF_HOUR = 18;

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

// Shape of the single config document we care about right now
export interface AppConfigSchema {
  // Legacy global default (still honored if specific one missing)
  defaultRoleId?: string | null;
  // New per-role defaults
  defaultDeliveryRoleId?: string | null;
  defaultChefRoleId?: string | null;
  defaultAdminRoleId?: string | null;
  defaultSubscriberRoleId?: string | null;
  defaultSupervisorRoleId?: string | null;
  defaultHelpersRoleId?: string | null;
  checkoutTerms?: string;
  // Coin pricing (default: 1 coin = ₹1)
  coinPrice?: number;
  // Discount applied automatically to approved students during subscription checkout (percentage between 0-100)
  studentDiscountPercent?: number;
  hubLocationName?: string | null;
  hubLatitude?: number | null;
  hubLongitude?: number | null;
  addonOrderCutoffHour?: number | null;
  subscriptionPauseCutoffHour?: number | null;
  // FAQs displayed on the home page
  faqs?: FAQItem[];
  // Auto-approve addon requests without admin review
  autoApproveAddonRequests?: boolean;
  deliveryTripLabels?: string[];
  // Payment QR code configuration
  paymentQRCode?: string | null; // Base64 encoded QR code image
  paymentUPI?: string | null; // UPI ID (e.g., "user@bank")
  paymentPhoneNumber?: string | null; // Phone number for payments
  updatedAt?: unknown;
}

// We store a single document named 'defaults' inside the 'configs' collection.
export class ConfigModel {
  static collectionName = 'configs';
  static docId = 'defaults';

  static get ref() {
    return doc(collection(db, this.collectionName), this.docId);
  }

  static async get(): Promise<AppConfigSchema> {
    const snap = await getDoc(this.ref);
    if (!snap.exists()) return {};
    return snap.data() as AppConfigSchema;
  }

  static async setDefaultRole(roleId: string) {
    const prev = await this.get();
    await setDoc(this.ref, { ...prev, defaultRoleId: roleId, updatedAt: new Date() }, { merge: true });
  }

  static async clearDefaultRole() {
    const prev = await this.get();
    await setDoc(this.ref, { ...prev, defaultRoleId: null, updatedAt: new Date() }, { merge: true });
  }

  static async setPerRoleDefault(roleType: 'Delivery' | 'Chef' | 'Admin' | 'Subscriber' | 'Supervisor' | 'Helpers', roleId: string) {
    const prev = await this.get();
    const fieldMap: Record<string, string> = {
      Delivery: 'defaultDeliveryRoleId',
      Chef: 'defaultChefRoleId',
      Admin: 'defaultAdminRoleId',
      Subscriber: 'defaultSubscriberRoleId',
      Supervisor: 'defaultSupervisorRoleId',
      Helpers: 'defaultHelpersRoleId'
    };
    const fieldName = fieldMap[roleType];
    await setDoc(this.ref, { ...prev, [fieldName]: roleId, updatedAt: new Date() }, { merge: true });
  }

  static async clearPerRoleDefault(roleType: 'Delivery' | 'Chef' | 'Admin' | 'Subscriber' | 'Supervisor' | 'Helpers') {
    const prev = await this.get();
    const fieldMap: Record<string, string> = {
      Delivery: 'defaultDeliveryRoleId',
      Chef: 'defaultChefRoleId',
      Admin: 'defaultAdminRoleId',
      Subscriber: 'defaultSubscriberRoleId',
      Supervisor: 'defaultSupervisorRoleId',
      Helpers: 'defaultHelpersRoleId'
    };
    const fieldName = fieldMap[roleType];
    await setDoc(this.ref, { ...prev, [fieldName]: null, updatedAt: new Date() }, { merge: true });
  }

  static async update(partial: Partial<AppConfigSchema>) {
    if (!partial || Object.keys(partial).length === 0) {
      return;
    }
    await setDoc(this.ref, { ...partial, updatedAt: new Date() }, { merge: true });
  }

  static normalizeTripLabels(labels: unknown): string[] {
    if (!Array.isArray(labels)) {
      return [];
    }
    const normalized = labels
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter((value) => value.length > 0);
    const unique = Array.from(new Set(normalized.map((value) => value.toLowerCase())));
    const byCaseMap = new Map<string, string>();
    normalized.forEach((value) => {
      const key = value.toLowerCase();
      if (!byCaseMap.has(key)) {
        byCaseMap.set(key, value);
      }
    });
    const deduped = unique
      .map((key) => byCaseMap.get(key) ?? key)
      .filter((value) => value.length > 0);
    return deduped.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }

  static async getDeliveryTripLabels(): Promise<string[]> {
    const config = await this.get();
    return this.normalizeTripLabels(config.deliveryTripLabels ?? []);
  }

  static async setDeliveryTripLabels(labels: string[]): Promise<void> {
    const normalized = this.normalizeTripLabels(labels);
    await this.update({ deliveryTripLabels: normalized });
  }

  static async getCoinPrice(): Promise<number> {
    const config = await this.get();
    return config.coinPrice && config.coinPrice > 0 ? config.coinPrice : 1; // Default to 1 if not set
  }

  static async setCoinPrice(price: number) {
    if (price <= 0) {
      throw new Error('Coin price must be greater than 0');
    }
    await this.update({ coinPrice: price });
  }

  static resolveAddonOrderCutoffHour(config?: AppConfigSchema | null): number {
    const value = config?.addonOrderCutoffHour;
    if (typeof value === 'number' && Number.isFinite(value)) {
      const clamped = Math.max(0, Math.min(23, Math.floor(value)));
      return clamped;
    }
    return DEFAULT_ADDON_ORDER_CUTOFF_HOUR;
  }

  static resolveSubscriptionPauseCutoffHour(config?: AppConfigSchema | null): number {
    const value = config?.subscriptionPauseCutoffHour;
    if (typeof value === 'number' && Number.isFinite(value)) {
      const clamped = Math.max(0, Math.min(23, Math.floor(value)));
      return clamped;
    }
    return DEFAULT_SUBSCRIPTION_PAUSE_CUTOFF_HOUR;
  }
}
