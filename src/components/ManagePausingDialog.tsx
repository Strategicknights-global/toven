import React, { useState, useMemo } from 'react';
import { X, Calendar, AlertCircle, Info, Coffee, Utensils, Moon } from 'lucide-react';
import type { SubscriptionRequestSchema, PausedMeal } from '../schemas/SubscriptionRequestSchema';
import type { MealType } from '../schemas/FoodItemSchema';
import {
  isPauseWindowClosed,
  getEarliestPauseDate,
  getEarliestPauseDateLabel,
  getPauseCutoffTimeLabel,
} from '../utils/subscriptionPause';

interface ManagePausingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: SubscriptionRequestSchema;
  onUpdatePausedMeals: (pausedMeals: PausedMeal[]) => Promise<void>;
  pauseCutoffHour: number;
}

const ManagePausingDialog: React.FC<ManagePausingDialogProps> = ({
  isOpen,
  onClose,
  subscription,
  onUpdatePausedMeals,
  pauseCutoffHour,
}) => {
  // Initialize selected meals from subscription.pausedMeals
  const [selectedMeals, setSelectedMeals] = useState<Map<string, Set<MealType>>>(() => {
    const map = new Map<string, Set<MealType>>();
    (subscription.pausedMeals || []).forEach((pm) => {
      if (!map.has(pm.date)) {
        map.set(pm.date, new Set());
      }
      map.get(pm.date)!.add(pm.mealType);
    });
    return map;
  });
  
  const [saving, setSaving] = useState(false);
  const currentTime = new Date();

  // Get meal types available in this subscription
  const availableMealTypes = useMemo(() => {
    const types = new Set<MealType>();
    subscription.selections.forEach(sel => types.add(sel.mealType));
    return Array.from(types).sort((a, b) => {
      const order: Record<MealType, number> = { Breakfast: 1, Lunch: 2, Dinner: 3 };
      return order[a] - order[b];
    });
  }, [subscription.selections]);

  // Calculate earliest date that can be paused based on configured cutoff
  const earliestPauseDate = useMemo(
    () => getEarliestPauseDate(currentTime, { cutoffHour: pauseCutoffHour }),
    [currentTime, pauseCutoffHour],
  );

  // Generate available dates (from earliest pause date to end date)
  const availableDates = useMemo(() => {
    const dates: Date[] = [];
    const start = new Date(earliestPauseDate);
    const end = new Date(subscription.endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
    
    return dates;
  }, [earliestPauseDate, subscription.endDate]);

  const handleMealToggle = (dateStr: string, mealType: MealType) => {
    const newMap = new Map(selectedMeals);
    
    if (!newMap.has(dateStr)) {
      newMap.set(dateStr, new Set([mealType]));
    } else {
      const meals = new Set(newMap.get(dateStr)!);
      if (meals.has(mealType)) {
        meals.delete(mealType);
        if (meals.size === 0) {
          newMap.delete(dateStr);
        } else {
          newMap.set(dateStr, meals);
        }
      } else {
        meals.add(mealType);
        newMap.set(dateStr, meals);
      }
    }
    
    setSelectedMeals(newMap);
  };

  const handleToggleAllMealsForDate = (dateStr: string) => {
    const newMap = new Map(selectedMeals);
    const currentMeals = newMap.get(dateStr);
    
    // If all meals are selected, deselect all; otherwise select all
    if (currentMeals && currentMeals.size === availableMealTypes.length) {
      newMap.delete(dateStr);
    } else {
      newMap.set(dateStr, new Set(availableMealTypes));
    }
    
    setSelectedMeals(newMap);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const pausedMeals: PausedMeal[] = [];
      selectedMeals.forEach((meals, date) => {
        meals.forEach(mealType => {
          pausedMeals.push({ date, mealType });
        });
      });
      
      await onUpdatePausedMeals(pausedMeals);
      onClose();
    } catch (error) {
      console.error('Error updating paused meals:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const getDateLabel = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    if (date.getTime() === today.getTime()) return 'Today';
    if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';
    if (date.getTime() === dayAfterTomorrow.getTime()) return 'Day after tomorrow';

    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return weekdays[date.getDay()];
  };

  const getMealIcon = (mealType: MealType) => {
    switch (mealType) {
      case 'Breakfast': return <Coffee className="w-4 h-4" />;
      case 'Lunch': return <Utensils className="w-4 h-4" />;
      case 'Dinner': return <Moon className="w-4 h-4" />;
      default: return null;
    }
  };

  const getMealColor = (mealType: MealType) => {
    switch (mealType) {
      case 'Breakfast': return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', activeBg: 'bg-yellow-500' };
      case 'Lunch': return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', activeBg: 'bg-orange-500' };
      case 'Dinner': return { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300', activeBg: 'bg-indigo-500' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', activeBg: 'bg-gray-500' };
    }
  };

  if (!isOpen) return null;

  const totalPausedMeals = Array.from(selectedMeals.values()).reduce((sum, meals) => sum + meals.size, 0);
  
  const hasChanges = (() => {
    const currentPausedMeals = subscription.pausedMeals || [];
    if (totalPausedMeals !== currentPausedMeals.length) return true;
    
    // Check if all current paused meals are in selected meals
    return !currentPausedMeals.every(pm => selectedMeals.get(pm.date)?.has(pm.mealType));
  })();

  const pauseCutoffTimeLabel = getPauseCutoffTimeLabel(pauseCutoffHour);
  const isPauseWindowClosedNow = isPauseWindowClosed(currentTime, { cutoffHour: pauseCutoffHour });
  const earliestPauseDateLabel = getEarliestPauseDateLabel(currentTime, {
    locale: 'en-IN',
    cutoffHour: pauseCutoffHour,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/20 p-2 backdrop-blur-sm">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Manage Meal Pausing</h2>
              <p className="text-sm text-purple-100">Select specific meals to pause on each date</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white hover:bg-white/20 transition-colors"
            disabled={saving}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {/* Pause Window Information */}
          <div className={`mb-6 p-4 rounded-lg border ${
            isPauseWindowClosedNow 
              ? 'bg-orange-50 border-orange-200' 
              : 'bg-purple-50 border-purple-200'
          }`}>
            <div className="flex items-start gap-3">
              {isPauseWindowClosedNow ? (
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className={`font-semibold mb-1 ${
                  isPauseWindowClosedNow ? 'text-orange-900' : 'text-purple-900'
                }`}>
                  {isPauseWindowClosedNow ? 'Pause Window Closed for Tomorrow' : 'Pause Window Open'}
                </h3>
                <p className={`text-sm ${
                  isPauseWindowClosedNow ? 'text-orange-700' : 'text-purple-700'
                }`}>
                  {isPauseWindowClosedNow ? (
                    <>
                      You can pause meals starting from{' '}
                      <span className="font-medium">{earliestPauseDateLabel}</span>.
                      The pause window closes daily at <span className="font-medium">{pauseCutoffTimeLabel}</span>.
                    </>
                  ) : (
                    <>
                      You can pause meals starting from{' '}
                      <span className="font-medium">{earliestPauseDateLabel}</span>.
                      Pause window closes today at <span className="font-medium">{pauseCutoffTimeLabel}</span>.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Subscription Info */}
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-2">Subscription Details</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Duration:</span>
                <span className="ml-2 font-medium text-slate-900">{subscription.durationDays} days</span>
              </div>
              <div>
                <span className="text-slate-600">Meal Types:</span>
                <span className="ml-2 font-medium text-slate-900">{availableMealTypes.join(', ')}</span>
              </div>
              <div>
                <span className="text-slate-600">Paused Meals:</span>
                <span className="ml-2 font-medium text-slate-900">
                  {(subscription.pausedMeals || []).length} meal{(subscription.pausedMeals || []).length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Date Selection Grid */}
          {availableDates.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">No dates available to pause</p>
              <p className="text-sm text-slate-500 mt-1">Your subscription may have ended or all dates are in the past</p>
            </div>
          ) : (
            <>
              <h3 className="font-semibold text-slate-900 mb-4">Select Meals to Pause</h3>
              <div className="space-y-4">
                {availableDates.map((date) => {
                  const dateStr = date.toISOString().split('T')[0];
                  const selectedMealsForDate = selectedMeals.get(dateStr);
                  const allSelected = selectedMealsForDate && selectedMealsForDate.size === availableMealTypes.length;

                  return (
                    <div
                      key={dateStr}
                      className="p-4 rounded-lg border-2 border-slate-200 bg-white hover:border-purple-200 transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900">{getDateLabel(date)}</div>
                          <div className="text-sm text-slate-600">{formatDate(date)}</div>
                        </div>
                        <button
                          onClick={() => handleToggleAllMealsForDate(dateStr)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            allSelected
                              ? 'bg-purple-500 text-white hover:bg-purple-600'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                          }`}
                        >
                          {allSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {availableMealTypes.map((mealType) => {
                          const isSelected = selectedMealsForDate?.has(mealType) || false;
                          const colors = getMealColor(mealType);

                          return (
                            <button
                              key={mealType}
                              onClick={() => handleMealToggle(dateStr, mealType)}
                              className={`
                                flex items-center justify-between p-3 rounded-lg border-2 transition-all
                                ${isSelected
                                  ? `${colors.activeBg} border-transparent text-white shadow-md`
                                  : `${colors.bg} ${colors.border} ${colors.text} hover:shadow-sm`
                                }
                              `}
                            >
                              <div className="flex items-center gap-2">
                                {getMealIcon(mealType)}
                                <span className="text-sm font-medium">{mealType}</span>
                              </div>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center">
                                  <span className="text-xs">✓</span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      
                      {selectedMealsForDate && selectedMealsForDate.size > 0 && (
                        <div className="mt-2 text-xs text-slate-500">
                          {selectedMealsForDate.size} meal{selectedMealsForDate.size !== 1 ? 's' : ''} paused
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="text-sm text-slate-600">
            {totalPausedMeals} meal{totalPausedMeals !== 1 ? 's' : ''} selected across {selectedMeals.size} date{selectedMeals.size !== 1 ? 's' : ''}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagePausingDialog;
