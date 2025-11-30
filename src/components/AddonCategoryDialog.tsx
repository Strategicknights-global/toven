import React, { useEffect, useState } from 'react';
import Dialog from './Dialog';
import type { AddonCategorySchema } from '../schemas/AddonCategorySchema';
import type { FoodItemSchema } from '../schemas/FoodItemSchema';

export type AddonCategoryDialogMode = 'create' | 'edit';

export type AddonCategoryDialogSubmitPayload = {
  name: string;
  addonIds: string[];
};

interface AddonCategoryDialogProps {
  open: boolean;
  mode: AddonCategoryDialogMode;
  addons: FoodItemSchema[];
  initialCategory?: AddonCategorySchema | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: AddonCategoryDialogSubmitPayload) => Promise<void>;
}

type FormState = {
  name: string;
  selectedAddonIds: string[];
};

const createInitialFormState = (
  category?: AddonCategorySchema | null,
): FormState => ({
  name: category?.name ?? '',
  selectedAddonIds: category?.addonIds ?? [],
});

const AddonCategoryDialog: React.FC<AddonCategoryDialogProps> = ({
  open,
  mode,
  addons,
  initialCategory,
  submitting = false,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState<FormState>(() => createInitialFormState(initialCategory));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(createInitialFormState(initialCategory));
      setError(null);
    }
  }, [open, initialCategory]);

  const dialogTitle = mode === 'create' ? 'Add Addon Category' : 'Edit Addon Category';
  const dialogActionLabel = mode === 'create' ? 'Create Addon Category' : 'Save Changes';

  const toggleAddonSelection = (addonId: string) => {
    setForm((prev) => {
      const exists = prev.selectedAddonIds.includes(addonId);
      return {
        ...prev,
        selectedAddonIds: exists
          ? prev.selectedAddonIds.filter((id) => id !== addonId)
          : [...prev.selectedAddonIds, addonId],
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError('Addon category name is required.');
      return;
    }
    if (form.selectedAddonIds.length === 0) {
      setError('Select at least one addon to include in this category.');
      return;
    }
    setError(null);
    await onSubmit({
      name,
      addonIds: form.selectedAddonIds,
    });
  };

  const selectedCount = form.selectedAddonIds.length;

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!submitting) {
          onClose();
        }
      }}
      title={dialogTitle}
      description="Group related add-ons together so you can market curated bundles or quickly attach them to offers."
      size="xl"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              if (!submitting) {
                onClose();
              }
            }}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-60"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="addon-category-dialog"
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? 'Saving…' : dialogActionLabel}
          </button>
        </div>
      }
    >
      <form id="addon-category-dialog" onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Enter addon category name"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Add-ons *</label>
            {addons.length === 0 ? (
              <div className="mt-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                No add-ons are available yet. Mark food items as add-ons to link them here.
              </div>
            ) : (
              <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-slate-200">
                <ul className="divide-y divide-slate-200">
                  {addons.map((addon) => {
                    const checked = form.selectedAddonIds.includes(addon.id);
                    return (
                      <li key={addon.id}>
                        <label className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-slate-50">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                            checked={checked}
                            onChange={() => toggleAddonSelection(addon.id)}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900">{addon.name}</p>
                            <p className="text-xs text-slate-500">
                              {addon.mealType} · {addon.category} · {addon.coins ?? 0} coins
                            </p>
                            {addon.addonDescription ? (
                              <p className="mt-1 text-xs text-slate-500 truncate">{addon.addonDescription}</p>
                            ) : null}
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <p className="mt-2 text-xs text-slate-500">Currently selected: {selectedCount}.</p>
          </div>
        </div>

        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      </form>
    </Dialog>
  );
};

export default AddonCategoryDialog;
