import React from 'react';
import { clsx } from 'clsx';

/**
 * Card — base container with optional glass variant and hover lift.
 * Use `glass` prop for glassmorphic panels over map backgrounds.
 */
export default function Card({
  children,
  className,
  glass = false,
  hover = false,
  padding = true,
  onClick,
  ...props
}) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-2xl border transition-all duration-200',
        glass
          ? 'bg-white/70 backdrop-blur-md border-white/50 shadow-xl'
          : 'bg-white border-terra-border shadow-sm',
        hover && 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
        padding && 'p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Card sub-components for consistent internal structure.
 */
Card.Header = function CardHeader({ children, className }) {
  return (
    <div className={clsx('flex items-center justify-between mb-4', className)}>
      {children}
    </div>
  );
};

Card.Title = function CardTitle({ children, className }) {
  return (
    <h3 className={clsx('text-base font-semibold text-terra-heading', className)}>
      {children}
    </h3>
  );
};

Card.Body = function CardBody({ children, className }) {
  return <div className={clsx('', className)}>{children}</div>;
};

Card.Footer = function CardFooter({ children, className }) {
  return (
    <div className={clsx('mt-4 pt-4 border-t border-terra-border', className)}>
      {children}
    </div>
  );
};
