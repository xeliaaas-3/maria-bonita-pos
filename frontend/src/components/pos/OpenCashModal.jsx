// ============================================
// OPEN CASH MODAL
// ============================================

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Unlock, X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { clsx } from 'clsx';

export default function OpenCashModal({ onClose, isDark }) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');

  const openMutation = useMutation({
    mutationFn: (data) => api.post('/cash/open', data),
    onSuccess: () => {
      toast.success('¡Caja abierta! Listo para vender.');
      queryClient.invalidateQueries(['cash-session-active']);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al abrir caja')
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.5)' }}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className={clsx('w-full max-w-sm rounded-2xl border p-6 shadow-2xl', isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100')}>
        <div className="flex items-center justify-between mb-5">
          <h3 className={clsx('font-bold text-lg', isDark ? 'text-white' : 'text-dark-900')}>Abrir Caja</h3>
          <button onClick={onClose} className={clsx('p-1.5 rounded-lg', isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700')}>
              Fondo inicial (₲)
            </label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Ej: 500,000"
              className={clsx('w-full px-4 py-3 rounded-xl border text-lg font-mono outline-none', isDark ? 'bg-dark-800 border-dark-700 text-white' : 'bg-white border-gray-200 text-dark-900')}
              autoFocus
            />
          </div>

          {/* Quick amounts */}
          <div className="grid grid-cols-3 gap-2">
            {[100000, 200000, 500000].map(v => (
              <button key={v} onClick={() => setAmount(v.toString())} className={clsx('py-2 rounded-xl text-sm font-medium border transition-colors', isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
                ₲ {v.toLocaleString('es-PY')}
              </button>
            ))}
          </div>

          <button
            onClick={() => openMutation.mutate({ openingAmount: Number(amount), branchId: user?.branchId })}
            disabled={!amount || openMutation.isPending}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
          >
            {openMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Unlock className="w-5 h-5" /> Abrir Caja</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
