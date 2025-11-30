import React, { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Plus, Trash2 } from 'lucide-react';
import Dialog from './Dialog';
import IconButton from './IconButton';
import type { CategorySchema } from '../schemas/CategorySchema';
import type {
  PackageDateMenuEntryInput,
  PackageSchema,
  PackageStatus,
} from '../schemas/PackageSchema';
import { createDefaultDateMenu } from '../schemas/PackageSchema';
import type { MealType, FoodItemSchema } from '../schemas/FoodItemSchema';
import { useFoodItemsStore } from '../stores/foodItemsStore';
import { useToastStore } from '../stores/toastStore';

export type PackageDialogMode = 'create' | 'edit';

export type PackageDialogSubmitPayload = {
  name: string;
  categoryId: string;
  mealType: MealType;
  price: number;
  status: PackageStatus;
  dateMenus: PackageDateMenuEntryInput[];
  menuDescription?: string | null;
  imageBase64?: string | null;
};

interface PackageDialogProps {
  open: boolean;
  mode: PackageDialogMode;
  initialPackage?: PackageSchema | null;
  categories: CategorySchema[];
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: PackageDialogSubmitPayload) => Promise<void>;
}

type FormState = {
  name: string;
  categoryId: string;
  mealType: MealType;
  price: string;
  status: PackageStatus;
  menuDescription: string;
};

type ImageState = {
  value: string | null;
  dirty: boolean;
};

type DateMenuFormEntry = {
  id: string;
  date: string;
  foodItemIds: string[];
  foodItemQuantities: Record<string, number>;
  description: string;
};

const MEAL_TYPE_OPTIONS: MealType[] = ['Breakfast', 'Lunch', 'Dinner'];
const STATUS_OPTIONS: PackageStatus[] = ['Available', 'Unavailable'];

const generateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const isValidISODate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const addDaysToISO = (iso: string, offset: number): string => {
  const base = new Date(iso);
  if (Number.isNaN(base.getTime())) {
    const fallback = createDefaultDateMenu().date;
    return addDaysToISO(fallback, offset);
  }
  base.setDate(base.getDate() + offset);
  return base.toISOString().slice(0, 10);
};

const createDateMenuFormEntry = (entry?: { date?: string | null; foodItemIds?: string[] | null; foodItemQuantities?: Record<string, number> | null; description?: string | null } | null): DateMenuFormEntry => {
  const fallbackDate = createDefaultDateMenu().date;
  const dateCandidate = typeof entry?.date === 'string' ? entry.date.trim() : '';
  const date = dateCandidate && isValidISODate(dateCandidate) ? dateCandidate : fallbackDate;
  const foodItemIds = Array.isArray(entry?.foodItemIds) ? entry.foodItemIds : [];
  const foodItemQuantities = entry?.foodItemQuantities && typeof entry.foodItemQuantities === 'object' ? entry.foodItemQuantities : {};
  const description = typeof entry?.description === 'string' ? entry.description.trim() : '';
  return {
    id: generateId(),
    date,
    foodItemIds,
    foodItemQuantities,
    description,
  };
};

const createInitialFormState = (pkg?: PackageSchema | null): FormState => ({
  name: pkg?.name ?? '',
  categoryId: pkg?.categoryId ?? '',
  mealType: pkg?.mealType ?? 'Breakfast',
  price: pkg?.price != null ? String(pkg.price) : '',
  status: pkg?.status ?? 'Available',
  menuDescription: pkg?.menuDescription ?? '',
});

const createInitialImageState = (pkg?: PackageSchema | null): ImageState => ({
  value: pkg?.imageBase64 ?? null,
  dirty: false,
});

const createInitialDateMenuState = (pkg?: PackageSchema | null): DateMenuFormEntry[] => {
  const entries = pkg?.dateMenus ?? [];
  if (!entries.length) {
    return [createDateMenuFormEntry(null)];
  }
  return entries.map((entry) =>
    createDateMenuFormEntry({
      date: entry.date,
      foodItemIds: entry.foodItemIds,
      foodItemQuantities: entry.foodItemQuantities,
      description: entry.description,
    }),
  );
};

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

