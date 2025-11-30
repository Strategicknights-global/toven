import React, { useEffect, useMemo, useState } from 'react';
import Dialog from './Dialog';
import { PRODUCT_UNITS, type ProductUnit } from '../schemas/ProductSchema';
import { useProductsStore } from '../stores/productsStore';
import { useToastStore } from '../stores/toastStore';
import { getNumericInputModeForUnit, getNumericStepForUnit } from '../utils/productUnits';

interface AddProductDialogProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_UNIT: ProductUnit = PRODUCT_UNITS[0];

const AddProductDialog: React.FC<AddProductDialogProps> = ({ open, onClose }) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<ProductUnit>(DEFAULT_UNIT);

  const createProduct = useProductsStore((state) => state.createProduct);
  const creating = useProductsStore((state) => state.creating);
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    if (!open) {
      setName('');
      setQuantity('');
      setUnit(DEFAULT_UNIT);
    }
  }, [open]);

  const unitOptions = useMemo(() => PRODUCT_UNITS, []);

  const handleClose = () => {
    if (creating) return;
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      addToast('Product name is required.', 'error');
      return;
    }

    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      addToast('Quantity must be a non-negative number.', 'error');
      return;
    }

    try {
      await createProduct({
        name: name.trim(),
        currentStock: parsedQuantity,
        unit,
      });
      addToast('Product added successfully.', 'success');
      onClose();
    } catch (error) {
      // Error toast handled in store; additional logging optional
      console.error('Failed to create product', error);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Add Product"
      description="Create a new product record to track inventory levels."
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-60"
            disabled={creating}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-product-form"
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
            disabled={creating}
          >
            {creating ? 'Saving…' : 'Save Product'}
          </button>
        </div>
      }
    >
      <form id="add-product-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          <label className="text-sm font-medium text-slate-700">
            Product Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g., Basmati Rice"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Quantity
              <input
                type="number"
                min="0"
                step={getNumericStepForUnit(unit)}
                inputMode={getNumericInputModeForUnit(unit)}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="e.g., 25"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Unit
              <select
                value={unit}
                onChange={(event) => setUnit(event.target.value as ProductUnit)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {unitOptions.map((option) => (
                  <option key={option} value={option}>
                    {option.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </form>
    </Dialog>
  );
};

export default AddProductDialog;
