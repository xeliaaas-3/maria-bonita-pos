// ============================================
// PRODUCTOS PAGE
// ============================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Plus, Search, Filter, Package, Edit2, Trash2,
  AlertTriangle, ChevronDown, Grid, List, Upload,
  Download, MoreVertical, Eye, Barcode, Tag, Percent, Flame
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '@/services/api';
import { useThemeStore } from '@/store/theme.store';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency, formatDate } from '@/utils/format';
import { clsx } from 'clsx';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

const STATUS_COLORS = {
  ACTIVO: 'success',
  INACTIVO: 'gray',
  AGOTADO: 'danger'
};

export default function ProductsPage() {
  const { isDark } = useThemeStore();
  const { hasRole } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [view, setView] = useState('grid');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState(null);
  const [discountProduct, setDiscountProduct] = useState(null);
  const [discountPct, setDiscountPct] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, category, status, page],
    queryFn: () => api.get('/products', {
      params: { search, categoryId: category, status, page, limit: 20 }
    }).then(r => r.data),
    keepPreviousData: true
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data.data)
  });

  const applyDiscountMutation = useMutation({
    mutationFn: ({ id, pct }) => api.put(`/products/${id}`, { salePrice: Math.round(Number(discountProduct?.originalPrice || discountProduct?.salePrice) * (1 - pct / 100)) }),
    onSuccess: () => { toast.success('Precio de liquidación aplicado'); queryClient.invalidateQueries(['products']); setDiscountProduct(null); setDiscountPct(''); },
    onError: () => toast.error('Error')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => {
      toast.success('Producto eliminado');
      queryClient.invalidateQueries(['products']);
      setDeleteId(null);
    },
    onError: () => toast.error('Error al eliminar producto')
  });

  const cardBase = isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100';

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={clsx('text-2xl font-display font-bold', isDark ? 'text-white' : 'text-dark-900')}>
            Productos
          </h1>
          <p className={clsx('text-sm mt-0.5', isDark ? 'text-dark-400' : 'text-gray-500')}>
            {data?.pagination?.total || 0} productos registrados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className={clsx('flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors', isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
            <Download className="w-4 h-4" />
            Exportar
          </button>
          {(hasRole('ADMIN') || hasRole('CAJERO')) && (
            <button
              onClick={() => navigate('/products/new')}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-xl transition-colors shadow-glow"
            >
              <Plus className="w-4 h-4" />
              Nuevo Producto
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className={clsx('flex flex-wrap items-center gap-3 p-4 rounded-2xl border', cardBase)}>
        <div className="flex items-center gap-2 flex-1 min-w-48">
          <Search className={clsx('w-4 h-4 shrink-0', isDark ? 'text-dark-400' : 'text-gray-400')} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre, SKU, código..."
            className={clsx('flex-1 text-sm bg-transparent outline-none', isDark ? 'text-white placeholder:text-dark-500' : 'text-dark-900 placeholder:text-gray-400')}
          />
        </div>

        <select
          value={category}
          onChange={e => { setCategory(e.target.value); setPage(1); }}
          className={clsx('text-sm rounded-xl px-3 py-1.5 border outline-none', isDark ? 'bg-dark-800 border-dark-700 text-white' : 'bg-gray-50 border-gray-200 text-dark-900')}
        >
          <option value="">Todas las categorías</option>
          {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className={clsx('text-sm rounded-xl px-3 py-1.5 border outline-none', isDark ? 'bg-dark-800 border-dark-700 text-white' : 'bg-gray-50 border-gray-200 text-dark-900')}
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
          <option value="AGOTADO">Agotado</option>
        </select>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setView('grid')}
            className={clsx('p-1.5 rounded-lg transition-colors', view === 'grid' ? 'bg-primary-500 text-white' : isDark ? 'text-dark-400 hover:bg-dark-800' : 'text-gray-400 hover:bg-gray-100')}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={clsx('p-1.5 rounded-lg transition-colors', view === 'list' ? 'bg-primary-500 text-white' : isDark ? 'text-dark-400 hover:bg-dark-800' : 'text-gray-400 hover:bg-gray-100')}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Products */}
      {isLoading ? (
        <div className={clsx('grid gap-4', view === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1')}>
          {[...Array(10)].map((_, i) => (
            <div key={i} className={clsx('rounded-2xl h-48 animate-pulse', isDark ? 'bg-dark-800' : 'bg-gray-100')} />
          ))}
        </div>
      ) : data?.data?.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No hay productos"
          description="Comienza agregando tu primer producto"
          action={hasRole('ADMIN') || hasRole('CAJERO') ? { label: 'Agregar Producto', onClick: () => navigate('/products/new') } : null}
          isDark={isDark}
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {data?.data?.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={clsx('rounded-2xl border overflow-hidden group', cardBase)}
            >
              {/* Image */}
              <div className={clsx('relative aspect-square overflow-hidden', isDark ? 'bg-dark-800' : 'bg-gray-50')}>
                {product.images?.[0] ? (
                  <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className={clsx('w-12 h-12', isDark ? 'text-dark-600' : 'text-gray-200')} />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Badge variant={STATUS_COLORS[product.status]} size="sm">{product.status}</Badge>
                </div>
                {product.tags?.includes('liquidacion') && (
                  <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 bg-red-500 rounded-lg">
                    <Flame className="w-3 h-3 text-white" />
                    <span className="text-white text-[9px] font-bold">LIQUI</span>
                  </div>
                )}
                {/* Quick actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => navigate(`/products/${product.id}/edit`)}
                    className="p-2 bg-white rounded-xl hover:bg-primary-50"
                  >
                    <Edit2 className="w-4 h-4 text-dark-900" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDiscountProduct(product); setDiscountPct(''); }}
                    className="p-2 bg-white rounded-xl hover:bg-amber-50"
                    title="Aplicar liquidación"
                  >
                    <Percent className="w-4 h-4 text-amber-500" />
                  </button>
                  {(hasRole('ADMIN') || hasRole('CAJERO')) && (
                    <button
                      onClick={() => setDeleteId(product.id)}
                      className="p-2 bg-white rounded-xl hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className={clsx('text-sm font-semibold truncate', isDark ? 'text-white' : 'text-dark-900')}>
                  {product.name}
                </p>
                <p className={clsx('text-xs truncate mt-0.5', isDark ? 'text-dark-400' : 'text-gray-500')}>
                  {product.sku}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-bold text-primary-500">
                    {formatCurrency(product.salePrice)}
                  </span>
                  <span className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>
                    Stock: {product.stocks?.reduce((s, st) => s + st.quantity, 0) || 0}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className={clsx('rounded-2xl border overflow-hidden', cardBase)}>
          <table className="w-full text-sm">
            <thead>
              <tr className={clsx('border-b', isDark ? 'border-dark-800' : 'border-gray-100')}>
                {['Producto', 'SKU', 'Categoría', 'Precio', 'Stock', 'Estado', ''].map(h => (
                  <th key={h} className={clsx('text-left px-4 py-3 text-xs font-semibold', isDark ? 'text-dark-400' : 'text-gray-500')}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.data?.map((product, i) => (
                <motion.tr
                  key={product.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className={clsx('border-b last:border-0 transition-colors', isDark ? 'border-dark-800/50 hover:bg-dark-800/30' : 'border-gray-50 hover:bg-gray-50/50')}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={clsx('w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0', isDark ? 'bg-dark-800' : 'bg-gray-100')}>
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className={clsx('font-medium', isDark ? 'text-white' : 'text-dark-900')}>{product.name}</p>
                        {product.brand && <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>{product.brand.name}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('font-mono text-xs', isDark ? 'text-dark-300' : 'text-gray-600')}>{product.sku}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>{product.category?.name || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-primary-500">{formatCurrency(product.salePrice)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx(
                      'font-mono',
                      (product.stocks?.[0]?.quantity || 0) <= product.minStock ? 'text-amber-500' : isDark ? 'text-white' : 'text-dark-900'
                    )}>
                      {product.stocks?.reduce((s, st) => s + st.quantity, 0) || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_COLORS[product.status]} size="sm">{product.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/products/${product.id}/edit`)}
                        className={clsx('p-1.5 rounded-lg transition-colors', isDark ? 'hover:bg-dark-700 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {(hasRole('ADMIN') || hasRole('CAJERO')) && (
                        <button
                          onClick={() => setDeleteId(product.id)}
                          className={clsx('p-1.5 rounded-lg transition-colors', isDark ? 'hover:bg-red-500/10 text-dark-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data?.pagination && data.pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-gray-500')}>
            Página {page} de {data.pagination.pages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40', isDark ? 'border border-dark-700 text-dark-300 hover:bg-dark-800' : 'border border-gray-200 text-gray-600 hover:bg-gray-50')}
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(p => Math.min(data.pagination.pages, p + 1))}
              disabled={page === data.pagination.pages}
              className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40', isDark ? 'border border-dark-700 text-dark-300 hover:bg-dark-800' : 'border border-gray-200 text-gray-600 hover:bg-gray-50')}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {/* Liquidación Modal */}
      {discountProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.5)' }}>
          <div className={clsx('w-full max-w-sm rounded-2xl shadow-2xl border p-6 space-y-4', isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100')}>
            <div className="flex items-center justify-between">
              <h3 className={clsx('font-bold flex items-center gap-2', isDark ? 'text-white' : 'text-dark-900')}>
                <Flame className="w-4 h-4 text-red-500" />Aplicar Liquidación
              </h3>
              <button onClick={() => setDiscountProduct(null)} className={clsx('p-1.5 rounded-lg', isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}><X className="w-4 h-4" /></button>
            </div>
            <div className={clsx('rounded-xl p-3', isDark ? 'bg-dark-800' : 'bg-gray-50')}>
              <p className={clsx('text-sm font-semibold', isDark ? 'text-white' : 'text-dark-900')}>{discountProduct.name}</p>
              <p className={clsx('text-xs mt-0.5', isDark ? 'text-dark-400' : 'text-gray-500')}>Precio actual: {formatCurrency(discountProduct.salePrice)}</p>
            </div>
            <div>
              <label className={clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700')}>Descuento (%)</label>
              <input type="number" min="1" max="99" value={discountPct} onChange={e => setDiscountPct(e.target.value)} placeholder="Ej: 30 (para 30% de descuento)" className={clsx('w-full px-3 py-2.5 rounded-xl border text-sm outline-none', isDark ? 'bg-dark-800 border-dark-700 text-white focus:border-primary-500' : 'bg-white border-gray-200 text-dark-900 focus:border-primary-500')} />
              {discountPct > 0 && <p className="text-xs text-emerald-500 mt-1">Nuevo precio: {formatCurrency(Math.round(Number(discountProduct.salePrice) * (1 - discountPct / 100)))}</p>}
            </div>
            <button onClick={() => { if (!discountPct) return toast.error('Ingresá un porcentaje'); applyDiscountMutation.mutate({ id: discountProduct.id, pct: Number(discountPct) }); }} disabled={applyDiscountMutation.isPending || !discountPct} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
              {applyDiscountMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
              Aplicar Precio de Liquidación
            </button>
          </div>
        </div>
      )}

      {deleteId && (
        <ConfirmModal
          title="Eliminar Producto"
          message="¿Estás seguro? Esta acción no se puede deshacer."
          onConfirm={() => deleteMutation.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
          loading={deleteMutation.isPending}
          isDark={isDark}
        />
      )}
    </div>
  );
}
