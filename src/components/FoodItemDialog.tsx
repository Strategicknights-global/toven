import React, { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import Dialog from './Dialog';
import IconButton from './IconButton';
import type { FoodCategory, FoodItemSchema, MealType } from '../schemas/FoodItemSchema';

export type FoodItemDialogMode = 'create' | 'edit';

export type FoodItemDialogSubmitPayload = {
  name: string;
  category: FoodCategory;
  mealType: MealType;
  coins: number;
  discountCoins: number;
  isAddon: boolean;
  addonDescription?: string | null;
  addonAccentFrom?: string | null;
  addonAccentTo?: string | null;
  imageBase64?: string | null;
};

interface FoodItemDialogProps {
  open: boolean;
  mode: FoodItemDialogMode;
  initialItem?: FoodItemSchema | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: FoodItemDialogSubmitPayload) => Promise<void>;
}

type FormState = {
  name: string;
  category: FoodCategory;
  mealType: MealType;
  coins: string;
  discountCoins: string;
  isAddon: boolean;
  addonDescription: string;
  addonAccentFrom: string;
  addonAccentTo: string;
};

type ImageState = {
  value: string | null;
  dirty: boolean;
};

const CATEGORY_OPTIONS: FoodCategory[] = ['Veg', 'Non-Veg'];
const MEAL_TYPE_OPTIONS: MealType[] = ['Breakfast', 'Lunch', 'Dinner'];

const createInitialFormState = (item?: FoodItemSchema | null): FormState => ({
  name: item?.name ?? '',
  category: item?.category ?? 'Veg',
  mealType: item?.mealType ?? 'Breakfast',
  coins: item?.coins != null ? String(item.coins) : '',
  discountCoins: item?.discountCoins != null ? String(item.discountCoins) : '0',
  isAddon: item?.isAddon ?? false,
  addonDescription: item?.addonDescription ?? '',
  addonAccentFrom: item?.addonAccentFrom ?? '#fff7ed',
  addonAccentTo: item?.addonAccentTo ?? '#fef3c7',
});

const createInitialImageState = (item?: FoodItemSchema | null): ImageState => ({
  value: item?.imageBase64 ?? null,
  dirty: false,
});

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

