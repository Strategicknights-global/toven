export const COIN_REQUEST_STATUSES = ['pending', 'approved', 'rejected'] as const;

export type CoinRequestStatus = typeof COIN_REQUEST_STATUSES[number];

export const isCoinRequestStatus = (value: unknown): value is CoinRequestStatus => {
  return typeof value === 'string' && COIN_REQUEST_STATUSES.includes(value as CoinRequestStatus);
};

export interface CoinRequestSchema {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string | null;
  userPhone: string | null;
  coinsRequested: number;
  amountPaid: number;
  invoiceImage: string; // base64 encoded image
  status: CoinRequestStatus;
  statusNote: string | null;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CoinRequestCreateInput {
  userId: string;
  userName: string;
  userEmail?: string | null;
  userPhone?: string | null;
  coinsRequested: number;
  // amountPaid is auto-calculated as coinsRequested * 1 (1 coin = ₹1)
  invoiceImage: string;
}

export interface CoinRequestStatusUpdateInput {
  status: CoinRequestStatus;
  statusNote?: string | null;
  reviewedBy: string;
  reviewedByName: string;
}

const toStringSafe = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toNumber = (value: unknown): number => {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) && num >= 0 ? Math.round(num) : 0;
};

export const normalizeCoinRequestInput = (input: CoinRequestCreateInput): CoinRequestCreateInput => {
  return {
    userId: toStringSafe(input.userId),
    userName: toStringSafe(input.userName),
    userEmail: toStringOrNull(input.userEmail),
    userPhone: toStringOrNull(input.userPhone),
    coinsRequested: toNumber(input.coinsRequested),
    invoiceImage: toStringSafe(input.invoiceImage),
  };
};
