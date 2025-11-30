import { type } from 'arktype';

export type RefundSource = 'coins';

export interface RefundTierSchema {
	id?: string;
	label?: string;
	startDay: number; // inclusive start day index
	endDay?: number; // inclusive end day index, undefined means open ended
	refundPercent: number; // 0 - 100
	refundSource: RefundSource;
	notes?: string;
}

export interface RefundPolicySchema {
	id?: string;
	name: string;
	subscriptionLengthDays: number;
	subscriptionDayDiscountId?: string | null;
	description?: string;
	tiers: RefundTierSchema[];
	appliesToProductIds?: string[];
	appliesToCategoryIds?: string[];
	active: boolean;
	createdAt?: Date;
	updatedAt?: Date;
}

export type RefundPolicyCreateInput = {
	name: string;
	subscriptionLengthDays: number;
	subscriptionDayDiscountId?: string | null;
	description?: string;
	tiers: RefundTierSchema[];
	appliesToProductIds?: string[];
	appliesToCategoryIds?: string[];
	active?: boolean;
};

export type RefundPolicyUpdateInput = Partial<Omit<RefundPolicyCreateInput, 'tiers'>> & {
	tiers?: RefundTierSchema[];
};

export const RefundTierCreate = type({
	label: type.string.default(''),
	startDay: 'number',
	'endDay?': 'number',
	refundPercent: 'number',
	refundSource: type.string.default('coins'),
	'notes?': 'string',
});

export const RefundPolicyCreate = type({
	name: 'string',
	subscriptionLengthDays: 'number',
	'subscriptionDayDiscountId?': 'string',
	'description?': 'string',
	tiers: RefundTierCreate.array(),
	'appliesToProductIds?': type.string.array(),
	'appliesToCategoryIds?': type.string.array(),
	active: type.boolean.default(true),
});

export const RefundPolicyUpdate = type({
	'name?': 'string',
	'subscriptionLengthDays?': 'number',
	'subscriptionDayDiscountId?': 'string',
	'description?': 'string',
	'tiers?': RefundTierCreate.array(),
	'appliesToProductIds?': type.string.array(),
	'appliesToCategoryIds?': type.string.array(),
	'active?': 'boolean',
});
