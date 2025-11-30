import React from 'react';
import Tooltip from './Tooltip';

type IconButtonVariant = 'neutral' | 'primary' | 'danger';

const variantClasses: Record<IconButtonVariant, string> = {
  neutral: 'text-slate-600 hover:bg-slate-100 focus:ring-slate-400',
  primary: 'text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500',
  danger: 'text-red-600 hover:bg-red-50 focus:ring-red-500',
};

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: React.ReactNode;
  variant?: IconButtonVariant;
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
}

const IconButton: React.FC<IconButtonProps> = ({
  label,
  icon,
  variant = 'neutral',
  tooltipSide = 'top',
  className = '',
  ...buttonProps
}) => {
  const classes = `${variantClasses[variant]} ${className}`.trim();

  const button = (
    <button
      type="button"
      {...buttonProps}
      className={`inline-flex items-center justify-center rounded-full p-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 disabled:opacity-60 ${classes}`.trim()}
      aria-label={label}
    >
      {icon}
    </button>
  );

  return <Tooltip label={label} side={tooltipSide}>{button}</Tooltip>;
};

export default IconButton;
