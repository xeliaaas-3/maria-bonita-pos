// ============================================
// MODAL DE PAGO
// ============================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Banknote, CreditCard, Smartphone, QrCode, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { clsx } from 'clsx';

const PAYMENT_METHODS = [
  { id: 'EFECTIVO', label: 'Efectivo', icon: Banknote, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  { id: 'TARJETA', label: 'Tarjeta', icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  { id: 'TRANSFERENCIA', label: 'Transferencia', icon: Smartphone, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10' },
  { id: 'QR', label: 'QR', icon: QrCode, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
];

export default function PaymentModal({ total, onPay, onClose, loading, isDark }) {
  const [payments, setPayments] = useState([{ method: 'EFECTIVO', amount: total, reference: '' }]);

  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const change = totalPaid - total;
  const isPaid = totalPaid >= total;

  const addPayment = () => {
    setPayments(p => [...p, { method: 'EFECTIVO', amount: total - totalPaid, reference: '' }]);
  };

  const updatePayment = (idx, field, value) => {
    setPayments(p => p.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const removePayment = (idx) => {
    setPayments(p => p.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if (!isPaid) return;
    onPay(payments.map(p => ({ method: p.method, amount: Number(p.amount), reference: p.reference })));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.5)' }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={clsx(
          'w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden',
          isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100'
        )}
      >
        {/* Header */}
        <div className={clsx('flex items-center justify-between p-5 border-b', isDark ? 'border-dark-800' : 'border-gray-100')}>
          <div>
            <h2 className={clsx('font-bold text-lg', isDark ? 'text-white' : 'text-dark-900')}>
              Procesar Pago
            </h2>
            <p className="text-2xl font-mono font-bold text-primary-500 mt-0.5">
              {formatCurrency(total)}
            </p>
          </div>
          <button onClick={onClose} className={clsx('p-2 rounded-xl', isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Payments */}
        <div className="p-5 space-y-4 max-h-96 overflow-y-auto">
          {payments.map((payment, idx) => (
            <div key={idx} className={clsx('rounded-xl border p-4', isDark ? 'border-dark-800 bg-dark-800/50' : 'border-gray-100 bg-gray-50')}>
              {/* Method selector */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => updatePayment(idx, 'method', m.id)}
                    className={clsx(
                      'flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all',
                      payment.method === m.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                        : isDark ? 'border-dark-700 hover:border-dark-600' : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <m.icon className={clsx('w-4 h-4', payment.method === m.id ? 'text-primary-500' : m.color)} />
                    <span className={clsx('text-[10px] font-medium', payment.method === m.id ? 'text-primary-500' : isDark ? 'text-dark-400' : 'text-gray-500')}>
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className={clsx('text-xs font-medium', isDark ? 'text-dark-400' : 'text-gray-500')}>Monto</label>
                  <input
                    type="number"
                    value={payment.amount}
                    onChange={e => updatePayment(idx, 'amount', e.target.value)}
                    className={clsx(
                      'w-full mt-1 px-3 py-2 rounded-lg text-sm font-mono outline-none border',
                      isDark ? 'bg-dark-800 border-dark-700 text-white' : 'bg-white border-gray-200 text-dark-900'
                    )}
                  />
                </div>
                {payment.method !== 'EFECTIVO' && (
                  <div className="flex-1">
                    <label className={clsx('text-xs font-medium', isDark ? 'text-dark-400' : 'text-gray-500')}>Referencia</label>
                    <input
                      type="text"
                      value={payment.reference}
                      onChange={e => updatePayment(idx, 'reference', e.target.value)}
                      placeholder="Nro. operación"
                      className={clsx(
                        'w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none border',
                        isDark ? 'bg-dark-800 border-dark-700 text-white placeholder:text-dark-600' : 'bg-white border-gray-200 text-dark-900 placeholder:text-gray-400'
                      )}
                    />
                  </div>
                )}
                {payments.length > 1 && (
                  <button
                    onClick={() => removePayment(idx)}
                    className="self-end p-2 text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {totalPaid < total && (
            <button
              onClick={addPayment}
              className={clsx(
                'w-full py-2 rounded-xl border-2 border-dashed text-sm font-medium flex items-center justify-center gap-2 transition-colors',
                isDark ? 'border-dark-700 text-dark-400 hover:border-primary-500 hover:text-primary-400' : 'border-gray-200 text-gray-400 hover:border-primary-400 hover:text-primary-500'
              )}
            >
              <Plus className="w-4 h-4" />
              Agregar otro método de pago
            </button>
          )}
        </div>

        {/* Summary */}
        <div className={clsx('px-5 pb-5 space-y-3 border-t pt-4', isDark ? 'border-dark-800' : 'border-gray-100')}>
          <div className={clsx('rounded-xl p-4 space-y-2', isDark ? 'bg-dark-800' : 'bg-gray-50')}>
            <div className="flex justify-between text-sm">
              <span className={isDark ? 'text-dark-400' : 'text-gray-500'}>Total a pagar</span>
              <span className={clsx('font-mono font-semibold', isDark ? 'text-white' : 'text-dark-900')}>{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className={isDark ? 'text-dark-400' : 'text-gray-500'}>Monto recibido</span>
              <span className={clsx('font-mono font-semibold', isDark ? 'text-white' : 'text-dark-900')}>{formatCurrency(totalPaid)}</span>
            </div>
            {change >= 0 && totalPaid >= total && (
              <div className={clsx('flex justify-between text-base font-bold border-t pt-2', isDark ? 'border-dark-700' : 'border-gray-200')}>
                <span className="text-emerald-500">Vuelto</span>
                <span className="text-emerald-500 font-mono">{formatCurrency(change)}</span>
              </div>
            )}
            {totalPaid < total && (
              <div className={clsx('flex justify-between text-sm border-t pt-2', isDark ? 'border-dark-700' : 'border-gray-200')}>
                <span className="text-red-500">Falta</span>
                <span className="text-red-500 font-mono">{formatCurrency(total - totalPaid)}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!isPaid || loading}
            className={clsx(
              'w-full py-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2',
              isPaid
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-dark-800 dark:text-dark-600'
            )}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Confirmar Venta
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
