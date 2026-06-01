// ============================================
// DASHBOARD - Página Principal
// ============================================

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, ShoppingBag, Users,
  DollarSign, Package, AlertTriangle, ArrowRight,
  Zap, BarChart2
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, ArcElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '@/services/api';
import { useThemeStore } from '@/store/theme.store';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency } from '@/utils/format';
import { clsx } from 'clsx';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function DashboardPage() {
  const { isDark } = useThemeStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data.data),
    refetchInterval: 30000
  });

  const textColor = isDark ? '#e0e0e8' : '#1a1a24';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const cardBase = isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100';

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? '#1a1a24' : '#fff',
        titleColor: textColor,
        bodyColor: textColor,
        borderColor: isDark ? '#2d2d3a' : '#e0e0e8',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => ` ${formatCurrency(ctx.raw)}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: { color: isDark ? '#747685' : '#9193a1', font: { size: 11 } },
        border: { display: false }
      },
      y: {
        grid: { color: gridColor },
        ticks: {
          color: isDark ? '#747685' : '#9193a1',
          font: { size: 11 },
          callback: (v) => formatCurrency(v, true)
        },
        border: { display: false }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={clsx('h-28 rounded-2xl animate-pulse', isDark ? 'bg-dark-800' : 'bg-gray-100')} />
          ))}
        </div>
        <div className={clsx('h-72 rounded-2xl animate-pulse', isDark ? 'bg-dark-800' : 'bg-gray-100')} />
      </div>
    );
  }

  const stats = [
    {
      label: 'Ventas Hoy',
      value: formatCurrency(data?.today?.revenue || 0),
      sub: `${data?.today?.sales || 0} transacciones`,
      icon: DollarSign,
      color: 'text-emerald-500',
      bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
      trend: null
    },
    {
      label: 'Ventas del Mes',
      value: formatCurrency(data?.month?.revenue || 0),
      sub: `${data?.month?.growth >= 0 ? '+' : ''}${data?.month?.growth}% vs mes anterior`,
      icon: TrendingUp,
      color: 'text-primary-500',
      bg: isDark ? 'bg-primary-500/10' : 'bg-primary-50',
      trend: data?.month?.growth
    },
    {
      label: 'Clientes Nuevos',
      value: data?.customers?.new || 0,
      sub: 'Este mes',
      icon: Users,
      color: 'text-violet-500',
      bg: isDark ? 'bg-violet-500/10' : 'bg-violet-50',
    },
    {
      label: 'Stock Bajo',
      value: data?.stock?.low?.length || 0,
      sub: `${data?.stock?.outOfStock || 0} sin stock`,
      icon: AlertTriangle,
      color: 'text-amber-500',
      bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
    }
  ];

  const lineData = {
    labels: data?.salesByDay?.map(d => format(new Date(d.date + 'T12:00:00'), 'EEE', { locale: es })) || [],
    datasets: [{
      data: data?.salesByDay?.map(d => d.revenue) || [],
      borderColor: '#4157ff',
      backgroundColor: 'rgba(65, 87, 255, 0.08)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#4157ff',
      pointBorderColor: isDark ? '#1a1a24' : '#fff',
      pointBorderWidth: 2,
    }]
  };

  const paymentColors = ['#4157ff', '#22c55e', '#f59e0b', '#8b5cf6'];
  const doughnutData = {
    labels: data?.paymentMethods?.map(p => p.method) || [],
    datasets: [{
      data: data?.paymentMethods?.map(p => Number(p._sum.amount)) || [],
      backgroundColor: paymentColors,
      borderWidth: 0,
      spacing: 2,
      borderRadius: 4
    }]
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={clsx(
            'text-2xl font-display font-bold',
            isDark ? 'text-white' : 'text-dark-900'
          )}>
            Buenos días, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className={clsx('text-sm mt-0.5', isDark ? 'text-dark-400' : 'text-gray-500')}>
            {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <button
          onClick={() => navigate('/pos')}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-xl transition-colors shadow-glow"
        >
          <Zap className="w-4 h-4" />
          Nueva Venta
        </button>
      </div>

      {/* Stats Cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              variants={item}
              className={clsx('rounded-2xl border p-4 sm:p-5', cardBase)}
            >
              <div className="flex items-start justify-between">
                <div className={clsx('p-2 rounded-xl', stat.bg)}>
                  <Icon className={clsx('w-5 h-5', stat.color)} />
                </div>
                {stat.trend !== undefined && stat.trend !== null && (
                  <span className={clsx(
                    'text-xs font-medium flex items-center gap-0.5',
                    stat.trend >= 0 ? 'text-emerald-500' : 'text-red-500'
                  )}>
                    {stat.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(stat.trend)}%
                  </span>
                )}
              </div>
              <div className="mt-3">
                <p className={clsx(
                  'text-xl sm:text-2xl font-bold font-mono',
                  isDark ? 'text-white' : 'text-dark-900'
                )}>
                  {stat.value}
                </p>
                <p className={clsx('text-xs mt-1', isDark ? 'text-dark-400' : 'text-gray-500')}>
                  {stat.label}
                </p>
                <p className={clsx('text-xs mt-0.5', isDark ? 'text-dark-500' : 'text-gray-400')}>
                  {stat.sub}
                </p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Línea de ventas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={clsx('lg:col-span-2 rounded-2xl border p-5', cardBase)}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className={clsx('font-semibold', isDark ? 'text-white' : 'text-dark-900')}>
              Ventas — Últimos 7 días
            </h3>
            <BarChart2 className={clsx('w-4 h-4', isDark ? 'text-dark-400' : 'text-gray-400')} />
          </div>
          <div className="h-56">
            <Line data={lineData} options={chartOptions} />
          </div>
        </motion.div>

        {/* Métodos de pago */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={clsx('rounded-2xl border p-5', cardBase)}
        >
          <h3 className={clsx('font-semibold mb-4', isDark ? 'text-white' : 'text-dark-900')}>
            Pagos de Hoy
          </h3>
          {data?.paymentMethods?.length > 0 ? (
            <>
              <div className="h-40">
                <Doughnut
                  data={doughnutData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { cornerRadius: 8 } },
                    cutout: '70%'
                  }}
                />
              </div>
              <div className="mt-4 space-y-2">
                {data.paymentMethods.map((pm, i) => (
                  <div key={pm.method} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: paymentColors[i] }} />
                      <span className={isDark ? 'text-dark-300' : 'text-gray-600'}>{pm.method}</span>
                    </div>
                    <span className={clsx('font-mono font-medium', isDark ? 'text-white' : 'text-dark-900')}>
                      {formatCurrency(pm._sum.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className={clsx('h-40 flex items-center justify-center text-sm', isDark ? 'text-dark-500' : 'text-gray-400')}>
              Sin ventas hoy
            </div>
          )}
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={clsx('rounded-2xl border p-5', cardBase)}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className={clsx('font-semibold', isDark ? 'text-white' : 'text-dark-900')}>
              Más Vendidos del Mes
            </h3>
            <button
              onClick={() => navigate('/reports')}
              className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1"
            >
              Ver más <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {data?.topProducts?.length > 0 ? data.topProducts.map((tp, i) => (
              <div key={tp.product?.id} className="flex items-center gap-3">
                <span className={clsx(
                  'w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0',
                  i === 0 ? 'bg-amber-100 text-amber-600' :
                  i === 1 ? 'bg-gray-100 text-gray-600' :
                  'bg-gray-50 text-gray-500'
                )}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-sm font-medium truncate', isDark ? 'text-white' : 'text-dark-900')}>
                    {tp.product?.name}
                  </p>
                  <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>
                    {tp.quantity} unidades
                  </p>
                </div>
                <span className={clsx('text-sm font-mono font-semibold shrink-0', isDark ? 'text-white' : 'text-dark-900')}>
                  {formatCurrency(tp.revenue)}
                </span>
              </div>
            )) : (
              <p className={clsx('text-sm text-center py-6', isDark ? 'text-dark-500' : 'text-gray-400')}>
                Sin datos este mes
              </p>
            )}
          </div>
        </motion.div>

        {/* Stock Bajo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className={clsx('rounded-2xl border p-5', cardBase)}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className={clsx('font-semibold', isDark ? 'text-white' : 'text-dark-900')}>
              Alertas de Stock
            </h3>
            <button
              onClick={() => navigate('/inventory')}
              className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1"
            >
              Ver inventario <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {data?.stock?.low?.length > 0 ? data.stock.low.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <div className={clsx(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  s.quantity === 0 ? 'bg-red-100' : 'bg-amber-100'
                )}>
                  <Package className={clsx('w-4 h-4', s.quantity === 0 ? 'text-red-500' : 'text-amber-500')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-sm font-medium truncate', isDark ? 'text-white' : 'text-dark-900')}>
                    {s.product?.name}
                  </p>
                  <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>
                    {s.variant ? `${[s.variant.size, s.variant.color].filter(Boolean).join(' / ')} · ` : ''}Mín: {s.product?.minStock} uds
                  </p>
                </div>
                <span className={clsx(
                  'px-2 py-0.5 rounded-full text-xs font-bold',
                  s.quantity === 0
                    ? 'bg-red-100 text-red-600'
                    : 'bg-amber-100 text-amber-600'
                )}>
                  {s.quantity}
                </span>
              </div>
            )) : (
              <div className={clsx('flex flex-col items-center justify-center py-6 gap-2', isDark ? 'text-dark-500' : 'text-gray-400')}>
                <Package className="w-8 h-8 opacity-50" />
                <p className="text-sm">Todo el stock está en buen nivel</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
