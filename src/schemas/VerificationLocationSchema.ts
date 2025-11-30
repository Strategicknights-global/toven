export interface VerificationLocationSchema {
	id: string;
	name: string;
	createdAt?: Date;
	updatedAt?: Date;
}

export type VerificationLocationCreateInput = {
	name: string;
};

export type VerificationLocationUpdateInput = Partial<VerificationLocationCreateInput>;
