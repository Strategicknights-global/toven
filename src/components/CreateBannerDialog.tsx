import React, { useEffect, useMemo, useState } from 'react';
import Dialog from './Dialog';
import type { BannerPlacement, BannerCreateInput, BannerSchema } from '../schemas/BannerSchema';
import { BANNER_PLACEMENT_OPTIONS } from '../schemas/BannerSchema';

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

interface CreateBannerDialogProps {
  open: boolean;
  creating: boolean;
  initialPlacement?: BannerPlacement;
  initialBanner?: BannerSchema | null;
  onClose: () => void;
  onSubmit: (input: BannerCreateInput) => Promise<void> | void;
}

interface FormState {
  placement: BannerPlacement;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  fileName: string;
  sortOrder: string;
  imageUrl: string;
  isActive: boolean;
}

interface ImageState {
  value: string | null;
  error: string | null;
  uploading: boolean;
}

const DEFAULT_PLACEMENT: BannerPlacement = 'home';

const CreateBannerDialog: React.FC<CreateBannerDialogProps> = ({
  open,
  creating,
  initialPlacement,
  initialBanner,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState<FormState>({
    placement: initialPlacement ?? DEFAULT_PLACEMENT,
    title: '',
    description: '',
    ctaLabel: '',
    ctaHref: '',
    fileName: '',
    sortOrder: '',
    imageUrl: '',
    isActive: true,
  });
  const [image, setImage] = useState<ImageState>({ value: null, error: null, uploading: false });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initialBanner) {
      setForm({
        placement: initialBanner.placement ?? (initialPlacement ?? DEFAULT_PLACEMENT),
        title: initialBanner.title ?? '',
        description: initialBanner.description ?? '',
        ctaLabel: initialBanner.ctaLabel ?? '',
        ctaHref: initialBanner.ctaHref ?? '',
        fileName: initialBanner.fileName ?? '',
        sortOrder: initialBanner.sortOrder != null ? String(initialBanner.sortOrder) : '',
        imageUrl: initialBanner.imageUrl ?? '',
        isActive: initialBanner.isActive !== false,
      });
      setImage({ value: initialBanner.imageBase64 ?? null, error: null, uploading: false });
      setError(null);
      return;
    }
    setForm({
      placement: initialPlacement ?? DEFAULT_PLACEMENT,
      title: '',
      description: '',
      ctaLabel: '',
      ctaHref: '',
      fileName: '',
      sortOrder: '',
      imageUrl: '',
      isActive: true,
    });
    setImage({ value: null, error: null, uploading: false });
    setError(null);
  }, [open, initialPlacement, initialBanner]);

  const placementOptions = useMemo(() => BANNER_PLACEMENT_OPTIONS.map((option) => ({
    value: option.value,
    label: `${option.label} (${option.sectionTitle})`,
  })), []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setImage({ value: null, error: 'Please choose a valid image file.', uploading: false });
      return;
    }

    const maxFileSize = 2.5 * 1024 * 1024; // 2.5MB
    if (file.size > maxFileSize) {
      setImage({ value: null, error: 'Please upload an image smaller than 2.5MB.', uploading: false });
      return;
    }

    setImage({ value: null, error: null, uploading: true });
    try {
      const base64 = await toBase64(file);
      setImage({ value: base64, error: null, uploading: false });
      setForm((prev) => ({
        ...prev,
        fileName: prev.fileName || file.name,
      }));
    } catch (uploadError) {
      setImage({ value: null, error: (uploadError as Error).message ?? 'Failed to process image.', uploading: false });
    }
  };

  const handleRemoveImage = () => {
    setImage({ value: null, error: null, uploading: false });
  };

  const handleInputChange = (field: keyof FormState) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const value = event.target.type === 'checkbox'
      ? (event.target as HTMLInputElement).checked
      : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value as never }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (image.uploading) {
      setError('Please wait for the image to finish uploading.');
      return;
    }

    if (!form.fileName.trim()) {
      setError('Provide a filename to identify the banner.');
      return;
    }

    const sortOrderValue = form.sortOrder.trim();
    let parsedSortOrder: number | null | undefined = undefined;
    if (sortOrderValue) {
      const numeric = Number(sortOrderValue);
      if (!Number.isFinite(numeric)) {
        setError('Sort order must be a number.');
        return;
      }
      parsedSortOrder = numeric;
    }

    const hasImage = Boolean(image.value && image.value.trim());
    const hasUrl = Boolean(form.imageUrl.trim());

    if (!hasImage && !hasUrl) {
      setError('Upload an image or provide an external image URL.');
      return;
    }

    setError(null);

    const payload: BannerCreateInput = {
      placement: form.placement,
      fileName: form.fileName.trim(),
      imageBase64: hasImage ? image.value : null,
      imageUrl: hasUrl ? form.imageUrl.trim() : null,
      title: form.title.trim() ? form.title.trim() : null,
      description: form.description.trim() ? form.description.trim() : null,
      ctaLabel: form.ctaLabel.trim() ? form.ctaLabel.trim() : null,
      ctaHref: form.ctaHref.trim() ? form.ctaHref.trim() : null,
      sortOrder: parsedSortOrder ?? null,
      isActive: form.isActive,
    };

    await onSubmit(payload);
  };

  const footer = (
    <div className="flex justify-end gap-3">
      <button
        type="button"
        onClick={onClose}
        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-60"
        disabled={creating}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="create-banner-form"
        className="inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
        disabled={creating}
      >
        {creating ? 'Saving…' : 'Save Banner'}
      </button>
    </div>
  );

  const previewSource = image.value || (form.imageUrl.trim() || null);

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!creating) {
          onClose();
        }
      }}
      title={initialBanner ? 'Edit Banner' : 'Upload Banner'}
      description={initialBanner ? 'Update banner details and image.' : 'Choose the page placement and attach the banner image.'}
      size="lg"
      footer={footer}
    >
      <form id="create-banner-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="banner-placement" className="text-sm font-medium text-slate-700">
              Placement
            </label>
            <select
              id="banner-placement"
              value={form.placement}
              onChange={handleInputChange('placement')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              disabled={creating}
            >
              {placementOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="banner-title" className="text-sm font-medium text-slate-700">
              Title (optional)
            </label>
            <input
              id="banner-title"
              type="text"
              value={form.title}
              onChange={handleInputChange('title')}
              placeholder="Summer Offer"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              disabled={creating}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="banner-description" className="text-sm font-medium text-slate-700">
              Description (optional)
            </label>
            <input
              id="banner-description"
              type="text"
              value={form.description}
              onChange={handleInputChange('description')}
              placeholder="Short supporting text"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              disabled={creating}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="banner-cta-label" className="text-sm font-medium text-slate-700">
              Button text (optional)
            </label>
            <input
              id="banner-cta-label"
              type="text"
              value={form.ctaLabel}
              onChange={handleInputChange('ctaLabel')}
              placeholder="Order now"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              disabled={creating}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="banner-cta-href" className="text-sm font-medium text-slate-700">
              Button link (optional)
            </label>
            <input
              id="banner-cta-href"
              type="url"
              value={form.ctaHref}
              onChange={handleInputChange('ctaHref')}
              placeholder="https://example.com/menu"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              disabled={creating}
            />
            <p className="text-xs text-slate-500">Provide an absolute URL or on-site path (e.g. /menu).</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="banner-file-name" className="text-sm font-medium text-slate-700">
              File name
            </label>
            <input
              id="banner-file-name"
              type="text"
              value={form.fileName}
              onChange={handleInputChange('fileName')}
              placeholder="hero-banner.png"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              disabled={creating}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="banner-sort-order" className="text-sm font-medium text-slate-700">
              Sort order (optional)
            </label>
            <input
              id="banner-sort-order"
              type="number"
              value={form.sortOrder}
              onChange={handleInputChange('sortOrder')}
              placeholder="0"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              disabled={creating}
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-700" htmlFor="banner-image">
            Upload image
          </label>
          <input
            id="banner-image"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-purple-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-purple-600 hover:file:bg-purple-100"
            disabled={creating}
          />
          {image.error ? <p className="text-xs font-medium text-red-600">{image.error}</p> : null}
          {image.value ? (
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <img src={image.value} alt="Banner preview" className="h-16 w-16 rounded object-cover shadow-sm" />
              <div className="flex-1 text-xs text-slate-600">
                <p>Preview generated from the uploaded file.</p>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="mt-1 inline-flex items-center text-xs font-semibold text-red-600 hover:underline"
                  disabled={creating}
                >
                  Remove
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="banner-image-url" className="text-sm font-medium text-slate-700">
            External image URL (optional)
          </label>
          <input
            id="banner-image-url"
            type="url"
            value={form.imageUrl}
            onChange={handleInputChange('imageUrl')}
            placeholder="https://cdn.example.com/banner.jpg"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            disabled={creating}
          />
          <p className="text-xs text-slate-500">
            Provide a hosted image URL if you prefer not to upload a file.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="banner-active"
            type="checkbox"
            checked={form.isActive}
            onChange={handleInputChange('isActive')}
            className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
            disabled={creating}
          />
          <label htmlFor="banner-active" className="text-sm font-medium text-slate-700">
            Mark as active
          </label>
        </div>

        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

        {previewSource ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
            <p className="font-semibold text-slate-700">Preview</p>
            <div className="mt-2 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
              <img src={previewSource} alt="Banner preview" className="w-full object-cover" />
            </div>
          </div>
        ) : null}
      </form>
    </Dialog>
  );
};

export default CreateBannerDialog;
