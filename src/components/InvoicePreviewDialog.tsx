import React from 'react';
import Dialog from './Dialog';

interface InvoicePreviewDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  imageSrc?: string | null;
  onClose: () => void;
  meta?: React.ReactNode;
}

const InvoicePreviewDialog: React.FC<InvoicePreviewDialogProps> = ({ open, title = 'Invoice Preview', description, imageSrc, onClose, meta }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="lg"
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {meta}
        {imageSrc ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <img src={imageSrc} alt="Invoice" className="max-h-[480px] w-full object-contain" />
          </div>
        ) : (
          <p className="text-sm text-slate-500">No invoice image attached.</p>
        )}
      </div>
    </Dialog>
  );
};

export default InvoicePreviewDialog;
