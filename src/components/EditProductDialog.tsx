import React, { useEffect, useMemo, useState } from 'react';
import Dialog from './Dialog';
import type { ProductSchema, ProductUnit } from '../schemas/ProductSchema';
import { PRODUCT_UNITS } from '../schemas/ProductSchema';
import { useProductsStore } from '../stores/productsStore';
import { useToastStore } from '../stores/toastStore';
import { getNumericInputModeForUnit, getNumericStepForUnit } from '../utils/productUnits';

interface EditProductDialogProps {
  open: boolean;
  product: ProductSchema | null;
  onClose: () => void;
}

const EditProductDialog: React.FC<EditProductDialogProps> = ({ open, product, onClose }) => {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<ProductUnit>(PRODUCT_UNITS[0]);
  const [currentStock, setCurrentStock] = useState('');

  const updateProduct = useProductsStore((state) => state.updateProduct);
  const updating = useProductsStore((state) => state.updating);
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    if (open && product) {
      setName(product.name ?? '');
      setUnit(product.unit ?? PRODUCT_UNITS[0]);
      setCurrentStock(product.currentStock?.toString() ?? '0');
    }
  }, [open, product]);

  useEffect(() => {
    if (!open) {
      setName('');
      setUnit(PRODUCT_UNITS[0]);
      setCurrentStock('');
    }
  }, [open]);

  const unitOptions = useMemo(() => PRODUCT_UNITS, []);

  const handleClose = () => {
    if (updating) return;
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!product?.id) {
      addToast('Unable to identify the product to update.', 'error');
      return;
    }

    if (!name.trim()) {
      addToast('Product name is required.', 'error');
      return;
    }

    const parsedStock = Number(currentStock);
    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      addToast('Current stock must be a non-negative number.', 'error');
      return;
    }

    try {
      await updateProduct(product.id, {
        name: name.trim(),
        unit,
        currentStock: parsedStock,
      });
      addToast('Product updated successfully.', 'success');
      onClose();
    } catch (error) {
      console.error('Failed to update product', error);
    }
  };

  if (!product) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Edit product"
      description={`Update details for ${product.name}.`}
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-60"
            disabled={updating}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-product-form"
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
            disabled={updating}
          >
            {updating ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      }
    >
      <form id="edit-product-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          <label className="text-sm font-medium text-slate-700">
            Product Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Product name"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Current stock
              <input
                type="number"
                min="0"
                step={getNumericStepForUnit(unit)}
                inputMode={getNumericInputModeForUnit(unit)}
                value={currentStock}
                onChange={(event) => setCurrentStock(event.target.value)}
                placeholder="0"
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

export default EditProductDialog;
