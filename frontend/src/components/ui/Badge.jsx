// ============================================
// BADGE Component
// ============================================

import { clsx } from 'clsx';

const VARIANTS = {
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  primary: 'bg-primary-100 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  gray: 'bg-gray-100 text-gray-700 dark:bg-dark-800 dark:text-dark-300',
};

const SIZES = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-sm px-3 py-1.5'
};

export default function Badge({ variant = 'gray', size = 'md', children, className }) {
  return (
    <span className={clsx(
      'inline-flex items-center font-semibold rounded-full',
      VARIANTS[variant],
      SIZES[size],
      className
    )}>
      {children}
    </span>
  );
}
