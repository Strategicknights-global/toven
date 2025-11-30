import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface ConfirmDialogProps {
	open: boolean;
	title?: string;
	description?: React.ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	onConfirm: () => void | Promise<void>;
	onCancel: () => void;
	variant?: 'default' | 'danger';
	loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
	open,
	title = 'Confirm',
	description,
	confirmLabel = 'Confirm',
	cancelLabel = 'Cancel',
	onConfirm,
	onCancel,
	variant = 'default',
	loading = false,
}) => {
	if (!open) return null;
	const confirmClasses = variant === 'danger'
		? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
		: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500';

	// Focus the first button when dialog opens for accessibility.
	const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
	useEffect(() => {
		cancelBtnRef.current?.focus();
	}, []);

	return createPortal(
		// Extra wrapper ensures we are at the top stacking context; z-[1000] to beat most sidebars.
		<div className="fixed inset-0 z-[1000]">
			<div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onCancel} />
			<div
				className="pointer-events-none absolute inset-0 flex items-center justify-center p-4"
				aria-modal="true"
				role="dialog"
				aria-labelledby="confirm-dialog-title"
				aria-describedby={description ? 'confirm-dialog-description' : undefined}
			>
				<div className="pointer-events-auto relative w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl animate-scaleIn">
					<h3 id="confirm-dialog-title" className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
					{description && <div id="confirm-dialog-description" className="text-sm text-slate-600 mb-4">{description}</div>}
					<div className="flex justify-end gap-3">
						<button
							ref={cancelBtnRef}
							type="button"
							onClick={onCancel}
							className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
							disabled={loading}
						>
							{cancelLabel}
						</button>
						<button
							type="button"
							onClick={() => { void onConfirm(); }}
							className={`rounded-md px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 ${confirmClasses} disabled:opacity-60`}
							disabled={loading}
						>
							{loading ? 'Please wait…' : confirmLabel}
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body
	);
};

export default ConfirmDialog;

