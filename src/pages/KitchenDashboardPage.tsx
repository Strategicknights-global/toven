import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, ChefHat } from 'lucide-react';
import { useSubscriptionRequestsStore } from '../stores/subscriptionRequestsStore';
import { usePackagesStore } from '../stores/packagesStore';
import { useFoodItemsStore } from '../stores/foodItemsStore';
import type {
	SubscriptionDietPreference,
	SubscriptionRequestSchema,
	SubscriptionRequestSelection,
} from '../schemas/SubscriptionRequestSchema';

type DayTab = {
	date: Date;
	dayName: string;
	shortDate: string;
	fullDate: string;
	isToday: boolean;
};

type FoodItemAggregation = {
	mealType: string;
	foodItemName: string;
	quantity: number;
	dietPreference: SubscriptionDietPreference;
};

const toLocalISODate = (value: Date | string): string => {
	const date = value instanceof Date ? value : new Date(value);
	const timestamp = date.getTime();
	if (!Number.isFinite(timestamp)) {
		return '';
	}
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, '0');
	const day = `${date.getDate()}`.padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const DIET_PREFERENCE_LABELS: Record<SubscriptionDietPreference, string> = {
	'mixed': 'Mixed',
	'pure-veg': 'Pure Veg',
};

const KitchenDashboardPage: React.FC = () => {
	const { requests, loading: loadingSubs, loadRequests } = useSubscriptionRequestsStore();
	const { packages, loading: loadingPackages, loadPackages } = usePackagesStore();
	const { items: foodItems, loading: loadingFoodItems, loadItems: loadFoodItems } = useFoodItemsStore();
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());

	useEffect(() => {
		void loadRequests();
		void loadPackages();
		void loadFoodItems();
	}, [loadRequests, loadPackages, loadFoodItems]);

	// Generate next 7 days starting from today
	const weekTabs = useMemo<DayTab[]>(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		return Array.from({ length: 7 }, (_, index) => {
			const date = new Date(today);
			date.setDate(today.getDate() + index);

			const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
			const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

			return {
				date,
				dayName: dayNames[date.getDay()],
				shortDate: `${months[date.getMonth()]} ${date.getDate()}`,
				fullDate: toLocalISODate(date),
				isToday: index === 0,
			};
		});
	}, []);

	// Filter active subscriptions for the selected date (excluding paused meals)
	// Note: We return subscriptions that have at least one non-paused meal for this date
	const activeSubscriptionsForDate = useMemo(() => {
		const dateStr = toLocalISODate(selectedDate);

		return requests.filter((sub: SubscriptionRequestSchema) => {
			if (sub.status !== 'approved') {
				return false;
			}

			const startStr = toLocalISODate(sub.startDate);
			const endStr = toLocalISODate(sub.endDate);

			// Check if date is within subscription range
			if (dateStr < startStr || dateStr > endStr) {
				return false;
			}

			// No need to filter here - we'll filter at the meal level later
			// Just return true if the subscription is active on this date
			return true;
		});
	}, [requests, selectedDate]);

	// Aggregate food items from package menu entries (excluding paused meals)
	const foodItemAggregations = useMemo<FoodItemAggregation[]>(() => {
		const dateStr = toLocalISODate(selectedDate);
		const aggregationMap = new Map<string, FoodItemAggregation>();

		activeSubscriptionsForDate.forEach((sub: SubscriptionRequestSchema) => {
			sub.selections.forEach((selection: SubscriptionRequestSelection) => {
				// Check if this specific meal is paused for this date
				const isPausedMeal = sub.pausedMeals?.some(
					pm => pm.date === dateStr && pm.mealType === selection.mealType
				);
				
				// Skip this selection if it's paused
				if (isPausedMeal) {
					return;
				}

				// Find the package to get food items for this date
				const pkg = packages.find((p) => p.id === selection.packageId);
				const menuForDate = pkg?.dateMenus.find((menu) => menu.date === dateStr);

				// Get food item IDs from the menu entry
				const foodItemIds = menuForDate?.foodItemIds || [];
				const foodItemQuantities = menuForDate?.foodItemQuantities || {};

				foodItemIds.forEach((foodItemId) => {
					// Look up the actual food item to get its name
					const foodItem = foodItems.find((f) => f.id === foodItemId);
					
					// Skip if food item doesn't exist (prevents showing IDs)
					if (!foodItem) {
						return;
					}

					const key = `${selection.mealType}-${sub.dietPreference}-${foodItemId}`;
					const existing = aggregationMap.get(key);
					const itemQuantity = foodItemQuantities[foodItemId] || 1;

					if (existing) {
						existing.quantity += itemQuantity;
					} else {
						aggregationMap.set(key, {
							mealType: selection.mealType,
							foodItemName: foodItem.name,
							quantity: itemQuantity,
							dietPreference: sub.dietPreference,
						});
					}
				});

				// Only show items if food items are properly configured
				// Skip packages that don't have food items set up yet
			});
		});

		// Sort by meal type order (Breakfast, Lunch, Dinner), then diet preference, then quantity
		const mealTypeOrder: Record<string, number> = { Breakfast: 1, Lunch: 2, Dinner: 3 };
		const dietPreferenceOrder: Record<SubscriptionDietPreference, number> = { 'pure-veg': 1, mixed: 2 };
		return Array.from(aggregationMap.values()).sort((a, b) => {
			const orderDiff = (mealTypeOrder[a.mealType] || 999) - (mealTypeOrder[b.mealType] || 999);
			if (orderDiff !== 0) return orderDiff;
			const preferenceDiff = (dietPreferenceOrder[a.dietPreference] || 999) - (dietPreferenceOrder[b.dietPreference] || 999);
			if (preferenceDiff !== 0) return preferenceDiff;
			return b.quantity - a.quantity;
		});
	}, [activeSubscriptionsForDate, packages, foodItems, selectedDate]);

	// Group aggregations by meal type
	const groupedByMealType = useMemo(() => {
		const groups: Record<string, FoodItemAggregation[]> = {};
		foodItemAggregations.forEach((item) => {
			if (!groups[item.mealType]) {
				groups[item.mealType] = [];
			}
			groups[item.mealType].push(item);
		});
		return groups;
	}, [foodItemAggregations]);

	// Calculate total food items to be prepared
	const totalFoodItemCount = useMemo(() => {
		return foodItemAggregations.reduce((sum, item) => sum + item.quantity, 0);
	}, [foodItemAggregations]);

	const loading = loadingSubs || loadingPackages || loadingFoodItems;

	const handleTabClick = (tab: DayTab) => {
		setSelectedDate(tab.date);
	};

	const selectedTab = weekTabs.find((tab) => tab.fullDate === toLocalISODate(selectedDate)) || weekTabs[0];

	return (
		<div className="min-h-screen bg-slate-100 p-6">
			<div className="mx-auto max-w-7xl space-y-6">
				{/* Header */}
				<header className="space-y-2">
					<div className="flex items-center gap-3">
						<div className="rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-3 shadow-lg">
							<ChefHat className="h-7 w-7 text-white" />
						</div>
						<div>
							<h1 className="text-3xl font-bold text-slate-900">Kitchen Dashboard</h1>
							<p className="text-sm text-slate-600">
								Coordinate order fulfillment with live insights into daily meal requirements
							</p>
						</div>
					</div>
				</header>

				{/* Weekly Tabs */}
				<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
					<div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-purple-600">
						<Calendar className="h-4 w-4" />
						<span>Select Day</span>
					</div>
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
						{weekTabs.map((tab) => {
							const isSelected = tab.fullDate === selectedTab.fullDate;
							return (
								<button
									key={tab.fullDate}
									type="button"
									onClick={() => handleTabClick(tab)}
									className={`
										relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all
										${
											isSelected
												? 'border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg'
												: 'border-slate-200 bg-slate-50 hover:border-purple-300 hover:bg-purple-50'
										}
									`}
								>
									{tab.isToday && (
										<span className="absolute right-2 top-2 rounded-full bg-green-500 px-2 py-0.5 text-xs font-semibold text-white">
											Today
										</span>
									)}
									<div className="text-center">
										<div className={`text-lg font-bold ${isSelected ? 'text-purple-700' : 'text-slate-700'}`}>
											{tab.dayName}
										</div>
										<div className={`text-sm ${isSelected ? 'text-purple-600' : 'text-slate-500'}`}>
											{tab.shortDate}
										</div>
									</div>
								</button>
							);
						})}
					</div>
				</section>

				{/* Loading State */}
				{loading && (
					<div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 shadow-md">
						<div className="text-center">
							<div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-purple-600"></div>
							<p className="text-sm text-slate-600">Loading kitchen requirements...</p>
						</div>
					</div>
				)}

				{/* Kitchen Prep Requirements */}
				{!loading && (
					<section className="space-y-4">
						<div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 p-4 text-white shadow-lg">
							<div className="flex items-center gap-3">
								<ChefHat className="h-6 w-6" />
								<div>
									<h2 className="text-xl font-bold">
										Prep List for {selectedTab.dayName}, {selectedTab.shortDate}
									</h2>
									<p className="text-sm text-purple-100">
										{activeSubscriptionsForDate.length} active subscription
										{activeSubscriptionsForDate.length !== 1 ? 's' : ''}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-4">
								<div className="flex flex-col items-end rounded-lg bg-white/20 px-4 py-2 backdrop-blur-sm">
									<span className="text-xs text-purple-100">Total Items</span>
									<span className="text-2xl font-bold">{totalFoodItemCount}</span>
								</div>
							</div>
						</div>

						{foodItemAggregations.length === 0 ? (
							<div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-md">
								<ChefHat className="mx-auto mb-4 h-16 w-16 text-slate-300" />
								<h3 className="mb-2 text-lg font-semibold text-slate-700">No meals scheduled</h3>
								<p className="text-sm text-slate-500">
									There are no approved subscription meals for {selectedTab.dayName}.
								</p>
							</div>
						) : (
							<div className="space-y-6">
								{Object.entries(groupedByMealType).map(([mealType, items]) => (
									<div key={mealType} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
										<div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3">
											<div
												className={`rounded-lg p-2 ${
													mealType === 'Breakfast'
														? 'bg-yellow-100 text-yellow-700'
														: mealType === 'Lunch'
															? 'bg-orange-100 text-orange-700'
															: 'bg-indigo-100 text-indigo-700'
												}`}
											>
												<ChefHat className="h-5 w-5" />
											</div>
											<h3 className="text-xl font-bold text-slate-800">{mealType}</h3>
											<span className="ml-auto rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-700">
												{items.reduce((sum, item) => sum + item.quantity, 0)} items
											</span>
										</div>

										<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
											{items.map((item, index) => (
												<div
													key={`${item.mealType}-${item.foodItemName}-${index}`}
													className="flex items-center justify-between rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-purple-300 hover:shadow-md"
												>
													<div className="flex-1">
														<h4 className="text-lg font-bold text-slate-800">
															{DIET_PREFERENCE_LABELS[item.dietPreference]} - {item.foodItemName}
														</h4>
													</div>
													<div className="ml-3 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 shadow-md">
														<span className="text-2xl font-bold text-white">{item.quantity}</span>
													</div>
												</div>
											))}
										</div>
									</div>
								))}
							</div>
						)}
					</section>
				)}
			</div>
		</div>
	);
};

export default KitchenDashboardPage;
