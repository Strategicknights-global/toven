import React, { useEffect, useMemo, useRef, useState } from 'react';
import Dialog from './Dialog';

export interface CreateGeneralExpensePayload {
  description: string;
  amount: number;
  expenseDate: Date;
  invoiceImageBase64?: string | null;
}

interface CreateGeneralExpenseDialogProps {
  open: boolean;
  creating: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateGeneralExpensePayload) => Promise<boolean> | boolean;
}

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Unable to read file.'));
      }
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('Unable to read file.'));
    };
    reader.readAsDataURL(file);
  });

const todayAsInputValue = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const CreateGeneralExpenseDialog: React.FC<CreateGeneralExpenseDialogProps> = ({ open, creating, onClose, onSubmit }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dateValue, setDateValue] = useState(todayAsInputValue);
  const [invoiceImage, setInvoiceImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setDescription('');
      setAmount('');
      setDateValue(todayAsInputValue);
      setInvoiceImage(null);
      setUploading(false);
      setUploadError(null);
      setFormError(null);
    }
  }, [open]);

  const footer = useMemo(() => (
    <div className="flex justify-end gap-3">
      <button
        type="button"
        onClick={() => {
          if (!creating && !uploading) {
            onClose();
          }
        }}
        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-60"
        disabled={creating || uploading}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="create-general-expense-form"
        className="rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
        disabled={creating || uploading}
      >
        {creating ? 'Saving…' : 'Save Expense'}
      </button>
    </div>
  ), [creating, onClose, uploading]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setInvoiceImage(null);
      return;
    }
    setUploadError(null);
    const maxSize = 1.5 * 1024 * 1024; // 1.5 MB
    if (file.size > maxSize) {
      setUploadError('Choose an image smaller than 1.5MB.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file.');
      return;
    }

    setUploading(true);
    try {
      const base64 = await toBase64(file);
      setInvoiceImage(base64);
    } catch (error) {
      setUploadError((error as Error).message || 'Failed to load image.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      setFormError('Description is required.');
      return;
    }

    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setFormError('Enter a valid amount greater than 0.');
      amountRef.current?.focus();
      return;
    }

    if (!dateValue) {
      setFormError('Select the expense date.');
      return;
    }

    const expenseDate = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(expenseDate.getTime())) {
      setFormError('Date is invalid.');
      return;
    }

    if (uploading) {
      setFormError('Please wait for the image upload to finish.');
      return;
    }

    const payload: CreateGeneralExpensePayload = {
      description: trimmedDescription,
      amount: Math.round(amountNumber * 100) / 100,
      expenseDate,
      invoiceImageBase64: invoiceImage ?? undefined,
    };

    try {
      const result = await onSubmit(payload);
      if (result) {
        onClose();
      }
    } catch (error) {
      setFormError((error as Error).message || 'Failed to save expense.');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!creating && !uploading) {
          onClose();
        }
      }}
      title="Create General Expense"
      description="Record out-of-pocket or operational costs with optional invoice attachments."
      size="lg"
      footer={footer}
    >
      <form id="create-general-expense-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Expense date
            <input
              type="date"
              value={dateValue}
              onChange={(event) => setDateValue(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              required
              disabled={creating}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Amount (₹)
            <input
              ref={amountRef}
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              required
              disabled={creating}
            />
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="expense-description">
            Description
          </label>
          <textarea
            id="expense-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="e.g., Office supplies, kitchen restock" 
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            required
            disabled={creating}
          />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Invoice (optional)
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:rounded-md file:border-0 file:bg-purple-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-purple-600 hover:file:bg-purple-100"
              disabled={creating || uploading}
            />
          </label>
          {invoiceImage && (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <img src={invoiceImage} alt="Invoice preview" className="max-h-48 w-full object-contain" />
            </div>
          )}
          {uploadError && (
            <p className="text-sm text-red-600">{uploadError}</p>
          )}
        </div>

        {formError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {formError}
          </div>
        )}
      </form>
    </Dialog>
  );
};

export default CreateGeneralExpenseDialog;
