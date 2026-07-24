// ============================================
// COMPRAS PAGE
// ============================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Plus, X, Search, Loader2, Package,
  ChevronLeft, ChevronRight, Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/services/api';
import { useThemeStore } from '@/store/theme.store';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { clsx } from 'clsx';

const STATUS_COLOR = {
  RECIBIDA: 'text-emerald-500 bg-emerald-500/10',
  PENDIENTE: 'text-amber-500 bg-amber-500/10',
  CANCELADA: 'text-red-500 bg-red-500/10'
};

export default function PurchasesPage() {
  const { isDark } = useThemeStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  const cardBase = isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100';
  const inputClass = clsx(
    'w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all',
    isDark
      ? 'bg-dark-800 border-dark-700 text-white placeholder:text-dark-500 focus:border-primary-500'
      : 'bg-white border-gray-200 text-dark-900 placeholder:text-gray-400 focus:border-primary-500'
  );

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', page],
    queryFn: () => api.get('/purchases', { params: { page, limit: 20 } }).then(r => r.data)
  });

  const purchases = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={clsx('text-2xl font-display font-bold', isDark ? 'text-white' : 'text-dark-900')}>
            Compras
          </h1>
          <p className={clsx('text-sm mt-0.5', isDark ? 'text-dark-400' : 'text-gray-500')}>
            Registro de compras a proveedores
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-glow"
        >
          <Plus className="w-4 h-4" />
          Nueva Compra
        </button>
      </div>

      {/* Table */}
      <div className={clsx('rounded-2xl border overflow-hidden', cardBase)}>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : purchases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <ShoppingBag className={clsx('w-12 h-12', isDark ? 'text-dark-600' : 'text-gray-300')} />
            <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-gray-500')}>No hay compras registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={clsx('border-b text-left text-xs font-semibold uppercase tracking-wider', isDark ? 'border-dark-800 text-dark-400' : 'border-gray-100 text-gray-400')}>
                  <th className="px-5 py-3.5">N° Compra</th>
                  <th className="px-5 py-3.5">Proveedor</th>
                  <th className="px-5 py-3.5">Fecha</th>
                  <th className="px-5 py-3.5">Ítems</th>
                  <th className="px-5 py-3.5">Total</th>
                  <th className="px-5 py-3.5">Estado</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr
                    key={p.id}
                    className={clsx('border-b transition-colors', isDark ? 'border-dark-800 hover:bg-dark-800/50' : 'border-gray-50 hover:bg-gray-50')}
                  >
                    <td className={clsx('px-5 py-4 font-mono font-medium', isDark ? 'text-white' : 'text-dark-900')}>
                      {p.number}
                    </td>
                    <td className={clsx('px-5 py-4', isDark ? 'text-dark-200' : 'text-dark-700')}>
                      {p.supplier?.name || '-'}
                    </td>
                    <td className={clsx('px-5 py-4', isDark ? 'text-dark-400' : 'text-gray-500')}>
                      {formatDateTime(p.createdAt)}
                    </td>
                    <td className={clsx('px-5 py-4', isDark ? 'text-dark-400' : 'text-gray-500')}>
                      {p._count?.items || 0} ítem(s)
                    </td>
                    <td className={clsx('px-5 py-4 font-mono font-semibold', isDark ? 'text-white' : 'text-dark-900')}>
                      {formatCurrency(p.total)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={clsx('px-2.5 py-1 rounded-lg text-xs font-semibold', STATUS_COLOR[p.status] || 'text-gray-500 bg-gray-100')}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className={clsx('flex items-center justify-between px-5 py-3 border-t', isDark ? 'border-dark-800' : 'border-gray-100')}>
            <span className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-gray-500')}>
              {pagination.total} compras
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={clsx('p-1.5 rounded-lg transition-colors', isDark ? 'hover:bg-dark-800 text-dark-400 disabled:opacity-30' : 'hover:bg-gray-100 text-gray-400 disabled:opacity-30')}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className={clsx('text-sm px-2 flex items-center', isDark ? 'text-dark-300' : 'text-dark-700')}>
                {page} / {pagination.pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className={clsx('p-1.5 rounded-lg transition-colors', isDark ? 'hover:bg-dark-800 text-dark-400 disabled:opacity-30' : 'hover:bg-gray-100 text-gray-400 disabled:opacity-30')}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Purchase Modal */}
      <AnimatePresence>
        {showModal && (
          <NewPurchaseModal
            isDark={isDark}
            inputClass={inputClass}
            cardBase={cardBase}
            onClose={() => setShowModal(false)}
            onSuccess={() => {
              setShowModal(false);
              queryClient.invalidateQueries(['purchases']);
              queryClient.invalidateQueries(['inventory']);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NewPurchaseModal({ isDark, inputClass, cardBase, onClose, onSuccess }) {
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [productSearch, setProductSearch] = useState('');

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: () => api.get('/suppliers').then(r => r.data.data || r.data)
  });

  const { data: searchResults } = useQuery({
    queryKey: ['product-search-purchase', productSearch],
    queryFn: () => api.get(`/products/search?q=${productSearch}&limit=8`).then(r => r.data.data),
    enabled: productSearch.length >= 2
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/purchases', data),
    onSuccess: () => {
      toast.success('Compra registrada exitosamente');
      onSuccess();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al crear compra')
  });

  const addItem = (product) => {
    const key = product.id;
    setItems(prev => {
      const exists = prev.find(i => i.productId === key);
      if (exists) return prev;
      return [...prev, { productId: product.id, name: product.name, quantity: 1, unitCost: 0 }];
    });
    setProductSearch('');
  };

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const total = items.reduce((s, i) => s + (Number(i.unitCost) * Number(i.quantity)), 0);

  const handleSubmit = () => {
    if (!supplierId) return toast.error('Seleccione un proveedor');
    if (items.length === 0) return toast.error('Agregue al menos un ítem');
    createMutation.mutate({ supplierId, notes, items });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.6)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={clsx('w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden', cardBase)}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: isDark ? '#2d2d3a' : '#f0f0f5' }}>
          <h2 className={clsx('text-lg font-display font-bold', isDark ? 'text-white' : 'text-dark-900')}>
            Nueva Compra
          </h2>
          <button onClick={onClose} className={clsx('p-1.5 rounded-lg', isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Proveedor */}
          <div>
            <label className={clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700')}>Proveedor *</label>
            <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className={inputClass}>
              <option value="">Seleccionar proveedor...</option>
              {(suppliers || []).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Buscar producto */}
          <div className="relative">
            <label className={clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700')}>Agregar producto</label>
            <div className="relative">
              <Search className={clsx('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', isDark ? 'text-dark-500' : 'text-gray-400')} />
              <input
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                placeholder="Buscar producto por nombre..."
                className={clsx(inputClass, 'pl-9')}
              />
            </div>
            {searchResults && searchResults.length > 0 && productSearch.length >= 2 && (
              <div className={clsx('absolute z-10 w-full mt-1 rounded-xl border shadow-xl overflow-hidden', isDark ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200')}>
                {searchResults.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addItem(p)}
                    className={clsx('w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3', isDark ? 'text-white hover:bg-dark-700' : 'text-dark-900 hover:bg-gray-50')}
                  >
                    <Package className={clsx('w-4 h-4 shrink-0', isDark ? 'text-dark-400' : 'text-gray-400')} />
                    {p.name} <span className={clsx('text-xs ml-auto', isDark ? 'text-dark-400' : 'text-gray-400')}>{p.sku}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div className={clsx('rounded-xl border overflow-hidden', isDark ? 'border-dark-700' : 'border-gray-100')}>
              <table className="w-full text-sm">
                <thead>
                  <tr className={clsx('text-xs font-semibold uppercase tracking-wider', isDark ? 'bg-dark-800 text-dark-400' : 'bg-gray-50 text-gray-400')}>
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-right">Cant.</th>
                    <th className="px-3 py-2 text-right">Costo Unit.</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className={clsx('border-t', isDark ? 'border-dark-700' : 'border-gray-100')}>
                      <td className={clsx('px-3 py-2', isDark ? 'text-white' : 'text-dark-900')}>{item.name}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min="1"
                          value={item.quantity}
                          onChange={e => updateItem(idx, 'quantity', e.target.value)}
                          className={clsx('w-16 text-right px-2 py-1 rounded-lg border text-sm outline-none', isDark ? 'bg-dark-800 border-dark-700 text-white' : 'bg-white border-gray-200 text-dark-900')}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min="0"
                          value={item.unitCost}
                          onChange={e => updateItem(idx, 'unitCost', e.target.value)}
                          className={clsx('w-28 text-right px-2 py-1 rounded-lg border text-sm outline-none', isDark ? 'bg-dark-800 border-dark-700 text-white' : 'bg-white border-gray-200 text-dark-900')}
                        />
                      </td>
                      <td className={clsx('px-3 py-2 text-right font-mono text-xs', isDark ? 'text-dark-300' : 'text-dark-600')}>
                        {formatCurrency(Number(item.unitCost) * Number(item.quantity))}
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => removeItem(idx)} className="p-1 rounded text-red-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={clsx('flex justify-end px-4 py-2 border-t font-bold text-sm', isDark ? 'border-dark-700 text-white' : 'border-gray-100 text-dark-900')}>
                Total: <span className="ml-2 text-primary-500 font-mono">{formatCurrency(total)}</span>
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className={clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700')}>Notas</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className={clsx(inputClass, 'resize-none')}
              placeholder="Observaciones de la compra..."
            />
          </div>
        </div>

        <div className={clsx('flex justify-end gap-3 px-6 py-4 border-t', isDark ? 'border-dark-800' : 'border-gray-100')}>
          <button onClick={onClose} className={clsx('px-5 py-2.5 rounded-xl text-sm font-medium', isDark ? 'text-dark-400 hover:bg-dark-800' : 'text-gray-500 hover:bg-gray-100')}>
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
            Registrar Compra
          </button>
        </div>
      </motion.div>
    </div>
  );
}
