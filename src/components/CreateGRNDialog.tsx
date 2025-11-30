import React, { useEffect, useMemo, useState } from 'react';
import Dialog from './Dialog';
import type { ProductSchema } from '../schemas/ProductSchema';
import type { UserSchema } from '../schemas/UserSchema';
import { getNumericInputModeForUnit, getNumericStepForUnit } from '../utils/productUnits';

export interface CreateGrnPayload {
  productId: string;
  productName: string;
  productUnit?: string;
  quantity: number;
  purchaseDate: Date;
  receivedById: string;
  receivedByName: string;
  totalPrice: number;
  invoiceImageBase64?: string | null;
  notes?: string | null;
}

interface CreateGrnDialogProps {
  open: boolean;
  creating: boolean;
  products: ProductSchema[];
  chefs: UserSchema[];
  onClose: () => void;
  onSubmit: (payload: CreateGrnPayload) => Promise<boolean> | boolean;
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

const CreateGRNDialog: React.FC<CreateGrnDialogProps> = ({ open, creating, products, chefs, onClose, onSubmit }) => {
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(todayAsInputValue);
  const [receivedById, setReceivedById] = useState('');
  const [notes, setNotes] = useState('');
  const [invoiceImage, setInvoiceImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setProductId(products[0]?.id ?? '');
      setQuantity('');
      setTotalPrice('');
      setPurchaseDate(todayAsInputValue);
      const defaultChef = chefs.find((chef) => chef.id);
      setReceivedById(defaultChef?.id ?? '');
      setNotes('');
      setInvoiceImage(null);
      setUploading(false);
      setUploadError(null);
      setFormError(null);
    }
  }, [open, products, chefs]);

  const productOptions = useMemo(() => products.filter((product): product is ProductSchema & { id: string } => Boolean(product.id)), [products]);
  const chefOptions = useMemo(() => chefs.filter((chef): chef is UserSchema & { id: string } => Boolean(chef.id)), [chefs]);

  const selectedProduct = productOptions.find((product) => product.id === productId);
  const selectedChef = chefOptions.find((chef) => chef.id === receivedById);

  const footer = useMemo(() => (
    <div className="flex justify-end gap-3">
      <button
        type="button"
        onClick={() => {
          if (!creating && !uploading) {
            onClose();
          }
        }}
        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-60"
        disabled={creating || uploading}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="create-grn-form"
        className="rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
        disabled={creating || uploading}
      >
        {creating ? 'Saving…' : 'Create GRN'}
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
    const maxSize = 2 * 1024 * 1024; // 2 MB
    if (file.size > maxSize) {
      setUploadError('Choose an image smaller than 2MB.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload a valid image file.');
      return;
    }

    setUploading(true);
    try {
      const base64 = await toBase64(file);
      setInvoiceImage(base64);
    } catch (error) {
      setUploadError((error as Error).message || 'Failed to load invoice image.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!selectedProduct) {
      setFormError('Select a product.');
      return;
    }

    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setFormError('Enter a valid quantity greater than 0.');
      return;
    }

    const parsedTotalPrice = Number(totalPrice);
    if (!Number.isFinite(parsedTotalPrice) || parsedTotalPrice <= 0) {
      setFormError('Enter the total price.');
      return;
    }

    if (!selectedChef) {
      setFormError('Select who received the goods.');
      return;
    }

    if (!purchaseDate) {
      setFormError('Choose the purchase date.');
      return;
    }

    const purchaseDateObj = new Date(`${purchaseDate}T00:00:00`);
    if (Number.isNaN(purchaseDateObj.getTime())) {
      setFormError('Purchase date is invalid.');
      return;
    }

    if (uploading) {
      setFormError('Please wait for the invoice upload to finish.');
      return;
    }

    const payload: CreateGrnPayload = {
      productId: selectedProduct.id!,
      productName: selectedProduct.name,
      productUnit: selectedProduct.unit,
      quantity: Math.round(parsedQuantity * 100) / 100,
      purchaseDate: purchaseDateObj,
      receivedById: selectedChef.id!,
      receivedByName: selectedChef.fullName ?? selectedChef.email ?? 'Unknown',
      totalPrice: Math.round(parsedTotalPrice * 100) / 100,
      invoiceImageBase64: invoiceImage ?? undefined,
      notes: notes.trim().length > 0 ? notes.trim() : undefined,
    };

    try {
      const result = await onSubmit(payload);
      if (result) {
        onClose();
      }
    } catch (error) {
      setFormError((error as Error).message || 'Failed to save GRN.');
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
      title="Create Goods Received Note"
      description="Capture the details of received inventory along with invoice evidence."
      size="xl"
      footer={footer}
    >
      <form id="create-grn-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Product
            <select
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              disabled={creating}
              required
            >
              {productOptions.length === 0 && <option value="">No products available</option>}
              {productOptions.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Purchase date
            <input
              type="date"
              value={purchaseDate}
              onChange={(event) => setPurchaseDate(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              disabled={creating}
              required
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium text-slate-700">
            Quantity
            <input
              type="number"
              min="0"
              step={getNumericStepForUnit(selectedProduct?.unit)}
              inputMode={getNumericInputModeForUnit(selectedProduct?.unit)}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="0"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              disabled={creating}
              required
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Unit
            <input
              type="text"
              value={selectedProduct?.unit?.toUpperCase() ?? '—'}
              readOnly
              className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Total price (₹)
            <input
              type="number"
              min="0"
              step="0.01"
              value={totalPrice}
              onChange={(event) => setTotalPrice(event.target.value)}
              placeholder="0.00"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              disabled={creating}
              required
            />
          </label>
        </div>

        <label className="text-sm font-medium text-slate-700">
          Received by
          <select
            value={receivedById}
            onChange={(event) => setReceivedById(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            disabled={creating}
            required
          >
            {chefOptions.length === 0 && <option value="">No chefs found</option>}
            {chefOptions.map((chef) => (
              <option key={chef.id} value={chef.id}>
                {chef.fullName || chef.email || 'Unnamed Chef'}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Notes <span className="text-slate-400">(optional)</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Batch info, supplier reference, or quality remarks"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              disabled={creating}
            />
          </label>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Upload invoice image
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:rounded-md file:border-0 file:bg-purple-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-purple-600 hover:file:bg-purple-100"
              disabled={creating || uploading}
              required
            />
          </label>
          {invoiceImage && (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <img src={invoiceImage} alt="Invoice preview" className="max-h-60 w-full object-contain" />
            </div>
          )}
          {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
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

export default CreateGRNDialog;
