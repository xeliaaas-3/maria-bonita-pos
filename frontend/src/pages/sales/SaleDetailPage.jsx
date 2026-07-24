// ============================================
// VENTA DETALLE PAGE — con edición de factura
// ============================================

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Printer, Package,
  User, Calendar, Receipt, CheckCircle,
  XCircle, CreditCard, Loader2, Edit2, Save, X, Percent, Tag, RotateCcw
} from 'lucide-react';
import { useState } from 'react';
import api from '@/services/api';
import { useThemeStore } from '@/store/theme.store';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { clsx } from 'clsx';
import Badge from '@/components/ui/Badge';
import { toast } from 'react-hot-toast';

const STATUS_CONFIG = {
  COMPLETADA: { label: 'Completada', color: 'success', icon: CheckCircle },
  CANCELADA: { label: 'Cancelada', color: 'danger', icon: XCircle },
  DEVOLUCION: { label: 'Devolución', color: 'violet', icon: Receipt },
  PENDIENTE: { label: 'Pendiente', color: 'warning', icon: Receipt }
};

const PAYMENT_LABELS = { EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', TRANSFERENCIA: 'Transferencia', QR: 'QR', MIXTO: 'Mixto' };

export default function SaleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDark } = useThemeStore();
  const { hasRole } = useAuthStore();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ notes: '', discount: '', discountType: 'MONTO' });
  const [showReturn, setShowReturn] = useState(false);
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState('');

  const { data: sale, isLoading } = useQuery({
    queryKey: ['sale', id],
    queryFn: () => api.get(`/sales/${id}`).then(r => r.data.data),
    onSuccess: (data) => {
      setEditForm({
        notes: data.notes || '',
        discount: data.discount > 0 ? data.discount : '',
        discountType: data.discountType || 'MONTO',
      });
    }
  });

  const returnMutation = useMutation({
    mutationFn: (data) => api.post(`/sales/${id}/return`, data),
    onSuccess: (res) => {
      toast.success('Devolución procesada exitosamente');
      queryClient.invalidateQueries(['sale', id]);
      queryClient.invalidateQueries(['inventory']);
      setShowReturn(false);
      setReturnItems([]);
      setReturnReason('');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al procesar devolución')
  });

  const updateMutation = useMutation({
    mutationFn: (data) => api.patch(`/sales/${id}`, data),
    onSuccess: () => {
      toast.success('Factura actualizada');
      queryClient.invalidateQueries(['sale', id]);
      setEditing(false);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al actualizar')
  });

  const handlePrintTicket = async () => {
    try {
      const response = await api.get(`/sales/${id}/ticket`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      win?.focus();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('Error al generar ticket');
    }
  };

  const startEdit = () => {
    if (!sale) return;
    setEditForm({
      notes: sale.notes || '',
      discount: sale.discount > 0 ? sale.discount : '',
      discountType: sale.discountType || 'MONTO',
    });
    setEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate({
      notes: editForm.notes,
      discount: editForm.discount !== '' ? Number(editForm.discount) : 0,
      discountType: editForm.discountType,
    });
  };

  const cardBase = isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100';
  const inputClass = clsx(
    'w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all',
    isDark
      ? 'bg-dark-800 border-dark-700 text-white placeholder:text-dark-600 focus:border-primary-500'
      : 'bg-white border-gray-200 text-dark-900 placeholder:text-gray-400 focus:border-primary-500'
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!sale) return null;

  const statusCfg = STATUS_CONFIG[sale.status] || STATUS_CONFIG.COMPLETADA;
  const StatusIcon = statusCfg.icon;
  const canEdit = (hasRole('ADMIN') || hasRole('CAJERO')) && sale.status !== 'CANCELADA';
  const canReturn = (hasRole('ADMIN') || hasRole('CAJERO')) && sale.status === 'COMPLETADA';

  const openReturn = () => {
    setReturnItems(sale.items.map(i => ({ saleItemId: i.id, name: i.name, maxQty: i.quantity, quantity: 0 })));
    setShowReturn(true);
  };

  const handleReturn = () => {
    const filtered = returnItems.filter(i => i.quantity > 0);
    if (filtered.length === 0) return toast.error('Ingrese al menos un ítem a devolver');
    returnMutation.mutate({ items: filtered.map(i => ({ saleItemId: i.saleItemId, quantity: i.quantity })), reason: returnReason });
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/sales')} className={clsx('p-2 rounded-xl transition-colors', isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className={clsx('text-xl font-display font-bold', isDark ? 'text-white' : 'text-dark-900')}>
              Venta #{sale.number}
            </h1>
            <Badge variant={statusCfg.color}>{statusCfg.label}</Badge>
          </div>
          <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-gray-500')}>
            {formatDateTime(sale.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && !editing && (
            <button
              onClick={startEdit}
              className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors', isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}
            >
              <Edit2 className="w-4 h-4" />
              Editar
            </button>
          )}
          {canReturn && (
            <button
              onClick={openReturn}
              className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors', isDark ? 'border-amber-600/40 text-amber-400 hover:bg-amber-500/10' : 'border-amber-300 text-amber-600 hover:bg-amber-50')}
            >
              <RotateCcw className="w-4 h-4" />
              Devolución
            </button>
          )}
          <button
            onClick={handlePrintTicket}
            className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors', isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>
      </div>

      {/* ── PANEL DE EDICIÓN ── */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={clsx('rounded-2xl border p-5 space-y-4', isDark ? 'bg-dark-900 border-primary-500/40' : 'bg-primary-50/30 border-primary-200')}
          >
            <div className="flex items-center justify-between">
              <h3 className={clsx('font-semibold flex items-center gap-2', isDark ? 'text-white' : 'text-dark-900')}>
                <Edit2 className="w-4 h-4 text-primary-500" />
                Editar Factura
              </h3>
              <button onClick={() => setEditing(false)} className={clsx('p-1.5 rounded-lg', isDark ? 'hover:bg-dark-700 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Descuento */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700')}>
                  Descuento
                </label>
                <div className="relative">
                  <Tag className={clsx('absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5', isDark ? 'text-dark-500' : 'text-gray-400')} />
                  <input
                    type="number"
                    min="0"
                    value={editForm.discount}
                    onChange={e => setEditForm(f => ({ ...f, discount: e.target.value }))}
                    placeholder="0"
                    className={clsx(inputClass, 'pl-9')}
                  />
                </div>
              </div>
              <div>
                <label className={clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700')}>
                  Tipo de descuento
                </label>
                <select
                  value={editForm.discountType}
                  onChange={e => setEditForm(f => ({ ...f, discountType: e.target.value }))}
                  className={inputClass}
                >
                  <option value="MONTO">Monto fijo (₲)</option>
                  <option value="PORCENTAJE">Porcentaje (%)</option>
                </select>
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className={clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700')}>
                Notas / Observaciones
              </label>
              <textarea
                value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Notas internas sobre esta venta..."
                rows={3}
                className={clsx(inputClass, 'resize-none')}
              />
            </div>

            {/* Preview del total si hay descuento */}
            {editForm.discount > 0 && (
              <div className={clsx('flex items-center justify-between px-3 py-2 rounded-xl text-sm', isDark ? 'bg-dark-800' : 'bg-gray-100')}>
                <span className={isDark ? 'text-dark-300' : 'text-gray-600'}>Nuevo total estimado:</span>
                <span className="font-bold text-primary-500 font-mono">
                  {formatCurrency(
                    editForm.discountType === 'PORCENTAJE'
                      ? Number(sale.subtotal) - (Number(sale.subtotal) * Number(editForm.discount)) / 100
                      : Number(sale.subtotal) - Number(editForm.discount)
                  )}
                </span>
              </div>
            )}

            {/* Acciones */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
              >
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar Cambios
              </button>
              <button
                onClick={() => setEditing(false)}
                className={clsx('px-5 py-2.5 rounded-xl text-sm font-medium transition-colors', isDark ? 'text-dark-400 hover:bg-dark-800' : 'text-gray-500 hover:bg-gray-100')}
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Info */}
        <div className={clsx('rounded-2xl border p-5 space-y-4', cardBase)}>
          <h3 className={clsx('font-semibold', isDark ? 'text-white' : 'text-dark-900')}>Información</h3>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <User className={clsx('w-4 h-4 mt-0.5 shrink-0', isDark ? 'text-dark-400' : 'text-gray-400')} />
              <div>
                <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>Cliente</p>
                <p className={clsx('text-sm font-medium', isDark ? 'text-white' : 'text-dark-900')}>
                  {sale.customer?.name || 'Consumidor Final'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Receipt className={clsx('w-4 h-4 mt-0.5 shrink-0', isDark ? 'text-dark-400' : 'text-gray-400')} />
              <div>
                <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>Cajero</p>
                <p className={clsx('text-sm font-medium', isDark ? 'text-white' : 'text-dark-900')}>{sale.user?.name}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className={clsx('w-4 h-4 mt-0.5 shrink-0', isDark ? 'text-dark-400' : 'text-gray-400')} />
              <div>
                <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>Sucursal</p>
                <p className={clsx('text-sm font-medium', isDark ? 'text-white' : 'text-dark-900')}>{sale.branch?.name}</p>
              </div>
            </div>
            {sale.notes && (
              <div className={clsx('p-3 rounded-xl text-xs', isDark ? 'bg-dark-800 text-dark-300' : 'bg-gray-50 text-gray-600')}>
                <p className="font-semibold mb-0.5">Notas</p>
                <p>{sale.notes}</p>
              </div>
            )}
            {sale.status === 'CANCELADA' && sale.cancelReason && (
              <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-xl">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-0.5">Motivo cancelación</p>
                <p className="text-xs text-red-600 dark:text-red-400">{sale.cancelReason}</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment */}
        <div className={clsx('rounded-2xl border p-5 space-y-4', cardBase)}>
          <h3 className={clsx('font-semibold', isDark ? 'text-white' : 'text-dark-900')}>Pago</h3>

          <div className="space-y-2">
            {sale.payments?.map(p => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className={clsx('w-4 h-4', isDark ? 'text-dark-400' : 'text-gray-400')} />
                  <span className={clsx('text-sm', isDark ? 'text-dark-300' : 'text-gray-600')}>
                    {PAYMENT_LABELS[p.method] || p.method}
                  </span>
                  {p.reference && <span className={clsx('text-xs', isDark ? 'text-dark-500' : 'text-gray-400')}>#{p.reference}</span>}
                </div>
                <span className={clsx('font-mono font-semibold text-sm', isDark ? 'text-white' : 'text-dark-900')}>
                  {formatCurrency(p.amount)}
                </span>
              </div>
            ))}
          </div>

          <div className={clsx('border-t pt-3 space-y-1.5', isDark ? 'border-dark-800' : 'border-gray-100')}>
            <div className="flex justify-between text-sm">
              <span className={isDark ? 'text-dark-400' : 'text-gray-500'}>Subtotal</span>
              <span className={clsx('font-mono', isDark ? 'text-white' : 'text-dark-900')}>{formatCurrency(sale.subtotal)}</span>
            </div>
            {Number(sale.discount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-red-500">Descuento</span>
                <span className="text-red-500 font-mono">-{formatCurrency(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold">
              <span className={isDark ? 'text-white' : 'text-dark-900'}>Total</span>
              <span className="text-primary-500 font-mono">{formatCurrency(sale.total)}</span>
            </div>
            {Number(sale.change) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-emerald-500">Vuelto</span>
                <span className="text-emerald-500 font-mono">{formatCurrency(sale.change)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className={clsx('rounded-2xl border overflow-hidden', cardBase)}>
        <div className={clsx('p-5 border-b', isDark ? 'border-dark-800' : 'border-gray-100')}>
          <h3 className={clsx('font-semibold', isDark ? 'text-white' : 'text-dark-900')}>
            Productos ({sale.items?.length || 0})
          </h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-dark-800">
          {sale.items?.map(item => (
            <div key={item.id} className="flex items-center gap-4 px-5 py-4">
              <div className={clsx('w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0', isDark ? 'bg-dark-800' : 'bg-gray-100')}>
                {item.product?.images?.[0] ? (
                  <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={clsx('text-sm font-medium truncate', isDark ? 'text-white' : 'text-dark-900')}>{item.name}</p>
                <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>
                  {item.sku} · {formatCurrency(item.unitPrice)} c/u
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={clsx('text-sm font-bold font-mono', isDark ? 'text-white' : 'text-dark-900')}>
                  {formatCurrency(item.total)}
                </p>
                <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>
                  x{item.quantity}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Points */}
      {(sale.pointsEarned > 0 || sale.pointsUsed > 0) && (
        <div className={clsx('rounded-2xl border p-5 flex items-center gap-3', cardBase)}>
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
            <span className="text-lg">⭐</span>
          </div>
          <div>
            <p className={clsx('text-sm font-semibold', isDark ? 'text-white' : 'text-dark-900')}>
              Puntos de lealtad
            </p>
            <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>
              {sale.pointsEarned > 0 && `+${sale.pointsEarned} ganados`}
              {sale.pointsUsed > 0 && ` · -${sale.pointsUsed} canjeados`}
            </p>
          </div>
        </div>
      )}

      {/* Disclaimer fiscal */}
      <div className={clsx('rounded-xl border border-dashed px-4 py-3 text-center', isDark ? 'border-dark-700 bg-dark-900/50' : 'border-gray-200 bg-gray-50')}>
        <p className={clsx('text-xs', isDark ? 'text-dark-500' : 'text-gray-400')}>
          ⚠ Documento sin validez fiscal. Uso interno y visual únicamente.
        </p>
      </div>

      {/* Return Modal */}
      <AnimatePresence>
        {showReturn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.6)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={clsx('w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden', isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100')}
            >
              <div className={clsx('flex items-center justify-between px-6 py-4 border-b', isDark ? 'border-dark-800' : 'border-gray-100')}>
                <h2 className={clsx('text-lg font-display font-bold flex items-center gap-2', isDark ? 'text-white' : 'text-dark-900')}>
                  <RotateCcw className="w-5 h-5 text-amber-500" />
                  Procesar Devolución
                </h2>
                <button onClick={() => setShowReturn(false)} className={clsx('p-1.5 rounded-lg', isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-gray-500')}>
                  Ingrese la cantidad a devolver para cada ítem (0 = no devolver).
                </p>
                <div className="space-y-2">
                  {returnItems.map((item, idx) => (
                    <div key={idx} className={clsx('flex items-center gap-3 px-4 py-3 rounded-xl border', isDark ? 'border-dark-700 bg-dark-800' : 'border-gray-100 bg-gray-50')}>
                      <span className={clsx('flex-1 text-sm font-medium', isDark ? 'text-white' : 'text-dark-900')}>{item.name}</span>
                      <span className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>máx. {item.maxQty}</span>
                      <input
                        type="number" min="0" max={item.maxQty}
                        value={item.quantity}
                        onChange={e => setReturnItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.min(Number(e.target.value), item.maxQty) } : it))}
                        className={clsx('w-16 text-center px-2 py-1 rounded-lg border text-sm outline-none', isDark ? 'bg-dark-900 border-dark-600 text-white' : 'bg-white border-gray-200 text-dark-900')}
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className={clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700')}>Motivo de devolución</label>
                  <textarea
                    value={returnReason}
                    onChange={e => setReturnReason(e.target.value)}
                    rows={2}
                    placeholder="Descripción del motivo..."
                    className={clsx('w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none', isDark ? 'bg-dark-800 border-dark-700 text-white placeholder:text-dark-500' : 'bg-white border-gray-200 text-dark-900 placeholder:text-gray-400')}
                  />
                </div>
              </div>

              <div className={clsx('flex justify-end gap-3 px-6 py-4 border-t', isDark ? 'border-dark-800' : 'border-gray-100')}>
                <button onClick={() => setShowReturn(false)} className={clsx('px-5 py-2.5 rounded-xl text-sm font-medium', isDark ? 'text-dark-400 hover:bg-dark-800' : 'text-gray-500 hover:bg-gray-100')}>
                  Cancelar
                </button>
                <button
                  onClick={handleReturn}
                  disabled={returnMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
                >
                  {returnMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  Confirmar Devolución
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
