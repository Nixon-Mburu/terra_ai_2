import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

/**
 * Loader — flexible loading indicator.
 * Variants: 'spinner' | 'dots' | 'bar'
 * Can be used inline or as a full-screen overlay.
 */

function Spinner({ size = 'md', color = 'emerald' }) {
  const SIZE = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12', xl: 'w-16 h-16' };
  const COLOR = {
    emerald: 'border-emerald-500',
    indigo:  'border-indigo-500',
    white:   'border-white',
    slate:   'border-slate-400',
  };

  return (
    <div
      className={clsx(
        'rounded-full border-2 border-t-transparent animate-spin',
        SIZE[size],
        COLOR[color]
      )}
    />
  );
}

function Dots() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-emerald-500"
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </div>
  );
}

function Bar({ progress }) {
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: progress != null ? `${progress}%` : '100%' }}
        transition={
          progress != null
            ? { duration: 0.4 }
            : { duration: 1.4, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }
        }
      />
    </div>
  );
}

/**
 * Main Loader component.
 */
export default function Loader({
  variant = 'spinner',
  size = 'md',
  color = 'emerald',
  progress,
  label,
  overlay = false,
  className,
}) {
  const inner = (
    <div className={clsx('flex flex-col items-center justify-center gap-3', className)}>
      {variant === 'spinner' && <Spinner size={size} color={color} />}
      {variant === 'dots'    && <Dots />}
      {variant === 'bar'     && <Bar progress={progress} />}
      {label && (
        <p className="text-sm text-terra-body font-medium text-center animate-pulse">
          {label}
        </p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm"
      >
        {inner}
      </motion.div>
    );
  }

  return inner;
}

// Named exports for convenience
export { Spinner, Dots, Bar as ProgressBar };
