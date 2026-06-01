import { motion } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

export default function ConfirmModal({ title, message, onConfirm, onCancel, loading, isDark, danger = true }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.5)' }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={clsx('w-full max-w-sm rounded-2xl border p-6 shadow-2xl', isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100')}
      >
        <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center mb-4', danger ? 'bg-red-100 dark:bg-red-500/10' : 'bg-amber-100 dark:bg-amber-500/10')}>
          <AlertTriangle className={clsx('w-6 h-6', danger ? 'text-red-500' : 'text-amber-500')} />
        </div>
        <h3 className={clsx('font-bold text-lg mb-2', isDark ? 'text-white' : 'text-dark-900')}>{title}</h3>
        <p className={clsx('text-sm mb-6', isDark ? 'text-dark-400' : 'text-gray-500')}>{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className={clsx('flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors', isDark ? 'border border-dark-700 text-dark-300 hover:bg-dark-800' : 'border border-gray-200 text-gray-600 hover:bg-gray-50')}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={clsx('flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2', danger ? 'bg-red-500 hover:bg-red-600' : 'bg-primary-500 hover:bg-primary-600')}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
