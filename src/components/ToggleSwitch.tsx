import { forwardRef } from 'react';

type ToggleSwitchProps = {
	id?: string;
	checked: boolean;
	onChange: (nextValue: boolean) => void;
	disabled?: boolean;
	onLabel?: string;
	offLabel?: string;
	className?: string;
	ariaLabel?: string;
	ariaLabelledBy?: string;
	ariaDescribedBy?: string;
};

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const ToggleSwitch = forwardRef<HTMLButtonElement, ToggleSwitchProps>(({ 
	id,
	checked,
	onChange,
	disabled = false,
	onLabel = 'ON',
	offLabel = 'OFF',
	className,
	ariaLabel,
	ariaLabelledBy,
	ariaDescribedBy,
}, ref) => {
	const handleToggle = () => {
		if (disabled) return;
		onChange(!checked);
	};

	const baseClasses = cx(
		'relative inline-flex h-8 w-[72px] select-none items-center rounded-full border border-transparent px-1 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2',
		checked ? 'bg-[#8E43FD]' : 'bg-slate-200',
		disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:brightness-105',
		className,
	);

	const knobClasses = cx(
		'pointer-events-none absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200 ease-out',
	);

	const onLabelClasses = cx(
		'absolute left-3 text-[11px] font-semibold uppercase tracking-wider transition-opacity duration-150',
		checked ? 'opacity-100 text-white' : 'opacity-0',
	);

	const offLabelClasses = cx(
		'absolute right-3 text-[11px] font-semibold uppercase tracking-wider transition-opacity duration-150',
		checked ? 'opacity-0' : 'opacity-100 text-slate-600',
	);

	const ariaLabelToUse = ariaLabelledBy ? undefined : (ariaLabel ?? `Toggle ${checked ? onLabel : offLabel}`);

	return (
		<button
			id={id}
			type="button"
			role="switch"
			data-state={checked ? 'on' : 'off'}
			aria-checked={checked}
			aria-label={ariaLabelToUse}
			aria-labelledby={ariaLabelledBy}
			aria-describedby={ariaDescribedBy}
			disabled={disabled}
			onClick={handleToggle}
			ref={ref}
			className={baseClasses}
		>
			<span className={onLabelClasses} aria-hidden="true">{onLabel}</span>
			<span className={offLabelClasses} aria-hidden="true">{offLabel}</span>
			<span
				className={knobClasses}
				aria-hidden="true"
				style={{ transform: checked ? 'translateX(40px)' : 'translateX(0)' }}
			/>
		</button>
	);
});

ToggleSwitch.displayName = 'ToggleSwitch';

export default ToggleSwitch;