const FoodItemDialog: React.FC<FoodItemDialogProps> = ({ open, mode, initialItem, submitting = false, onClose, onSubmit }) => {
  const [form, setForm] = useState<FormState>(() => createInitialFormState(initialItem));
  const [image, setImage] = useState<ImageState>(() => createInitialImageState(initialItem));
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(createInitialFormState(initialItem));
      setImage(createInitialImageState(initialItem));
      setError(null);
      setUploadError(null);
      setUploading(false);
    }
  }, [open, initialItem]);

  const dialogTitle = useMemo(() => (mode === 'create' ? 'Add Food Item' : 'Edit Food Item'), [mode]);
  const dialogActionLabel = useMemo(() => (mode === 'create' ? 'Create Food Item' : 'Save Changes'), [mode]);

  const handleInputChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTextAreaChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setForm((prev) => ({
      ...prev,
      [field]: checked,
      ...(checked && prev.addonAccentFrom.trim().length === 0
        ? { addonAccentFrom: '#fff7ed' }
        : {}),
      ...(checked && prev.addonAccentTo.trim().length === 0
        ? { addonAccentTo: '#fef3c7' }
        : {}),
    }));
  };

  const handleColorChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
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

    const coinsValue = Number(form.coins);
    if (!Number.isFinite(coinsValue) || coinsValue < 0) {
      setError('Coins must be a non-negative number.');
      return;
    }

    const discountCoinsValue = Number(form.discountCoins);
    if (!Number.isFinite(discountCoinsValue) || discountCoinsValue < 0) {
      setError('Discount coins must be a non-negative number.');
      return;
    }

    if (uploading) {
      setError('Please wait for the image upload to finish.');
      return;
    }

    setError(null);

    const payload: FoodItemDialogSubmitPayload = {
      name: form.name.trim(),
      category: form.category,
      mealType: form.mealType,
      coins: coinsValue,
      discountCoins: discountCoinsValue,
      isAddon: form.isAddon,
    };

    if (form.isAddon) {
      const trimmedDescription = form.addonDescription.trim();
      if (trimmedDescription.length > 0) {
        payload.addonDescription = trimmedDescription;
      } else {
        payload.addonDescription = null;
      }
      const from = form.addonAccentFrom.trim();
      const to = form.addonAccentTo.trim();
      payload.addonAccentFrom = from.length > 0 ? from : null;
      payload.addonAccentTo = to.length > 0 ? to : null;
    } else {
      payload.addonDescription = null;
      payload.addonAccentFrom = null;
      payload.addonAccentTo = null;
    }

    if (mode === 'create') {
      if (image.value) {
        payload.imageBase64 = image.value;
      }
    } else if (image.dirty) {
      payload.imageBase64 = image.value;
    }

    if (mode === 'edit' && !image.dirty && initialItem?.imageBase64 && payload.imageBase64 === undefined) {
      // preserve existing image if untouched
      payload.imageBase64 = initialItem.imageBase64;
    }

    try {
      await onSubmit(payload);
    } catch (submitErr) {
      setError((submitErr as Error).message || 'Failed to save food item.');
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
      description="Provide the food item details below. Images are stored as base64 for quick retrieval."
      size="lg"
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
            form="food-item-dialog-form"
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
            disabled={submitting || uploading}
          >
            {submitting ? 'Saving…' : dialogActionLabel}
          </button>
        </div>
      }
    >
      <form id="food-item-dialog-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={handleInputChange('name')}
              placeholder="Enter food item name"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Category</label>
              <select
                value={form.category}
                onChange={handleInputChange('category')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Meal Type</label>
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
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Coins *</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.coins}
                onChange={handleInputChange('coins')}
                placeholder="0"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Discount Coins *</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.discountCoins}
                onChange={handleInputChange('discountCoins')}
                placeholder="0"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                required
              />
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-600">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              checked={form.isAddon}
              onChange={handleCheckboxChange('isAddon')}
            />
            <span>
              <span className="font-semibold text-slate-800">Mark as Add-on</span>
              <span className="block text-xs text-slate-500">Add-on items appear in the customer Add-ons marketplace and can be filtered separately.</span>
            </span>
          </label>

          {form.isAddon && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Add-on Tagline</label>
              <textarea
                value={form.addonDescription}
                onChange={handleTextAreaChange('addonDescription')}
                placeholder="Perfect companion to your breakfast plans with a veg twist."
                className="min-h-[96px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
              <p className="text-xs text-slate-500">This copy appears on the Add-ons page. Leave blank to hide it.</p>
            </div>
          )}

          {form.isAddon && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Gradient start</label>
                <input
                  type="color"
                  value={form.addonAccentFrom}
                  onChange={handleColorChange('addonAccentFrom')}
                  className="h-11 w-full cursor-pointer rounded-md border border-slate-300 bg-white p-1 shadow-sm"
                />
                <p className="text-xs text-slate-500">Used as the first color for the add-on card background.</p>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Gradient end</label>
                <input
                  type="color"
                  value={form.addonAccentTo}
                  onChange={handleColorChange('addonAccentTo')}
                  className="h-11 w-full cursor-pointer rounded-md border border-slate-300 bg-white p-1 shadow-sm"
                />
                <p className="text-xs text-slate-500">Finishers for the gradient sweep. Leave default if unsure.</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Display Image</label>
            {image.value && (
              <IconButton
                label="Remove image"
                icon={<Trash2 size={14} />}
                variant="danger"
                tooltipSide="left"
                className="!p-1.5"
                onClick={handleRemoveImage}
                disabled={uploading}
              />
            )}
          </div>
          {image.value ? (
            <div className="flex items-start gap-4">
              <div className="h-24 w-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                <img
                  src={image.value}
                  alt={form.name || 'Food preview'}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1 text-xs text-slate-500">
                <p>Image stored as base64. Ensure it&apos;s optimised for performance.</p>
                <p className="mt-1">Size limit: 1.5MB</p>
              </div>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center text-sm text-slate-500 hover:border-purple-400 hover:bg-purple-50/50">
              <span className="font-medium text-slate-700">Click to upload image</span>
              <span className="text-xs text-slate-400">PNG, JPG, or WebP up to 1.5MB</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />
            </label>
          )}
          {uploadError && <p className="text-xs font-semibold text-red-500">{uploadError}</p>}
        </div>

        {error && <p className="text-sm font-medium text-red-500">{error}</p>}
      </form>
    </Dialog>
  );
};

export default FoodItemDialog;
