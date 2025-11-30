import React, { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import Dialog from './Dialog';
import IconButton from './IconButton';
import type { CategorySchema, CategoryStatus } from '../schemas/CategorySchema';

export type CategoryDialogMode = 'create' | 'edit';

export type CategoryDialogSubmitPayload = {
  name: string;
  price: number;
  status: CategoryStatus;
  imageBase64?: string | null;
  description?: string | null;
  accentFrom?: string | null;
  accentTo?: string | null;
};

interface CategoryDialogProps {
  open: boolean;
  mode: CategoryDialogMode;
  initialCategory?: CategorySchema | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: CategoryDialogSubmitPayload) => Promise<void>;
}

type FormState = {
  name: string;
  price: string;
  status: CategoryStatus;
  description: string;
  accentFrom: string;
  accentTo: string;
  useAccentGradient: boolean;
};

type ImageState = {
  value: string | null;
  dirty: boolean;
};

const STATUS_OPTIONS: CategoryStatus[] = ['Available', 'Unavailable'];
const DEFAULT_ACCENT_FROM = '#8B5CF6';
const DEFAULT_ACCENT_TO = '#6366F1';

const createInitialFormState = (category?: CategorySchema | null): FormState => ({
  name: category?.name ?? '',
  price: category?.price != null ? String(category.price) : '',
  status: category?.status ?? 'Available',
  description: category?.description ?? '',
  accentFrom: category?.accentFrom ?? category?.accentTo ?? DEFAULT_ACCENT_FROM,
  accentTo: category?.accentTo ?? category?.accentFrom ?? DEFAULT_ACCENT_TO,
  useAccentGradient: Boolean(category?.accentFrom || category?.accentTo),
});

const createInitialImageState = (category?: CategorySchema | null): ImageState => ({
  value: category?.imageBase64 ?? null,
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

const CategoryDialog: React.FC<CategoryDialogProps> = ({
  open,
  mode,
  initialCategory,
  submitting = false,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState<FormState>(() => createInitialFormState(initialCategory));
  const [image, setImage] = useState<ImageState>(() => createInitialImageState(initialCategory));
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(createInitialFormState(initialCategory));
      setImage(createInitialImageState(initialCategory));
      setError(null);
      setUploadError(null);
      setUploading(false);
    }
  }, [open, initialCategory]);

  const dialogTitle = useMemo(() => (mode === 'create' ? 'Add Category' : 'Edit Category'), [mode]);
  const dialogActionLabel = useMemo(() => (mode === 'create' ? 'Create Category' : 'Save Changes'), [mode]);

  const handleInputChange = (field: keyof FormState) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value as never }));
  };

  const handleToggleAccentGradient = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setForm((prev) => ({
      ...prev,
      useAccentGradient: checked,
      accentFrom: checked && !prev.accentFrom ? DEFAULT_ACCENT_FROM : prev.accentFrom,
      accentTo: checked && !prev.accentTo ? DEFAULT_ACCENT_TO : prev.accentTo,
    }));
  };

  const handleAccentGradientChange = (field: 'accentFrom' | 'accentTo') => (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
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

    const priceValue = Number(form.price);
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      setError('Price must be a non-negative number.');
      return;
    }

    if (uploading) {
      setError('Please wait for the image upload to finish.');
      return;
    }

    setError(null);

    const payload: CategoryDialogSubmitPayload = {
      name: form.name.trim(),
      price: priceValue,
      status: form.status,
    };

    const trimmedDescription = form.description.trim();
    payload.description = trimmedDescription ? trimmedDescription : null;

    if (form.useAccentGradient) {
      const accentFromValue = form.accentFrom.trim();
      const accentToValue = form.accentTo.trim();
      payload.accentFrom = accentFromValue ? accentFromValue : null;
      payload.accentTo = accentToValue ? accentToValue : null;
    } else {
      payload.accentFrom = null;
      payload.accentTo = null;
    }

    if (mode === 'create') {
      if (image.value) {
        payload.imageBase64 = image.value;
      }
    } else if (image.dirty) {
      payload.imageBase64 = image.value;
    }

    if (mode === 'edit' && !image.dirty && initialCategory?.imageBase64 && payload.imageBase64 === undefined) {
      payload.imageBase64 = initialCategory.imageBase64;
    }

    try {
      await onSubmit(payload);
    } catch (submitErr) {
      setError((submitErr as Error).message || 'Failed to save category.');
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
      description="Provide the category details below. Images are stored as base64 for quick retrieval."
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
            form="category-dialog-form"
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
            disabled={submitting || uploading}
          >
            {submitting ? 'Saving…' : dialogActionLabel}
          </button>
        </div>
      }
    >
      <form id="category-dialog-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={handleInputChange('name')}
              placeholder="Enter category name"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Description</label>
            <textarea
              value={form.description}
              onChange={handleInputChange('description')}
              placeholder="Add a short pitch for this subscription category"
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            <p className="mt-1 text-xs text-slate-400">Shown on the subscription page under the category title.</p>
          </div>

          <div className="space-y-3 rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Accent gradient
                </span>
                <p className="text-xs text-slate-400">
                  Configure the background gradient for this subscription category.
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={form.useAccentGradient}
                  onChange={handleToggleAccentGradient}
                  className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                Use custom gradient
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  From color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.accentFrom}
                    onChange={handleAccentGradientChange('accentFrom')}
                    disabled={!form.useAccentGradient}
                    className="h-10 w-16 cursor-pointer rounded border border-slate-300 disabled:cursor-not-allowed"
                  />
                  <input
                    type="text"
                    value={form.accentFrom}
                    onChange={handleAccentGradientChange('accentFrom')}
                    disabled={!form.useAccentGradient}
                    placeholder={DEFAULT_ACCENT_FROM}
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  To color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.accentTo}
                    onChange={handleAccentGradientChange('accentTo')}
                    disabled={!form.useAccentGradient}
                    className="h-10 w-16 cursor-pointer rounded border border-slate-300 disabled:cursor-not-allowed"
                  />
                  <input
                    type="text"
                    value={form.accentTo}
                    onChange={handleAccentGradientChange('accentTo')}
                    disabled={!form.useAccentGradient}
                    placeholder={DEFAULT_ACCENT_TO}
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </div>
              </div>
            </div>
          </div>
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
                  alt={form.name || 'Category preview'}
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

export default CategoryDialog;
