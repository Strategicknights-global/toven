export interface SubscriptionDepositSchema {
	id?: string;
	userId?: string;
	amount: number;
	currency: string;
	paymentReference?: string | null;
	invoiceImageBase64?: string | null;
	invoiceFileName?: string | null;
	paidAt?: Date;
	createdAt?: Date;
	updatedAt?: Date;
}

export type SubscriptionDepositCreateInput = {
	userId: string;
	amount: number;
	currency: string;
	paymentReference?: string | null;
	invoiceImageBase64?: string | null;
	invoiceFileName?: string | null;
	paidAt?: Date;
};
