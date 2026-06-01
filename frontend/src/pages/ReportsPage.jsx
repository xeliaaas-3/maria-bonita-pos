// ============================================
// REPORTES PAGE
// ============================================

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart3, Download, Calendar, TrendingUp, Package,
  Users, Wallet, FileText, FileSpreadsheet, Loader2
} from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import * as XLSX from 'xlsx';
import api from '@/services/api';
import { toast } from 'react-hot-toast';
import { useThemeStore } from '@/store/theme.store';
import { formatCurrency, formatDate } from '@/utils/format';
import { clsx } from 'clsx';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const REPORT_TYPES = [
  { id: 'sales', label: 'Ventas', icon: TrendingUp, color: 'text-emerald-500' },
  { id: 'products', label: 'Productos', icon: Package, color: 'text-blue-500' },
  { id: 'customers', label: 'Clientes', icon: Users, color: 'text-violet-500' },
  { id: 'cash', label: 'Caja', icon: Wallet, color: 'text-amber-500' },
];

export default function ReportsPage() {
  const { isDark } = useThemeStore();
  const [reportType, setReportType] = useState('sales');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const cardBase = isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100';

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['reports', reportType, dateRange],
    queryFn: () => api.get('/reports', {
      params: { type: reportType, startDate: dateRange.start, endDate: dateRange.end }
    }).then(r => r.data.data),
    keepPreviousData: true
  });

  const exportExcel = () => {
    if (!reportData?.tableData) return;
    const ws = XLSX.utils.json_to_sheet(reportData.tableData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    XLSX.writeFile(wb, `reporte-${reportType}-${dateRange.start}.xlsx`);
  };

  const exportPDF = async () => {
    try {
      const response = await api.get('/reports/pdf', {
        params: { type: reportType, startDate: dateRange.start, endDate: dateRange.end },
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      win?.focus();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('Error al generar PDF del reporte');
    }
  };

  const textColor = isDark ? '#e0e0e8' : '#1a1a24';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: isDark ? '#747685' : '#9193a1', font: { size: 11 } }, border: { display: false } },
      y: { grid: { color: gridColor }, ticks: { color: isDark ? '#747685' : '#9193a1', font: { size: 11 } }, border: { display: false } }
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-screen-xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={clsx('text-2xl font-display font-bold', isDark ? 'text-white' : 'text-dark-900')}>
            Reportes
          </h1>
          <p className={clsx('text-sm mt-0.5', isDark ? 'text-dark-400' : 'text-gray-500')}>
            Análisis completo del negocio
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportExcel}
            className={clsx('flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors', isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            Excel
          </button>
          <button onClick={exportPDF} className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium bg-primary-500 text-white hover:bg-primary-600">
            <FileText className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className={clsx('flex items-center gap-2 p-1 rounded-2xl border w-fit', cardBase)}>
        {REPORT_TYPES.map(rt => {
          const Icon = rt.icon;
          return (
            <button
              key={rt.id}
              onClick={() => setReportType(rt.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                reportType === rt.id
                  ? 'bg-primary-500 text-white shadow-glow'
                  : isDark ? 'text-dark-400 hover:text-dark-200' : 'text-gray-500 hover:text-dark-900'
              )}
            >
              <Icon className={clsx('w-4 h-4', reportType === rt.id ? 'text-white' : rt.color)} />
              {rt.label}
            </button>
          );
        })}
      </div>

      {/* Date Filter */}
      <div className={clsx('flex items-center gap-4 p-4 rounded-2xl border', cardBase)}>
        <Calendar className={clsx('w-4 h-4 shrink-0', isDark ? 'text-dark-400' : 'text-gray-400')} />
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className={clsx('text-xs font-medium', isDark ? 'text-dark-400' : 'text-gray-500')}>Desde:</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange(d => ({ ...d, start: e.target.value }))}
              className={clsx('text-sm rounded-xl px-3 py-1.5 border outline-none', isDark ? 'bg-dark-800 border-dark-700 text-white' : 'bg-gray-50 border-gray-200')}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className={clsx('text-xs font-medium', isDark ? 'text-dark-400' : 'text-gray-500')}>Hasta:</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange(d => ({ ...d, end: e.target.value }))}
              className={clsx('text-sm rounded-xl px-3 py-1.5 border outline-none', isDark ? 'bg-dark-800 border-dark-700 text-white' : 'bg-gray-50 border-gray-200')}
            />
          </div>
        </div>

        {/* Quick ranges */}
        <div className="flex items-center gap-1 ml-auto">
          {[
            { label: 'Hoy', days: 0 },
            { label: '7d', days: 7 },
            { label: '30d', days: 30 },
            { label: 'Mes', days: -1 }
          ].map(r => (
            <button
              key={r.label}
              onClick={() => {
                const end = new Date().toISOString().split('T')[0];
                let start;
                if (r.days === 0) {
                  start = end;
                } else if (r.days === -1) {
                  start = new Date(new Date().setDate(1)).toISOString().split('T')[0];
                } else {
                  const d = new Date();
                  d.setDate(d.getDate() - r.days);
                  start = d.toISOString().split('T')[0];
                }
                setDateRange({ start, end });
              }}
              className={clsx('px-2.5 py-1 rounded-lg text-xs font-medium transition-colors', isDark ? 'text-dark-400 hover:bg-dark-800 hover:text-dark-200' : 'text-gray-500 hover:bg-gray-100 hover:text-dark-900')}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {reportData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {reportData.summary.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={clsx('rounded-2xl border p-5', cardBase)}
                >
                  <p className={clsx('text-xs font-medium mb-1', isDark ? 'text-dark-400' : 'text-gray-500')}>{stat.label}</p>
                  <p className={clsx('text-xl font-bold font-mono', isDark ? 'text-white' : 'text-dark-900')}>{stat.value}</p>
                  {stat.sub && <p className={clsx('text-xs mt-0.5', isDark ? 'text-dark-500' : 'text-gray-400')}>{stat.sub}</p>}
                </motion.div>
              ))}
            </div>
          )}

          {/* Chart */}
          {reportData?.chartData && (
            <div className={clsx('rounded-2xl border p-5', cardBase)}>
              <h3 className={clsx('font-semibold mb-4', isDark ? 'text-white' : 'text-dark-900')}>
                Evolución del período
              </h3>
              <div className="h-64">
                <Bar
                  data={{
                    labels: reportData.chartData.labels,
                    datasets: [{
                      data: reportData.chartData.values,
                      backgroundColor: 'rgba(65, 87, 255, 0.7)',
                      borderRadius: 8,
                      borderSkipped: false
                    }]
                  }}
                  options={chartOpts}
                />
              </div>
            </div>
          )}

          {/* Table */}
          {reportData?.tableData?.length > 0 && (
            <div className={clsx('rounded-2xl border overflow-hidden', cardBase)}>
              <div className={clsx('p-5 border-b flex items-center justify-between', isDark ? 'border-dark-800' : 'border-gray-100')}>
                <h3 className={clsx('font-semibold', isDark ? 'text-white' : 'text-dark-900')}>
                  Detalle del período
                </h3>
                <span className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>
                  {reportData.tableData.length} registros
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={clsx('border-b', isDark ? 'border-dark-800' : 'border-gray-100')}>
                      {reportData.tableHeaders?.map(h => (
                        <th key={h} className={clsx('text-left px-5 py-3 text-xs font-semibold', isDark ? 'text-dark-400' : 'text-gray-500')}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.tableData.slice(0, 50).map((row, i) => (
                      <tr key={i} className={clsx('border-b last:border-0', isDark ? 'border-dark-800/50 hover:bg-dark-800/30' : 'border-gray-50 hover:bg-gray-50/50')}>
                        {Object.values(row).map((cell, j) => (
                          <td key={j} className={clsx('px-5 py-3', isDark ? 'text-dark-300' : 'text-dark-700')}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
