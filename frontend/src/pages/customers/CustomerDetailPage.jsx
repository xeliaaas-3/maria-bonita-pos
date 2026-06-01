// ============================================
// CLIENTE DETALLE PAGE
// ============================================

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Phone, Mail, MessageCircle, MapPin,
  Calendar, Star, Crown, Users, TrendingUp, ShoppingBag,
  Gift, Edit2, Loader2, Receipt
} from 'lucide-react';
import api from '@/services/api';
import { useThemeStore } from '@/store/theme.store';
import { formatCurrency, formatDate, formatDateTime, getInitials } from '@/utils/format';
import { clsx } from 'clsx';
import Badge from '@/components/ui/Badge';
import CustomerModal from '@/components/customers/CustomerModal';

const TIER_CONFIG = {
  REGULAR: { label: 'Regular', color: 'gray', icon: Users, bg: 'bg-gray-100 dark:bg-gray-500/10' },
  VIP: { label: 'VIP', color: 'amber', icon: Star, bg: 'bg-amber-100 dark:bg-amber-500/10' },
  PREMIUM: { label: 'Premium', color: 'violet', icon: Crown, bg: 'bg-violet-100 dark:bg-violet-500/10' }
};

function DebtPaymentForm({ customerId, isDark, onPaid }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('EFECTIVO');
  const mutation = useMutation({
    mutationFn: (data) => api.patch(`/customers/${customerId}/debt-payment`, data),
    onSuccess: () => { toast.success('Pago registrado en cuenta corriente'); setAmount(''); onPaid(); },
    onError: () => toast.error('Error al registrar pago')
  });
  const inputClass = clsx('px-3 py-2 rounded-xl border text-sm outline-none transition-all', isDark ? 'bg-dark-800 border-dark-700 text-white focus:border-primary-500' : 'bg-white border-gray-200 text-dark-900 focus:border-primary-500');
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Monto a cobrar (₲)" className={clsx(inputClass, 'flex-1 min-w-32')} />
      <select value={method} onChange={e => setMethod(e.target.value)} className={clsx(inputClass, 'w-36')}>
        <option value="EFECTIVO">Efectivo</option>
        <option value="TARJETA">Tarjeta</option>
        <option value="TRANSFERENCIA">Transferencia</option>
        <option value="QR">QR</option>
      </select>
      <button onClick={() => { if (!amount) return; mutation.mutate({ amount: Number(amount), method }); }} disabled={mutation.isPending || !amount} className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
        Registrar Pago
      </button>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDark } = useThemeStore();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.get(`/customers/${id}`).then(r => r.data.data)
  });

  const cardBase = isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100';

  if (isLoading) return <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  if (!customer) return null;

  const tier = TIER_CONFIG[customer.tier] || TIER_CONFIG.REGULAR;
  const TierIcon = tier.icon;

  const stats = [
    { label: 'Total compras', value: formatCurrency(customer.totalSpent), icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Puntos', value: customer.points.toLocaleString(), icon: Gift, color: 'text-amber-500' },
    { label: 'Compras', value: customer.sales?.length || 0, icon: ShoppingBag, color: 'text-blue-500' },
    { label: 'Deuda', value: formatCurrency(customer.debt), icon: Receipt, color: customer.debt > 0 ? 'text-red-500' : 'text-gray-400' },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/customers')} className={clsx('p-2 rounded-xl transition-colors', isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className={clsx('text-xl font-display font-bold flex-1', isDark ? 'text-white' : 'text-dark-900')}>
          Perfil del Cliente
        </h1>
        <button
          onClick={() => setShowEdit(true)}
          className={clsx('flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors', isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}
        >
          <Edit2 className="w-4 h-4" />
          Editar
        </button>
      </div>

      {/* Profile Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={clsx('rounded-2xl border p-6', cardBase)}>
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {getInitials(customer.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className={clsx('text-xl font-bold', isDark ? 'text-white' : 'text-dark-900')}>{customer.name}</h2>
              <div className={clsx('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', tier.bg, `text-${tier.color === 'gray' ? 'gray-600' : tier.color + '-600'} dark:text-${tier.color === 'gray' ? 'gray-300' : tier.color + '-400'}`)}>
                <TierIcon className="w-3 h-3" />
                {tier.label}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className={clsx('flex items-center gap-1.5 text-sm', isDark ? 'text-dark-300 hover:text-white' : 'text-gray-600 hover:text-dark-900')}>
                  <Phone className="w-3.5 h-3.5" /> {customer.phone}
                </a>
              )}
              {customer.whatsapp && (
                <a href={`https://wa.me/${customer.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-emerald-500 hover:text-emerald-600">
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
              )}
              {customer.email && (
                <a href={`mailto:${customer.email}`} className={clsx('flex items-center gap-1.5 text-sm', isDark ? 'text-dark-300 hover:text-white' : 'text-gray-600 hover:text-dark-900')}>
                  <Mail className="w-3.5 h-3.5" /> {customer.email}
                </a>
              )}
              {customer.address && (
                <span className={clsx('flex items-center gap-1.5 text-sm', isDark ? 'text-dark-400' : 'text-gray-500')}>
                  <MapPin className="w-3.5 h-3.5" /> {customer.address}
                </span>
              )}
              {customer.birthdate && (
                <span className={clsx('flex items-center gap-1.5 text-sm', isDark ? 'text-dark-400' : 'text-gray-500')}>
                  <Calendar className="w-3.5 h-3.5" /> {formatDate(customer.birthdate)}
                </span>
              )}
            </div>
            {customer.notes && (
              <p className={clsx('mt-3 text-sm p-3 rounded-xl', isDark ? 'bg-dark-800 text-dark-300' : 'bg-gray-50 text-gray-600')}>
                {customer.notes}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className={clsx('rounded-2xl border p-4', cardBase)}>
              <Icon className={clsx('w-5 h-5 mb-2', stat.color)} />
              <p className={clsx('text-lg font-bold font-mono', isDark ? 'text-white' : 'text-dark-900')}>{stat.value}</p>
              <p className={clsx('text-xs mt-0.5', isDark ? 'text-dark-400' : 'text-gray-500')}>{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Purchase History */}
      <div className={clsx('rounded-2xl border overflow-hidden', cardBase)}>
        <div className={clsx('p-5 border-b', isDark ? 'border-dark-800' : 'border-gray-100')}>
          <h3 className={clsx('font-semibold', isDark ? 'text-white' : 'text-dark-900')}>
            Historial de Compras ({customer.sales?.length || 0})
          </h3>
        </div>
        {customer.sales?.length === 0 ? (
          <div className={clsx('p-10 text-center text-sm', isDark ? 'text-dark-500' : 'text-gray-400')}>
            Sin compras registradas
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-dark-800">
            {customer.sales?.map(sale => (
              <div
                key={sale.id}
                className={clsx('flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors', isDark ? 'hover:bg-dark-800/30' : 'hover:bg-gray-50/50')}
                onClick={() => navigate(`/sales/${sale.id}`)}
              >
                <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', isDark ? 'bg-dark-800' : 'bg-gray-100')}>
                  <ShoppingBag className={clsx('w-4 h-4', isDark ? 'text-dark-400' : 'text-gray-400')} />
                </div>
                <div className="flex-1">
                  <p className={clsx('text-sm font-medium', isDark ? 'text-white' : 'text-dark-900')}>
                    Venta #{sale.number}
                  </p>
                  <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>
                    {formatDateTime(sale.createdAt)} · {sale.items?.length || 0} productos
                  </p>
                </div>
                <div className="text-right">
                  <p className={clsx('font-mono font-bold text-sm', isDark ? 'text-white' : 'text-dark-900')}>
                    {formatCurrency(sale.total)}
                  </p>
                  <Badge variant={sale.status === 'COMPLETADA' ? 'success' : 'danger'} size="sm">
                    {sale.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Points History */}
      {customer.pointsHistory?.length > 0 && (
        <div className={clsx('rounded-2xl border overflow-hidden', cardBase)}>
          <div className={clsx('p-5 border-b', isDark ? 'border-dark-800' : 'border-gray-100')}>
            <h3 className={clsx('font-semibold', isDark ? 'text-white' : 'text-dark-900')}>Historial de Puntos</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-dark-800">
            {customer.pointsHistory.map(ph => (
              <div key={ph.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className={clsx('text-sm', isDark ? 'text-dark-300' : 'text-gray-700')}>{ph.description || ph.type}</p>
                  <p className={clsx('text-xs', isDark ? 'text-dark-500' : 'text-gray-400')}>{formatDate(ph.createdAt)}</p>
                </div>
                <span className={clsx('font-mono font-bold text-sm', ph.points > 0 ? 'text-emerald-500' : 'text-red-500')}>
                  {ph.points > 0 ? '+' : ''}{ph.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Cuenta Corriente (Deuda/Fiado) ── */}
      {Number(customer.debt) > 0 && (
        <div className={clsx('rounded-2xl border overflow-hidden', isDark ? 'bg-dark-900 border-red-500/30' : 'bg-red-50/30 border-red-200')}>
          <div className={clsx('p-5 border-b flex items-center justify-between', isDark ? 'border-dark-800' : 'border-red-100')}>
            <div>
              <h3 className={clsx('font-semibold flex items-center gap-2', isDark ? 'text-white' : 'text-dark-900')}>
                <Receipt className="w-4 h-4 text-red-500" />
                Cuenta Corriente
              </h3>
              <p className="text-xs text-red-500 mt-0.5">Saldo pendiente de pago</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-red-500 font-mono">{formatCurrency(customer.debt)}</p>
              <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>deuda total</p>
            </div>
          </div>
          <div className="p-5">
            <DebtPaymentForm customerId={id} isDark={isDark} onPaid={() => queryClient.invalidateQueries(['customer', id])} />
          </div>
        </div>
      )}

      {showEdit && (
        <CustomerModal
          customer={customer}
          onClose={() => setShowEdit(false)}
          onSaved={() => { queryClient.invalidateQueries(['customer', id]); setShowEdit(false); }}
          isDark={isDark}
        />
      )}
    </div>
  );
}
