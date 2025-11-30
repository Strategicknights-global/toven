import { type } from "arktype";

export interface ReferralSchema {
  id?: string;
  referralCode: string; // The code used for this referral
  referrerId: string; // User ID of the person who referred
  referredUserId: string; // User ID of the person who signed up with the code
  referredUserName?: string; // Name of the referred user for display
  referredUserEmail?: string; // Email of the referred user for display
  coinsEarned: number; // Coins awarded to referrer
  status: 'pending' | 'completed' | 'cancelled'; // Status of the referral
  createdAt?: Date;
  updatedAt?: Date;
}

// Create validator
export const ReferralCreate = type({
  referralCode: "string",
  referrerId: "string",
  referredUserId: "string",
  "referredUserName?": "string",
  "referredUserEmail?": "string",
  coinsEarned: type.number.default(0),
  status: type("'pending' | 'completed' | 'cancelled'").default("completed"),
});

// Update validator
export const ReferralUpdate = type({
  "referralCode?": "string",
  "referrerId?": "string",
  "referredUserId?": "string",
  "referredUserName?": "string",
  "referredUserEmail?": "string",
  "coinsEarned?": "number",
  "status?": "'pending' | 'completed' | 'cancelled'",
});
