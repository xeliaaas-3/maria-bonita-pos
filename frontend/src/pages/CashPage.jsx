// ============================================
// CAJA PAGE
// ============================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Wallet, Lock, Unlock, Plus, Minus, ArrowUpRight,
  ArrowDownRight, Clock, TrendingUp, CheckCircle, AlertCircle,
  FileText, Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/services/api';
import { useThemeStore } from '@/store/theme.store';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { clsx } from 'clsx';

export default function CashPage() {
  const { isDark } = useThemeStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [openAmount, setOpenAmount] = useState('');
  const [closeAmount, setCloseAmount] = useState('');
  const [movementForm, setMovementForm] = useState({ type: 'INGRESO', amount: '', description: '' });
  const [showMovement, setShowMovement] = useState(false);

  const cardBase = isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100';

  const { data: session, isLoading } = useQuery({
    queryKey: ['cash-session-active'],
    queryFn: () => api.get('/cash/session/active').then(r => r.data.data),
    refetchInterval: 30000
  });

  const { data: history } = useQuery({
    queryKey: ['cash-history'],
    queryFn: () => api.get('/cash/sessions?limit=10').then(r => r.data.data)
  });

  const openMutation = useMutation({
    mutationFn: (data) => api.post('/cash/open', data),
    onSuccess: () => {
      toast.success('Caja abierta exitosamente');
      queryClient.invalidateQueries(['cash-session-active']);
      setOpenAmount('');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al abrir caja')
  });

  const closeMutation = useMutation({
    mutationFn: (data) => api.post('/cash/close', data),
    onSuccess: () => {
      toast.success('Caja cerrada exitosamente');
      queryClient.invalidateQueries(['cash-session-active']);
      queryClient.invalidateQueries(['cash-history']);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al cerrar caja')
  });

  const movementMutation = useMutation({
    mutationFn: (data) => api.post(`/cash/sessions/${session.id}/movement`, data),
    onSuccess: () => {
      toast.success('Movimiento registrado');
      queryClient.invalidateQueries(['cash-session-active']);
      setShowMovement(false);
      setMovementForm({ type: 'INGRESO', amount: '', description: '' });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className={clsx('text-2xl font-display font-bold', isDark ? 'text-white' : 'text-dark-900')}>
          Caja
        </h1>
        <p className={clsx('text-sm mt-0.5', isDark ? 'text-dark-400' : 'text-gray-500')}>
          Gestión de caja y movimientos de efectivo
        </p>
      </div>

      {/* Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={clsx('rounded-2xl border p-6', cardBase)}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center', session ? 'bg-emerald-100 dark:bg-emerald-500/10' : 'bg-red-100 dark:bg-red-500/10')}>
              {session ? (
                <Unlock className="w-6 h-6 text-emerald-500" />
              ) : (
                <Lock className="w-6 h-6 text-red-500" />
              )}
            </div>
            <div>
              <p className={clsx('font-bold text-lg', isDark ? 'text-white' : 'text-dark-900')}>
                Caja {session ? 'Abierta' : 'Cerrada'}
              </p>
              {session && (
                <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>
                  Abierta por {session.user?.name} · {formatDateTime(session.openedAt)}
                </p>
              )}
            </div>
          </div>

          <span className={clsx(
            'px-3 py-1 rounded-full text-xs font-bold',
            session ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
          )}>
            {session ? '● Activa' : '● Inactiva'}
          </span>
        </div>

        {session ? (
          <>
            {/* Session Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Fondo inicial', value: formatCurrency(session.openingAmount), icon: Wallet, color: 'text-blue-500' },
                { label: 'Ventas efectivo', value: formatCurrency(session.cashSales || 0), icon: TrendingUp, color: 'text-emerald-500' },
                { label: 'Ingresos', value: formatCurrency(session.totalIngreso || 0), icon: ArrowUpRight, color: 'text-violet-500' },
                { label: 'Egresos', value: formatCurrency(session.totalEgreso || 0), icon: ArrowDownRight, color: 'text-amber-500' },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className={clsx('rounded-xl p-3', isDark ? 'bg-dark-800' : 'bg-gray-50')}>
                    <Icon className={clsx('w-4 h-4 mb-1', stat.color)} />
                    <p className={clsx('text-sm font-bold font-mono', isDark ? 'text-white' : 'text-dark-900')}>
                      {stat.value}
                    </p>
                    <p className={clsx('text-[10px]', isDark ? 'text-dark-400' : 'text-gray-500')}>{stat.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowMovement(true)}
                className={clsx('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors', isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}
              >
                <Plus className="w-4 h-4" />
                Registrar Movimiento
              </button>

              <div className="flex items-center gap-2 ml-auto">
                <input
                  type="number"
                  value={closeAmount}
                  onChange={e => setCloseAmount(e.target.value)}
                  placeholder="Monto contado (₲)"
                  className={clsx('px-3 py-2.5 rounded-xl border text-sm outline-none w-48', isDark ? 'bg-dark-800 border-dark-700 text-white' : 'bg-white border-gray-200 text-dark-900')}
                />
                <button
                  onClick={() => closeMutation.mutate({ closingAmount: Number(closeAmount), sessionId: session.id })}
                  disabled={closeMutation.isPending || !closeAmount}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {closeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Cerrar Caja
                </button>
              </div>
            </div>

            {/* Movements */}
            {session.movements?.length > 0 && (
              <div className="mt-6">
                <p className={clsx('text-xs font-semibold mb-3', isDark ? 'text-dark-400' : 'text-gray-500')}>
                  MOVIMIENTOS DE ESTA SESIÓN
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {session.movements.map(mov => (
                    <div key={mov.id} className={clsx('flex items-center gap-3 px-3 py-2.5 rounded-xl', isDark ? 'bg-dark-800' : 'bg-gray-50')}>
                      <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', mov.type === 'INGRESO' ? 'bg-emerald-100' : 'bg-red-100')}>
                        {mov.type === 'INGRESO'
                          ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                          : <ArrowDownRight className="w-3.5 h-3.5 text-red-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={clsx('text-sm', isDark ? 'text-white' : 'text-dark-900')}>{mov.description || mov.type}</p>
                        <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>{formatDateTime(mov.createdAt)}</p>
                      </div>
                      <span className={clsx('font-mono text-sm font-semibold', mov.type === 'INGRESO' ? 'text-emerald-500' : 'text-red-500')}>
                        {mov.type === 'INGRESO' ? '+' : '-'}{formatCurrency(mov.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Open Cash Form */
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className={clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700')}>
                Fondo inicial (₲)
              </label>
              <input
                type="number"
                value={openAmount}
                onChange={e => setOpenAmount(e.target.value)}
                placeholder="Ej: 500000"
                className={clsx('w-full px-4 py-3 rounded-xl border text-sm outline-none', isDark ? 'bg-dark-800 border-dark-700 text-white' : 'bg-white border-gray-200 text-dark-900')}
              />
            </div>
            <button
              onClick={() => openMutation.mutate({ openingAmount: Number(openAmount), branchId: user.branchId })}
              disabled={openMutation.isPending || !openAmount}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors mt-6 disabled:opacity-60"
            >
              {openMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
              Abrir Caja
            </button>
          </div>
        )}
      </motion.div>

      {/* Movement Modal */}
      {showMovement && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.5)' }}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className={clsx('w-full max-w-sm rounded-2xl border p-6', isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100')}
          >
            <h3 className={clsx('font-bold text-lg mb-4', isDark ? 'text-white' : 'text-dark-900')}>
              Registrar Movimiento
            </h3>

            <div className="space-y-4">
              <div className="flex gap-2">
                {['INGRESO', 'EGRESO'].map(t => (
                  <button
                    key={t}
                    onClick={() => setMovementForm(f => ({ ...f, type: t }))}
                    className={clsx(
                      'flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all',
                      movementForm.type === t
                        ? t === 'INGRESO' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-red-500 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                        : isDark ? 'border-dark-700 text-dark-400' : 'border-gray-200 text-gray-500'
                    )}
                  >
                    {t === 'INGRESO' ? '+ Ingreso' : '- Egreso'}
                  </button>
                ))}
              </div>

              <div>
                <label className={clsx('block text-xs font-semibold mb-1', isDark ? 'text-dark-300' : 'text-dark-700')}>Monto (₲)</label>
                <input
                  type="number"
                  value={movementForm.amount}
                  onChange={e => setMovementForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                  className={clsx('w-full px-3 py-2.5 rounded-xl border text-sm outline-none', isDark ? 'bg-dark-800 border-dark-700 text-white' : 'bg-white border-gray-200')}
                />
              </div>

              <div>
                <label className={clsx('block text-xs font-semibold mb-1', isDark ? 'text-dark-300' : 'text-dark-700')}>Descripción</label>
                <input
                  value={movementForm.description}
                  onChange={e => setMovementForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Motivo del movimiento..."
                  className={clsx('w-full px-3 py-2.5 rounded-xl border text-sm outline-none', isDark ? 'bg-dark-800 border-dark-700 text-white placeholder:text-dark-600' : 'bg-white border-gray-200 placeholder:text-gray-400')}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowMovement(false)} className={clsx('flex-1 py-2.5 rounded-xl text-sm border', isDark ? 'border-dark-700 text-dark-300' : 'border-gray-200 text-gray-600')}>
                  Cancelar
                </button>
                <button
                  onClick={() => movementMutation.mutate(movementForm)}
                  disabled={!movementForm.amount || movementMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-60"
                >
                  Registrar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* History */}
      {history?.length > 0 && (
        <div className={clsx('rounded-2xl border', cardBase)}>
          <div className={clsx('flex items-center justify-between p-5 border-b', isDark ? 'border-dark-800' : 'border-gray-100')}>
            <h3 className={clsx('font-semibold', isDark ? 'text-white' : 'text-dark-900')}>
              Historial de Sesiones
            </h3>
            <FileText className={clsx('w-4 h-4', isDark ? 'text-dark-400' : 'text-gray-400')} />
          </div>
          <div className="divide-y divide-gray-100 dark:divide-dark-800">
            {history.map(sess => (
              <div key={sess.id} className={clsx('flex items-center gap-4 px-5 py-4', isDark ? 'hover:bg-dark-800/30' : 'hover:bg-gray-50/50')}>
                <div className={clsx('w-2 h-2 rounded-full', sess.closedAt ? 'bg-gray-400' : 'bg-emerald-500')} />
                <div className="flex-1">
                  <p className={clsx('text-sm font-medium', isDark ? 'text-white' : 'text-dark-900')}>
                    {sess.user?.name}
                  </p>
                  <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>
                    {formatDateTime(sess.openedAt)}
                    {sess.closedAt && ` → ${formatDateTime(sess.closedAt)}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className={clsx('text-sm font-bold font-mono', isDark ? 'text-white' : 'text-dark-900')}>
                    {formatCurrency(sess.closingAmount || sess.openingAmount)}
                  </p>
                  {sess.difference !== null && sess.difference !== undefined && (
                    <p className={clsx('text-xs', Number(sess.difference) >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                      Diferencia: {formatCurrency(sess.difference)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
