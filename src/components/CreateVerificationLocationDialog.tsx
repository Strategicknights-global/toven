import React, { useEffect, useRef, useState } from 'react';
import Dialog from './Dialog';

interface CreateVerificationLocationDialogProps {
  open: boolean;
  creating: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void> | void;
}

const CreateVerificationLocationDialog: React.FC<CreateVerificationLocationDialogProps> = ({
  open,
  creating,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setName('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Verification location name is required');
      inputRef.current?.focus();
      return;
    }
    try {
      await onSubmit(trimmed);
    } catch (err) {
      setError((err as Error).message || 'Failed to create verification location');
    }
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
        form="create-location-form"
        className="inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
        disabled={creating}
      >
    {creating ? 'Saving…' : 'Create Verification Location'}
      </button>
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={() => { if (!creating) onClose(); }}
    title="Create Verification Location"
    description="Add a new verification location for your team."
      size="sm"
      initialFocus={inputRef as React.RefObject<HTMLElement>}
      footer={footer}
    >
      <form id="create-location-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="location-name" className="text-sm font-medium text-slate-700">
            Verification location name
          </label>
          <input
            id="location-name"
            ref={inputRef}
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Indira Nagar Hub"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400/60"
            disabled={creating}
            required
          />
        </div>
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </form>
    </Dialog>
  );
};

export default CreateVerificationLocationDialog;
