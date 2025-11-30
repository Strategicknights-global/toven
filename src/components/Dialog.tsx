import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  maxHeight?: string; // e.g. '80vh'
  initialFocus?: React.RefObject<HTMLElement>;
  hideCloseButton?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  xxl: 'max-w-4xl'
};

export const Dialog: React.FC<React.PropsWithChildren<DialogProps>> = ({
  open,
  onClose,
  title,
  description,
  footer,
  size = 'lg',
  maxHeight = 'calc(100vh - 3rem)',
  initialFocus,
  hideCloseButton = false,
  className = '',
  children
}) => {
  const internalRef = useRef<HTMLDivElement | null>(null);

  // Focus management
  useEffect(() => {
    if (open) {
      const el = initialFocus?.current || internalRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]');
      el?.focus();
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prevOverflow; };
    }
  }, [open, initialFocus]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1200]">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 overflow-y-auto p-4 sm:p-6 flex items-center justify-center">
        <div
          ref={internalRef}
          role="dialog"
          aria-modal="true"
          className={`relative w-full ${sizeMap[size]} ${className}`}
          style={{ maxHeight }}
        >
          <div className="relative w-full bg-white border border-slate-200 shadow-xl rounded-xl flex flex-col max-h-full overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0">
              <div>
                {title && <h2 className="text-lg font-semibold text-slate-900">{title}</h2>}
                {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
              </div>
              {!hideCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
              )}
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1">
              {children}
            </div>
            {footer && (
              <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl shrink-0">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Dialog;
