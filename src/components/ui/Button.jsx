import React from 'react';
import { clsx } from 'clsx';

/**
 * Button — Terra AI atomic button component.
 * Variants: 'primary' | 'secondary' | 'ghost' | 'danger'
 * Sizes: 'sm' | 'md' | 'lg'
 */
const VARIANTS = {
  primary: [
    'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white',
    'hover:from-emerald-600 hover:to-emerald-700',
    'shadow-lg shadow-emerald-500/25',
    'disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none',
  ],
  secondary: [
    'bg-white text-terra-heading border border-terra-border',
    'hover:bg-slate-50',
    'shadow-sm',
    'disabled:text-terra-muted disabled:bg-slate-50',
  ],
  ghost: [
    'bg-transparent text-terra-body',
    'hover:bg-slate-100 hover:text-terra-heading',
    'disabled:text-terra-muted',
  ],
  indigo: [
    'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white',
    'hover:from-indigo-600 hover:to-indigo-700',
    'shadow-lg shadow-indigo-500/25',
    'disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none',
  ],
  danger: [
    'bg-red-500 text-white',
    'hover:bg-red-600',
    'shadow-sm',
    'disabled:bg-slate-300',
  ],
};

const SIZES = {
  sm: 'text-xs px-3.5 py-2 gap-1.5 rounded-lg',
  md: 'text-sm px-5 py-2.5 gap-2 rounded-xl',
  lg: 'text-base px-7 py-3.5 gap-2.5 rounded-xl',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  type = 'button',
  className,
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={clsx(
        'inline-flex items-center justify-center font-semibold',
        'transition-all duration-200 active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
        'cursor-pointer disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      ) : Icon ? (
        <Icon className="w-4 h-4 flex-shrink-0" />
      ) : null}
      {children}
      {IconRight && !loading && <IconRight className="w-4 h-4 flex-shrink-0" />}
    </button>
  );
}
