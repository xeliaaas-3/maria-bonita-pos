// ============================================
// VENTAS PAGE
// ============================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Receipt, Search, Eye, XCircle, Download,
  TrendingUp, Calendar, Filter, Loader2, CheckCircle,
  AlertCircle, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '@/services/api';
import { useThemeStore } from '@/store/theme.store';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { clsx } from 'clsx';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

const STATUS_CONFIG = {
  COMPLETADA: { label: 'Completada', color: 'success' },
  PENDIENTE: { label: 'Pendiente', color: 'warning' },
  CANCELADA: { label: 'Cancelada', color: 'danger' },
  DEVOLUCION: { label: 'Devolución', color: 'violet' }
};

const PAYMENT_ICONS = {
  EFECTIVO: '💵',
  TARJETA: '💳',
  TRANSFERENCIA: '📱',
  QR: '📲',
  MIXTO: '🔀'
};

export default function SalesPage() {
  const { isDark } = useThemeStore();
  const { hasRole } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().split('T')[0];
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [page, setPage] = useState(1);
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const cardBase = isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100';

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sales', search, status, startDate, endDate, page],
    queryFn: () => api.get('/sales', {
      params: { search, status, startDate, endDate, page, limit: 25 }
    }).then(r => r.data),
    keepPreviousData: true
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => api.patch(`/sales/${id}/cancel`, { reason }),
    onSuccess: () => {
      toast.success('Venta cancelada');
      queryClient.invalidateQueries(['sales']);
      setCancelModal(null);
      setCancelReason('');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al cancelar')
  });

  // Totales del período actual
  const totals = data?.data?.reduce((acc, sale) => {
    if (sale.status === 'COMPLETADA') {
      acc.revenue += Number(sale.total);
      acc.count += 1;
    }
    return acc;
  }, { revenue: 0, count: 0 });

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={clsx('text-2xl font-display font-bold', isDark ? 'text-white' : 'text-dark-900')}>
            Ventas
          </h1>
          <p className={clsx('text-sm mt-0.5', isDark ? 'text-dark-400' : 'text-gray-500')}>
            {data?.pagination?.total || 0} transacciones
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className={clsx('p-2 rounded-xl transition-colors', isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/pos')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-xl shadow-glow"
          >
            <Receipt className="w-4 h-4" />
            Nueva Venta
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Ventas del período', value: totals.count.toString(), icon: Receipt, color: 'text-primary-500', bg: isDark ? 'bg-primary-500/10' : 'bg-primary-50' },
            { label: 'Ingresos', value: formatCurrency(totals.revenue), icon: TrendingUp, color: 'text-emerald-500', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50' },
            { label: 'Ticket promedio', value: totals.count > 0 ? formatCurrency(totals.revenue / totals.count) : '₲ 0', icon: Calendar, color: 'text-violet-500', bg: isDark ? 'bg-violet-500/10' : 'bg-violet-50' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={clsx('rounded-2xl border p-4', cardBase)}>
                <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center mb-3', s.bg)}>
                  <Icon className={clsx('w-4 h-4', s.color)} />
                </div>
                <p className={clsx('text-lg font-bold font-mono', isDark ? 'text-white' : 'text-dark-900')}>{s.value}</p>
                <p className={clsx('text-xs mt-0.5', isDark ? 'text-dark-400' : 'text-gray-500')}>{s.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className={clsx('rounded-2xl border p-4 space-y-3', cardBase)}>
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 flex-1 min-w-48">
            <Search className={clsx('w-4 h-4 shrink-0', isDark ? 'text-dark-400' : 'text-gray-400')} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por número, cliente..."
              className={clsx('flex-1 text-sm bg-transparent outline-none', isDark ? 'text-white placeholder:text-dark-500' : 'text-dark-900 placeholder:text-gray-400')}
            />
          </div>

          {/* Status */}
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            className={clsx('text-sm rounded-xl px-3 py-1.5 border outline-none', isDark ? 'bg-dark-800 border-dark-700 text-white' : 'bg-gray-50 border-gray-200')}
          >
            <option value="">Todos los estados</option>
            <option value="COMPLETADA">Completadas</option>
            <option value="CANCELADA">Canceladas</option>
            <option value="DEVOLUCION">Devoluciones</option>
          </select>
        </div>

        {/* Date range */}
        <div className="flex items-center gap-3 flex-wrap">
          <Calendar className={clsx('w-4 h-4', isDark ? 'text-dark-400' : 'text-gray-400')} />
          <input
            type="date"
            value={startDate}
            onChange={e => { setStartDate(e.target.value); setPage(1); }}
            className={clsx('text-sm rounded-xl px-3 py-1.5 border outline-none', isDark ? 'bg-dark-800 border-dark-700 text-white' : 'bg-gray-50 border-gray-200')}
          />
          <span className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-gray-400')}>hasta</span>
          <input
            type="date"
            value={endDate}
            onChange={e => { setEndDate(e.target.value); setPage(1); }}
            className={clsx('text-sm rounded-xl px-3 py-1.5 border outline-none', isDark ? 'bg-dark-800 border-dark-700 text-white' : 'bg-gray-50 border-gray-200')}
          />
          {/* Quick ranges */}
          <div className="flex items-center gap-1 ml-auto">
            {[
              { label: 'Hoy', action: () => { const d = new Date().toISOString().split('T')[0]; setStartDate(d); setEndDate(d); } },
              { label: '7d', action: () => { const e = new Date().toISOString().split('T')[0]; const s = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]; setStartDate(s); setEndDate(e); } },
              { label: 'Mes', action: () => { const e = new Date().toISOString().split('T')[0]; const s = new Date(new Date().setDate(1)).toISOString().split('T')[0]; setStartDate(s); setEndDate(e); } },
            ].map(r => (
              <button key={r.label} onClick={r.action} className={clsx('px-2.5 py-1 rounded-lg text-xs font-medium transition-colors', isDark ? 'text-dark-400 hover:bg-dark-800' : 'text-gray-500 hover:bg-gray-100')}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
      ) : data?.data?.length === 0 ? (
        <EmptyState icon={Receipt} title="No hay ventas" description="No se encontraron ventas en este período" isDark={isDark} />
      ) : (
        <div className={clsx('rounded-2xl border', cardBase)}>
          <div className="overflow-x-auto rounded-2xl"><table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className={clsx('border-b', isDark ? 'border-dark-800' : 'border-gray-100')}>
                {['Nro.', 'Fecha', 'Cliente', 'Cajero', 'Items', 'Método', 'Total', 'Estado', ''].map(h => (
                  <th key={h} className={clsx('text-left px-4 py-3 text-xs font-semibold whitespace-nowrap', isDark ? 'text-dark-400' : 'text-gray-500')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.data?.map((sale, i) => {
                const statusCfg = STATUS_CONFIG[sale.status] || STATUS_CONFIG.COMPLETADA;
                const paymentMethods = [...new Set(sale.payments?.map(p => p.method) || [])];
                return (
                  <motion.tr
                    key={sale.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={clsx('border-b last:border-0 transition-colors cursor-pointer', isDark ? 'border-dark-800/50 hover:bg-dark-800/30' : 'border-gray-50 hover:bg-gray-50/50')}
                    onClick={() => navigate(`/sales/${sale.id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className={clsx('font-mono text-xs font-medium', isDark ? 'text-primary-400' : 'text-primary-600')}>
                        {sale.number}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('text-xs whitespace-nowrap', isDark ? 'text-dark-300' : 'text-gray-600')}>
                        {formatDateTime(sale.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('text-sm', isDark ? 'text-white' : 'text-dark-900')}>
                        {sale.customer?.name || <span className={clsx('italic', isDark ? 'text-dark-500' : 'text-gray-400')}>Consumidor Final</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>{sale.user?.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('text-xs font-medium', isDark ? 'text-dark-300' : 'text-gray-600')}>
                        {sale._count?.items || 0} items
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">
                        {paymentMethods.map(m => PAYMENT_ICONS[m] || '💰').join(' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('font-mono font-bold text-sm', isDark ? 'text-white' : 'text-dark-900')}>
                        {formatCurrency(sale.total)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusCfg.color} size="sm">{statusCfg.label}</Badge>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/sales/${sale.id}`)}
                          className={clsx('p-1.5 rounded-lg transition-colors', isDark ? 'hover:bg-dark-700 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}
                          title="Ver detalle"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {sale.status === 'COMPLETADA' && hasRole('ADMIN', 'CAJERO') && (
                          <button
                            onClick={() => setCancelModal(sale)}
                            className={clsx('p-1.5 rounded-lg transition-colors', isDark ? 'hover:bg-red-500/10 text-dark-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500')}
                            title="Cancelar venta"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table></div>
        </div>
      )}

      {/* Pagination */}
      {data?.pagination && data.pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-gray-500')}>
            Página {page} de {data.pagination.pages} — {data.pagination.total} ventas
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40', isDark ? 'border border-dark-700 text-dark-300 hover:bg-dark-800' : 'border border-gray-200 text-gray-600 hover:bg-gray-50')}>Anterior</button>
            <button onClick={() => setPage(p => Math.min(data.pagination.pages, p + 1))} disabled={page === data.pagination.pages} className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40', isDark ? 'border border-dark-700 text-dark-300 hover:bg-dark-800' : 'border border-gray-200 text-gray-600 hover:bg-gray-50')}>Siguiente</button>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.5)' }}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className={clsx('w-full max-w-sm rounded-2xl border p-6 shadow-2xl', isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100')}>
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center mb-4">
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className={clsx('font-bold text-lg mb-1', isDark ? 'text-white' : 'text-dark-900')}>Cancelar Venta</h3>
            <p className={clsx('text-sm mb-4', isDark ? 'text-dark-400' : 'text-gray-500')}>
              Venta #{cancelModal.number} · {formatCurrency(cancelModal.total)}
            </p>
            <div className="mb-4">
              <label className={clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700')}>Motivo de cancelación *</label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Describe el motivo..."
                rows={3}
                className={clsx('w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none', isDark ? 'bg-dark-800 border-dark-700 text-white placeholder:text-dark-600' : 'bg-white border-gray-200 placeholder:text-gray-400')}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setCancelModal(null); setCancelReason(''); }} className={clsx('flex-1 py-2.5 rounded-xl text-sm border', isDark ? 'border-dark-700 text-dark-300' : 'border-gray-200 text-gray-600')}>Volver</button>
              <button
                onClick={() => cancelMutation.mutate({ id: cancelModal.id, reason: cancelReason })}
                disabled={!cancelReason || cancelMutation.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancelar Venta'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
