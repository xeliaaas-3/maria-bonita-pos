// ============================================
// EMPTY STATE Component
// ============================================

import { clsx } from 'clsx';

export default function EmptyState({ icon: Icon, title, description, action, isDark }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className={clsx('w-16 h-16 rounded-2xl flex items-center justify-center', isDark ? 'bg-dark-800' : 'bg-gray-100')}>
        <Icon className={clsx('w-8 h-8', isDark ? 'text-dark-600' : 'text-gray-300')} />
      </div>
      <div className="text-center">
        <p className={clsx('font-semibold', isDark ? 'text-white' : 'text-dark-900')}>{title}</p>
        {description && (
          <p className={clsx('text-sm mt-1', isDark ? 'text-dark-400' : 'text-gray-500')}>{description}</p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
