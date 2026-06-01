// ============================================
// CLIENTES PAGE
// ============================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Plus, Search, Users, Edit2, Trash2, Phone,
  MessageCircle, Star, Crown, TrendingUp, Gift,
  ArrowRight, Mail, Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '@/services/api';
import { useThemeStore } from '@/store/theme.store';
import { formatCurrency, formatDate, getInitials } from '@/utils/format';
import { clsx } from 'clsx';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import CustomerModal from '@/components/customers/CustomerModal';

const TIER_CONFIG = {
  REGULAR: { label: 'Regular', color: 'gray', icon: Users },
  VIP: { label: 'VIP', color: 'amber', icon: Star },
  PREMIUM: { label: 'Premium', color: 'violet', icon: Crown }
};

export default function CustomersPage() {
  const { isDark } = useThemeStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, tier, page],
    queryFn: () => api.get('/customers', {
      params: { search, tier, page, limit: 20 }
    }).then(r => r.data),
    keepPreviousData: true
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/customers/${id}`),
    onSuccess: () => {
      toast.success('Cliente eliminado');
      queryClient.invalidateQueries(['customers']);
    }
  });

  const cardBase = isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100';

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-screen-2xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={clsx('text-2xl font-display font-bold', isDark ? 'text-white' : 'text-dark-900')}>
            Clientes
          </h1>
          <p className={clsx('text-sm mt-0.5', isDark ? 'text-dark-400' : 'text-gray-500')}>
            {data?.pagination?.total || 0} clientes registrados
          </p>
        </div>
        <button
          onClick={() => { setEditCustomer(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-xl transition-colors shadow-glow"
        >
          <Plus className="w-4 h-4" />
          Nuevo Cliente
        </button>
      </div>

      {/* Filters */}
      <div className={clsx('flex flex-wrap items-center gap-3 p-4 rounded-2xl border', cardBase)}>
        <div className="flex items-center gap-2 flex-1 min-w-48">
          <Search className={clsx('w-4 h-4 shrink-0', isDark ? 'text-dark-400' : 'text-gray-400')} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre, teléfono, email..."
            className={clsx('flex-1 text-sm bg-transparent outline-none', isDark ? 'text-white placeholder:text-dark-500' : 'text-dark-900 placeholder:text-gray-400')}
          />
        </div>
        <div className="flex items-center gap-2">
          {['', 'REGULAR', 'VIP', 'PREMIUM'].map(t => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={clsx(
                'px-3 py-1.5 rounded-xl text-xs font-medium transition-colors',
                tier === t
                  ? 'bg-primary-500 text-white'
                  : isDark ? 'text-dark-400 hover:bg-dark-800' : 'text-gray-500 hover:bg-gray-100'
              )}
            >
              {t || 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className={clsx('rounded-2xl h-48 animate-pulse', isDark ? 'bg-dark-800' : 'bg-gray-100')} />
          ))}
        </div>
      ) : data?.data?.length === 0 ? (
        <EmptyState icon={Users} title="No hay clientes" description="Agrega tu primer cliente" isDark={isDark} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data?.data?.map((customer, i) => {
            const tier = TIER_CONFIG[customer.tier];
            const TierIcon = tier.icon;
            return (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={clsx('rounded-2xl border p-5 space-y-4 cursor-pointer group', cardBase, 'hover:border-primary-500/30 transition-colors')}
                onClick={() => window.location.href = `/customers/${customer.id}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {getInitials(customer.name)}
                    </div>
                    <div className="min-w-0">
                      <p className={clsx('font-semibold truncate', isDark ? 'text-white' : 'text-dark-900')}>
                        {customer.name}
                      </p>
                      <div className={clsx('flex items-center gap-1 text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>
                        <TierIcon className="w-3 h-3" />
                        {tier.label}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setEditCustomer(customer); setShowModal(true); }}
                    className={clsx('p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all', isDark ? 'hover:bg-dark-700 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Contact */}
                <div className="space-y-1.5">
                  {customer.phone && (
                    <div className={clsx('flex items-center gap-2 text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>
                      <Phone className="w-3 h-3 shrink-0" />
                      {customer.phone}
                      {customer.whatsapp && (
                        <a
                          href={`https://wa.me/${customer.whatsapp.replace(/\D/g, '')}`}
                          onClick={e => e.stopPropagation()}
                          className="ml-auto text-emerald-500 hover:text-emerald-600"
                          target="_blank" rel="noreferrer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  )}
                  {customer.email && (
                    <div className={clsx('flex items-center gap-2 text-xs truncate', isDark ? 'text-dark-400' : 'text-gray-500')}>
                      <Mail className="w-3 h-3 shrink-0" />
                      {customer.email}
                    </div>
                  )}
                  {customer.birthdate && (
                    <div className={clsx('flex items-center gap-2 text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>
                      <Calendar className="w-3 h-3 shrink-0" />
                      {formatDate(customer.birthdate)}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className={clsx('grid grid-cols-3 gap-2 pt-3 border-t', isDark ? 'border-dark-800' : 'border-gray-100')}>
                  <div className="text-center">
                    <p className={clsx('text-xs font-bold', isDark ? 'text-white' : 'text-dark-900')}>
                      {formatCurrency(customer.totalSpent, true)}
                    </p>
                    <p className={clsx('text-[10px]', isDark ? 'text-dark-500' : 'text-gray-400')}>Total</p>
                  </div>
                  <div className="text-center">
                    <p className={clsx('text-xs font-bold', isDark ? 'text-white' : 'text-dark-900')}>
                      {customer.points}
                    </p>
                    <p className={clsx('text-[10px]', isDark ? 'text-dark-500' : 'text-gray-400')}>Puntos</p>
                  </div>
                  <div className="text-center">
                    <p className={clsx('text-xs font-bold', customer.debt > 0 ? 'text-red-500' : isDark ? 'text-white' : 'text-dark-900')}>
                      {customer.debt > 0 ? formatCurrency(customer.debt, true) : '₲ 0'}
                    </p>
                    <p className={clsx('text-[10px]', isDark ? 'text-dark-500' : 'text-gray-400')}>Deuda</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {showModal && (
        <CustomerModal
          customer={editCustomer}
          onClose={() => { setShowModal(false); setEditCustomer(null); }}
          onSaved={() => { queryClient.invalidateQueries(['customers']); setShowModal(false); }}
          isDark={isDark}
        />
      )}
    </div>
  );
}