const PackageDialog: React.FC<PackageDialogProps> = ({
  open,
  mode,
  initialPackage,
  categories,
  submitting = false,
  onClose,
  onSubmit,
}) => {
  const { items: foodItems, loadItems: loadFoodItems } = useFoodItemsStore();
  const { addToast } = useToastStore();
  const [form, setForm] = useState<FormState>(() => createInitialFormState(initialPackage));
  const [image, setImage] = useState<ImageState>(() => createInitialImageState(initialPackage));
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dateMenus, setDateMenus] = useState<DateMenuFormEntry[]>(() => createInitialDateMenuState(initialPackage));

  useEffect(() => {
    if (open) {
      setForm(createInitialFormState(initialPackage));
      setImage(createInitialImageState(initialPackage));
      setError(null);
      setUploadError(null);
      setUploading(false);
      setDateMenus(createInitialDateMenuState(initialPackage));
      void loadFoodItems();
    }
  }, [open, initialPackage, loadFoodItems]);

  useEffect(() => {
    if (!open) return;
    if (form.categoryId || categories.length === 0) {
      return;
    }
    setForm((prev) => ({ ...prev, categoryId: categories[0]?.id ?? '' }));
  }, [categories, open, form.categoryId]);

  const dialogTitle = useMemo(() => (mode === 'create' ? 'Add Package' : 'Edit Package'), [mode]);
  const dialogActionLabel = useMemo(() => (mode === 'create' ? 'Create Package' : 'Save Changes'), [mode]);

  const handleInputChange = (field: keyof FormState) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value as never }));
  };

  const handleDateMenuChange = (id: string, field: 'date' | 'description', value: string) => {
    setDateMenus((prev) => {
      // If changing date, check for duplicates
      if (field === 'date') {
        const trimmedValue = value.trim();
        const isDuplicate = prev.some((item) => item.id !== id && item.date.trim() === trimmedValue);
        if (isDuplicate && trimmedValue !== '') {
          // Show toast notification
          addToast('This date is already used in another entry. Please select a different date.', 'warning', 4000);
          // Don't allow the change if it creates a duplicate
          return prev;
        }
      }
      return prev.map((item) => (item.id === id ? { ...item, [field]: value } : item));
    });
  };

  const computeNextDate = (from?: string): string => {
    const base = typeof from === 'string' ? from.trim() : '';
    if (base && isValidISODate(base)) {
      return addDaysToISO(base, 1);
    }
    return createDefaultDateMenu().date;
  };

  const handleAddDateMenu = () => {
    setDateMenus((prev) => {
      const nextDate = computeNextDate(prev[prev.length - 1]?.date);
      return [...prev, createDateMenuFormEntry({ date: nextDate, description: '' })];
    });
  };

  const handleRemoveDateMenu = (id: string) => {
    setDateMenus((prev) => {
      if (prev.length === 1) {
        return prev;
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    const maxFileSize = 1.5 * 1024 * 1024; // 1.5MB
    if (file.size > maxFileSize) {
      setUploadError('Please choose an image smaller than 1.5MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose a valid image file.');
      return;
    }

    setUploading(true);
    try {
      const base64 = await toBase64(file);
      setImage({ value: base64, dirty: true });
    } catch (uploadErr) {
      setUploadError((uploadErr as Error).message || 'Failed to load image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImage({ value: null, dirty: true });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }

    if (!form.categoryId) {
      setError('Category is required.');
      return;
    }

    const priceValue = Number(form.price);
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      setError('Price must be a non-negative number.');
      return;
    }

    if (uploading) {
      setError('Please wait for the image upload to finish.');
      return;
    }

    const normalizedDateMenus = dateMenus
      .map((item) => ({
        date: item.date.trim(),
        foodItemIds: item.foodItemIds,
        foodItemQuantities: item.foodItemQuantities,
        description: item.description.trim().length > 0 ? item.description.trim() : undefined,
      }))
      .filter((item) => item.date.length > 0);

    if (normalizedDateMenus.length === 0) {
      setError('Add at least one date entry for the menu.');
      return;
    }

    const invalidEntry = normalizedDateMenus.find((entry) => !isValidISODate(entry.date));
    if (invalidEntry) {
      setError('Dates must be in YYYY-MM-DD format.');
      return;
    }

    // Check for duplicate dates
    const dateSet = new Set<string>();
    const duplicateDate = normalizedDateMenus.find((entry) => {
      if (dateSet.has(entry.date)) {
        return true;
      }
      dateSet.add(entry.date);
      return false;
    });
    if (duplicateDate) {
      setError(`Duplicate date found: ${duplicateDate.date}. Each date can only appear once.`);
      return;
    }

    setError(null);

    const payload: PackageDialogSubmitPayload = {
      name: form.name.trim(),
      categoryId: form.categoryId,
      mealType: form.mealType,
      price: priceValue,
      status: form.status,
      dateMenus: normalizedDateMenus,
      menuDescription: form.menuDescription.trim().length > 0 ? form.menuDescription.trim() : null,
    };

    if (mode === 'create') {
      if (image.value) {
        payload.imageBase64 = image.value;
      }
    } else if (image.dirty) {
      payload.imageBase64 = image.value;
    }

    if (mode === 'edit' && !image.dirty && initialPackage?.imageBase64 && payload.imageBase64 === undefined) {
      payload.imageBase64 = initialPackage.imageBase64;
    }

    try {
      await onSubmit(payload);
    } catch (submitErr) {
      setError((submitErr as Error).message || 'Failed to save package.');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!submitting && !uploading) {
          onClose();
        }
      }}
      title={dialogTitle}
      description="Provide the package details below. Images are stored as base64 for quick retrieval."
      size="xxl"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              if (!submitting && !uploading) {
                onClose();
              }
            }}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-60"
            disabled={submitting || uploading}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="package-dialog-form"
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
            disabled={submitting || uploading}
          >
            {submitting ? 'Saving…' : dialogActionLabel}
          </button>
        </div>
      }
    >
      <form id="package-dialog-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Package Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={handleInputChange('name')}
              placeholder="Enter package name"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Meal Type *</label>
              <select
                value={form.mealType}
                onChange={handleInputChange('mealType')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              >
                {MEAL_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Category *</label>
              <select
                value={form.categoryId}
                onChange={handleInputChange('categoryId')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                disabled={categories.length === 0}
              >
                {categories.length === 0 ? (
                  <option value="">No categories available</option>
                ) : (
                  categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Price *</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.price}
                onChange={handleInputChange('price')}
                placeholder="0"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Status *</label>
            <select
              value={form.status}
              onChange={handleInputChange('status')}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Dated Menu Entries</h3>
              <p className="text-xs text-slate-500">Add a date and optional description for each planned menu. The list supports 10, 20, 30 or more entries.</p>
            </div>
            <button
              type="button"
              onClick={handleAddDateMenu}
              className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-60"
              disabled={submitting || uploading}
            >
              <CalendarPlus className="h-4 w-4" /> Add date
            </button>
          </div>

          <div className="space-y-4">
            {dateMenus.map((item, index) => {
              // Check if this date is duplicated
              const isDuplicate = item.date.trim() !== '' && dateMenus.some((other) => other.id !== item.id && other.date.trim() === item.date.trim());
              
              return (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Date *</label>
                    <input
                      type="date"
                      value={item.date}
                      onChange={(event) => handleDateMenuChange(item.id, 'date', event.target.value)}
                      className={`mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 ${
                        isDuplicate 
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                          : 'border-slate-300 focus:border-purple-500 focus:ring-purple-200'
                      }`}
                      required
                    />
                    {isDuplicate && (
                      <p className="mt-1 text-xs text-red-600">This date is already used in another entry</p>
                    )}
                  </div>
                  <div className="flex items-start md:justify-end">
                    <IconButton
                      label="Remove date entry"
                      variant="danger"
                      icon={<Trash2 className="h-4 w-4" />}
                      onClick={() => handleRemoveDateMenu(item.id)}
                      disabled={dateMenus.length === 1 || submitting || uploading}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Food Items *</label>
                  <div className="mt-1">
                    <select
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                      value=""
                      onChange={(event) => {
                        const foodItemId = event.target.value;
                        if (foodItemId && !item.foodItemIds.includes(foodItemId)) {
                          setDateMenus((prev) =>
                            prev.map((menuItem) =>
                              menuItem.id === item.id
                                ? {
                                    ...menuItem,
                                    foodItemIds: [...menuItem.foodItemIds, foodItemId],
                                    foodItemQuantities: { ...menuItem.foodItemQuantities, [foodItemId]: 1 },
                                  }
                                : menuItem,
                            ),
                          );
                        }
                      }}
                    >
                      <option value="">Select a food item to add...</option>
                      {foodItems
                        .filter((food: FoodItemSchema) => food.mealType === form.mealType)
                        .map((food: FoodItemSchema) => (
                          <option key={food.id} value={food.id}>
                            {food.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  {item.foodItemIds.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {item.foodItemIds.map((foodItemId) => {
                        const food = foodItems.find((f: FoodItemSchema) => f.id === foodItemId);
                        return (
                          <div key={foodItemId} className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-2">
                            <div className="flex-1 text-sm font-medium text-slate-700">{food?.name || foodItemId}</div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-slate-500">Quantity:</label>
                              <input
                                type="number"
                                min="1"
                                value={item.foodItemQuantities[foodItemId] || 1}
                                onChange={(event) => {
                                  const quantity = parseInt(event.target.value, 10);
                                  if (!isNaN(quantity) && quantity > 0) {
                                    setDateMenus((prev) =>
                                      prev.map((menuItem) =>
                                        menuItem.id === item.id
                                          ? {
                                              ...menuItem,
                                              foodItemQuantities: { ...menuItem.foodItemQuantities, [foodItemId]: quantity },
                                            }
                                          : menuItem,
                                      ),
                                    );
                                  }
                                }}
                                className="w-20 rounded border border-slate-300 px-2 py-1 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-200"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setDateMenus((prev) =>
                                  prev.map((menuItem) => {
                                    if (menuItem.id === item.id) {
                                      const newFoodItemIds = menuItem.foodItemIds.filter((id) => id !== foodItemId);
                                      const newQuantities = { ...menuItem.foodItemQuantities };
                                      delete newQuantities[foodItemId];
                                      return {
                                        ...menuItem,
                                        foodItemIds: newFoodItemIds,
                                        foodItemQuantities: newQuantities,
                                      };
                                    }
                                    return menuItem;
                                  }),
                                );
                              }}
                              className="text-slate-500 hover:text-red-600"
                              title="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    Select a food item to add it to the list. Selected items: {item.foodItemIds.length}
                  </p>
                </div>
                <div className="mt-3 text-xs font-medium text-slate-500">Entry {index + 1}</div>
              </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Package Image</h3>
              <p className="text-xs text-slate-500">Optional preview shared across the app. JPG or PNG under 1.5MB works best.</p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-400">
              <Plus className="h-4 w-4" /> Upload
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>

          {uploadError && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{uploadError}</div>}

          {image.value ? (
            <div className="flex items-start gap-4">
              <img src={image.value} alt="Package" className="h-32 w-32 rounded-md object-cover shadow" />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="mt-2 inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
                disabled={uploading}
              >
                <Trash2 className="h-4 w-4" /> Remove image
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-400">No preview yet. Uploading an image is optional.</p>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Menu overview</label>
            <textarea
              value={form.menuDescription}
              onChange={(event) => setForm((prev) => ({ ...prev, menuDescription: event.target.value }))}
              placeholder="Summarize the dishes customers can expect (optional)."
              rows={4}
              className="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            <p className="mt-1 text-xs text-slate-400">Shown to customers on the subscription checkout page. Leave blank to use the dated schedule preview.</p>
          </div>
        </div>

        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      </form>
    </Dialog>
  );
};

export default PackageDialog;
