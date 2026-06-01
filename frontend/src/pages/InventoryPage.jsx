// ============================================
// INVENTARIO PAGE
// ============================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Package, Search, Plus, Minus, ArrowUpDown,
  AlertTriangle, RefreshCw, History, ChevronDown, Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/services/api';
import { useThemeStore } from '@/store/theme.store';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency } from '@/utils/format';
import { clsx } from 'clsx';
import EmptyState from '@/components/ui/EmptyState';

export default function InventoryPage() {
  const { isDark } = useThemeStore();
  const { hasRole } = useAuthStore();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [tab, setTab] = useState('stock'); // 'stock' | 'kardex'
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ quantity: '', type: 'AJUSTE', reason: '' });
  const [page, setPage] = useState(1);

  const cardBase = isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100';

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['inventory', search, lowStock, page],
    queryFn: () => api.get('/inventory', { params: { search, lowStock, page, limit: 30 } }).then(r => r.data),
    keepPreviousData: true
  });

  const { data: kardexData } = useQuery({
    queryKey: ['kardex', page],
    queryFn: () => api.get('/inventory/kardex', { params: { page, limit: 50 } }).then(r => r.data),
    enabled: tab === 'kardex'
  });

  const adjustMutation = useMutation({
    mutationFn: (data) => api.post('/inventory/adjust', data),
    onSuccess: () => {
      toast.success('Stock ajustado exitosamente');
      queryClient.invalidateQueries(['inventory']);
      setAdjustModal(null);
      setAdjustForm({ quantity: '', type: 'AJUSTE', reason: '' });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al ajustar stock')
  });

  const handleAdjust = () => {
    if (!adjustForm.quantity) return;
    adjustMutation.mutate({
      productId: adjustModal.productId,
      variantId: adjustModal.variantId,
      branchId: adjustModal.branchId,
      quantity: Number(adjustForm.quantity),
      type: adjustForm.type,
      reason: adjustForm.reason
    });
  };

  const MOVEMENT_COLORS = {
    ENTRADA: 'text-emerald-500',
    SALIDA: 'text-red-500',
    AJUSTE: 'text-blue-500',
    DEVOLUCION: 'text-violet-500',
    TRANSFERENCIA: 'text-amber-500'
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={clsx('text-2xl font-display font-bold', isDark ? 'text-white' : 'text-dark-900')}>
            Inventario
          </h1>
          <p className={clsx('text-sm mt-0.5', isDark ? 'text-dark-400' : 'text-gray-500')}>
            Control de stock y movimientos
          </p>
        </div>
        <button onClick={() => refetch()} className={clsx('p-2 rounded-xl transition-colors', isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}>
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className={clsx('flex items-center gap-1 p-1 rounded-xl border w-fit', cardBase)}>
        {[{ id: 'stock', label: 'Stock Actual', icon: Package }, { id: 'kardex', label: 'Kardex', icon: History }].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all', tab === t.id ? 'bg-primary-500 text-white' : isDark ? 'text-dark-400' : 'text-gray-500')}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <>
          {/* Filters */}
          <div className={clsx('flex flex-wrap items-center gap-3 p-4 rounded-2xl border', cardBase)}>
            <div className="flex items-center gap-2 flex-1 min-w-48">
              <Search className={clsx('w-4 h-4 shrink-0', isDark ? 'text-dark-400' : 'text-gray-400')} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar producto..."
                className={clsx('flex-1 text-sm bg-transparent outline-none', isDark ? 'text-white placeholder:text-dark-500' : 'text-dark-900 placeholder:text-gray-400')}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={lowStock} onChange={e => setLowStock(e.target.checked)} className="rounded" />
              <span className={clsx('text-sm', isDark ? 'text-dark-300' : 'text-gray-600')}>
                <AlertTriangle className="w-4 h-4 text-amber-500 inline mr-1" />
                Solo stock bajo
              </span>
            </label>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
          ) : data?.data?.length === 0 ? (
            <EmptyState icon={Package} title="Sin resultados" isDark={isDark} />
          ) : (
            <div className={clsx('rounded-2xl border overflow-hidden', cardBase)}>
              <table className="w-full text-sm">
                <thead>
                  <tr className={clsx('border-b', isDark ? 'border-dark-800' : 'border-gray-100')}>
                    {['Producto', 'SKU', 'Variante', 'Sucursal', 'Stock', 'Mín', 'Costo', ''].map(h => (
                      <th key={h} className={clsx('text-left px-4 py-3 text-xs font-semibold', isDark ? 'text-dark-400' : 'text-gray-500')}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.map((stock, i) => {
                    const isLow = stock.quantity <= stock.product.minStock;
                    return (
                      <motion.tr
                        key={stock.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className={clsx('border-b last:border-0', isDark ? 'border-dark-800/50 hover:bg-dark-800/30' : 'border-gray-50 hover:bg-gray-50/50')}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={clsx('w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0', isDark ? 'bg-dark-800' : 'bg-gray-100')}>
                              {stock.product.images?.[0] ? (
                                <img src={stock.product.images[0]} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <p className={clsx('font-medium', isDark ? 'text-white' : 'text-dark-900')}>{stock.product.name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className={clsx('font-mono text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>{stock.product.sku}</span></td>
                        <td className="px-4 py-3">
                          {stock.variant ? (
                            <span className={clsx('text-xs px-2 py-0.5 rounded-lg', isDark ? 'bg-dark-800 text-dark-300' : 'bg-gray-100 text-gray-600')}>
                              {[stock.variant.size, stock.variant.color].filter(Boolean).join(' / ')}
                            </span>
                          ) : <span className={clsx('text-xs', isDark ? 'text-dark-500' : 'text-gray-400')}>—</span>}
                        </td>
                        <td className="px-4 py-3"><span className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>{stock.branch?.name}</span></td>
                        <td className="px-4 py-3">
                          <span className={clsx('font-mono font-bold text-base', stock.quantity === 0 ? 'text-red-500' : isLow ? 'text-amber-500' : isDark ? 'text-white' : 'text-dark-900')}>
                            {stock.quantity}
                          </span>
                          {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 inline ml-1" />}
                        </td>
                        <td className="px-4 py-3"><span className={clsx('text-xs font-mono', isDark ? 'text-dark-400' : 'text-gray-500')}>{stock.product.minStock}</span></td>
                        <td className="px-4 py-3"><span className={clsx('text-xs font-mono', isDark ? 'text-dark-400' : 'text-gray-500')}>{formatCurrency(stock.product.costPrice)}</span></td>
                        <td className="px-4 py-3">
                          {hasRole('ADMIN', 'CAJERO') && (
                            <button
                              onClick={() => setAdjustModal({ productId: stock.productId, variantId: stock.variantId, branchId: stock.branchId, productName: stock.product.name, currentQty: stock.quantity })}
                              className={clsx('text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors', isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-gray-200 text-gray-600 hover:bg-gray-100')}
                            >
                              Ajustar
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'kardex' && (
        <div className={clsx('rounded-2xl border overflow-hidden', cardBase)}>
          <div className={clsx('p-4 border-b', isDark ? 'border-dark-800' : 'border-gray-100')}>
            <h3 className={clsx('font-semibold', isDark ? 'text-white' : 'text-dark-900')}>Historial de Movimientos</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className={clsx('border-b', isDark ? 'border-dark-800' : 'border-gray-100')}>
                {['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Anterior', 'Actual', 'Motivo'].map(h => (
                  <th key={h} className={clsx('text-left px-4 py-3 text-xs font-semibold', isDark ? 'text-dark-400' : 'text-gray-500')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kardexData?.data?.map((mov, i) => (
                <tr key={mov.id} className={clsx('border-b last:border-0', isDark ? 'border-dark-800/50 hover:bg-dark-800/30' : 'border-gray-50 hover:bg-gray-50/50')}>
                  <td className="px-4 py-3"><span className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>{new Date(mov.createdAt).toLocaleString('es-PY')}</span></td>
                  <td className="px-4 py-3"><span className={isDark ? 'text-white' : 'text-dark-900'}>{mov.product?.name}</span></td>
                  <td className="px-4 py-3"><span className={clsx('font-medium text-xs', MOVEMENT_COLORS[mov.type])}>{mov.type}</span></td>
                  <td className="px-4 py-3"><span className={clsx('font-mono font-bold', MOVEMENT_COLORS[mov.type])}>{mov.quantity}</span></td>
                  <td className="px-4 py-3"><span className={clsx('font-mono', isDark ? 'text-dark-400' : 'text-gray-500')}>{mov.previousQty}</span></td>
                  <td className="px-4 py-3"><span className={clsx('font-mono font-semibold', isDark ? 'text-white' : 'text-dark-900')}>{mov.currentQty}</span></td>
                  <td className="px-4 py-3"><span className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>{mov.reason || '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Adjust Modal */}
      {adjustModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.5)' }}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className={clsx('w-full max-w-sm rounded-2xl border p-6 shadow-2xl', isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100')}>
            <h3 className={clsx('font-bold text-lg mb-1', isDark ? 'text-white' : 'text-dark-900')}>Ajustar Stock</h3>
            <p className={clsx('text-sm mb-4', isDark ? 'text-dark-400' : 'text-gray-500')}>
              {adjustModal.productName} · Stock actual: <strong>{adjustModal.currentQty}</strong>
            </p>
            <div className="space-y-4">
              <div className="flex gap-2">
                {['AJUSTE', 'ENTRADA', 'SALIDA'].map(t => (
                  <button key={t} onClick={() => setAdjustForm(f => ({ ...f, type: t }))} className={clsx('flex-1 py-2 rounded-xl text-xs font-medium border-2 transition-all', adjustForm.type === t ? 'border-primary-500 bg-primary-500/10 text-primary-500' : isDark ? 'border-dark-700 text-dark-400' : 'border-gray-200 text-gray-500')}>
                    {t}
                  </button>
                ))}
              </div>
              <div>
                <label className={clsx('block text-xs font-semibold mb-1', isDark ? 'text-dark-300' : 'text-dark-700')}>
                  {adjustForm.type === 'AJUSTE' ? 'Nueva cantidad exacta' : 'Cantidad'}
                </label>
                <input type="number" min="0" value={adjustForm.quantity} onChange={e => setAdjustForm(f => ({ ...f, quantity: e.target.value }))} className={clsx('w-full px-3 py-2.5 rounded-xl border text-sm outline-none', isDark ? 'bg-dark-800 border-dark-700 text-white' : 'bg-white border-gray-200')} />
              </div>
              <div>
                <label className={clsx('block text-xs font-semibold mb-1', isDark ? 'text-dark-300' : 'text-dark-700')}>Motivo</label>
                <input type="text" value={adjustForm.reason} onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))} placeholder="Ej: Conteo físico, devolución..." className={clsx('w-full px-3 py-2.5 rounded-xl border text-sm outline-none', isDark ? 'bg-dark-800 border-dark-700 text-white placeholder:text-dark-600' : 'bg-white border-gray-200 placeholder:text-gray-400')} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setAdjustModal(null)} className={clsx('flex-1 py-2.5 rounded-xl text-sm border', isDark ? 'border-dark-700 text-dark-300' : 'border-gray-200 text-gray-600')}>Cancelar</button>
                <button onClick={handleAdjust} disabled={!adjustForm.quantity || adjustMutation.isPending} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-60 flex items-center justify-center gap-2">
                  {adjustMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
