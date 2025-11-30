import React from 'react';
import { createPortal } from 'react-dom';

export interface TooltipProps {
	label: React.ReactNode;
	delay?: number; // ms
	children: React.ReactElement;
	side?: 'top' | 'right' | 'bottom' | 'left';
	offset?: number;
	className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
	label,
	children,
	delay = 350,
	side = 'top',
	offset = 8,
	className = '',
}) => {
	const [open, setOpen] = React.useState(false);
	const [coords, setCoords] = React.useState<{ x: number; y: number } | null>(null);
	const timerRef = React.useRef<number | null>(null);
	const ref = React.useRef<HTMLElement | null>(null);

	const clearTimer = () => {
		if (timerRef.current) {
			window.clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	};

	const show = () => {
		clearTimer();
		timerRef.current = window.setTimeout(() => {
			if (!ref.current) return;
			const r = ref.current.getBoundingClientRect();
			let x = r.left + r.width / 2;
			let y = r.top;
			if (side === 'bottom') y = r.bottom;
			if (side === 'top') y = r.top;
			if (side === 'left') x = r.left; else if (side === 'right') x = r.right;
			setCoords({ x, y });
			setOpen(true);
		}, delay);
	};

	const hide = () => {
		clearTimer();
		setOpen(false);
	};

		const child = React.cloneElement(children as React.ReactElement<any>, {
			ref: (node: HTMLElement) => {
				ref.current = node;
				const childRef: any = (children as any).ref;
				if (typeof childRef === 'function') childRef(node);
				else if (childRef && typeof childRef === 'object') childRef.current = node;
			},
			onMouseEnter: (e: React.MouseEvent) => { (children as any).props?.onMouseEnter?.(e); show(); },
			onMouseLeave: (e: React.MouseEvent) => { (children as any).props?.onMouseLeave?.(e); hide(); },
			onFocus: (e: React.FocusEvent) => { (children as any).props?.onFocus?.(e); show(); },
			onBlur: (e: React.FocusEvent) => { (children as any).props?.onBlur?.(e); hide(); },
		});

	const tooltip = open && coords ? (
		<div
			role="tooltip"
			className={`pointer-events-none fixed z-50 -translate-x-1/2 select-none rounded-md bg-slate-800/95 px-2 py-1 text-[11px] font-medium text-white shadow-lg backdrop-blur-sm ${className}`}
			style={{ left: coords.x, top: side === 'top' ? coords.y - offset : side === 'bottom' ? coords.y + offset : coords.y, transform: 'translateX(-50%)' }}
		>
			{label}
		</div>
	) : null;

	return <>
		{child}
		{open && tooltip && createPortal(tooltip, document.body)}
	</>;
};

export default Tooltip;

