// ============================================
// TOPBAR — con panel de notificaciones real
// ============================================

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Menu, Bell, Moon, Sun, Settings, LogOut, CheckCheck, AlertTriangle, Info, Package, X } from 'lucide-react';
import { useThemeStore } from '@/store/theme.store';
import { useAuthStore } from '@/store/auth.store';
import { clsx } from 'clsx';
import { getInitials, formatDateTime } from '@/utils/format';
import api from '@/services/api';

const ROUTE_LABELS = {
  '/dashboard': 'Dashboard',
  '/pos': 'Punto de Venta',
  '/products': 'Productos',
  '/inventory': 'Inventario',
  '/customers': 'Clientes',
  '/sales': 'Ventas',
  '/cash': 'Caja',
  '/reports': 'Reportes',
  '/settings': 'Configuración',
  '/settings/users': 'Usuarios',
  '/layaways': 'Apartados',
  '/orders': 'Encargos',
  '/suppliers': 'Proveedores',
  '/labels': 'Etiquetas y Catálogo',
};

const NOTIF_ICONS = {
  warning: AlertTriangle,
  error:   AlertTriangle,
  success: CheckCheck,
  info:    Info,
  stock:   Package,
};
const NOTIF_COLORS = {
  warning: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
  error:   'text-red-500 bg-red-50 dark:bg-red-500/10',
  success: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
  info:    'text-blue-500 bg-blue-50 dark:bg-blue-500/10',
  stock:   'text-violet-500 bg-violet-50 dark:bg-violet-500/10',
};

export default function Topbar({ onToggleSidebar, onMobileMenu }) {
  const { isDark, toggle } = useThemeStore();
  const { user, logout }   = useAuthStore();
  const location           = useLocation();
  const navigate           = useNavigate();
  const queryClient        = useQueryClient();

  const [showUserMenu,  setShowUserMenu]  = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const pageTitle = ROUTE_LABELS[location.pathname] || 'Maria Bonita';

  // Fetch notifications
  const { data: notifs = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data.data || []),
    refetchInterval: 30000,
  });

  const unreadCount = notifs.filter(n => !n.read).length;

  const markReadMutation = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  const menuBase = clsx(
    'absolute right-0 top-12 rounded-2xl border shadow-2xl z-50 overflow-hidden',
    isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100'
  );

  return (
    <header className={clsx(
      'h-16 flex items-center px-4 gap-3 border-b shrink-0',
      isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100'
    )}>
      {/* Toggle sidebar desktop */}
      <button onClick={onToggleSidebar} className={clsx('hidden lg:flex p-2 rounded-xl transition-colors', isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}>
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile menu */}
      <button onClick={onMobileMenu} className={clsx('flex lg:hidden p-2 rounded-xl transition-colors', isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}>
        <Menu className="w-5 h-5" />
      </button>

      <h2 className={clsx('font-semibold text-sm', isDark ? 'text-white' : 'text-dark-900')}>
        {pageTitle}
      </h2>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        {/* Theme */}
        <button onClick={toggle} className={clsx('p-2 rounded-xl transition-colors', isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}>
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* ── NOTIFICATIONS ── */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifPanel(v => !v); setShowUserMenu(false); }}
            className={clsx('relative p-2 rounded-xl transition-colors', isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifPanel && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifPanel(false)} />
              <div className={clsx(menuBase, 'w-80 z-50')}>
                {/* Header */}
                <div className={clsx('flex items-center justify-between px-4 py-3 border-b', isDark ? 'border-dark-800' : 'border-gray-100')}>
                  <div>
                    <p className={clsx('text-sm font-bold', isDark ? 'text-white' : 'text-dark-900')}>Notificaciones</p>
                    {unreadCount > 0 && <p className="text-xs text-primary-500">{unreadCount} sin leer</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllMutation.mutate()}
                        className={clsx('text-xs px-2 py-1 rounded-lg transition-colors', isDark ? 'hover:bg-dark-700 text-dark-400' : 'hover:bg-gray-100 text-gray-500')}
                      >
                        Marcar todas
                      </button>
                    )}
                    <button onClick={() => setShowNotifPanel(false)} className={clsx('p-1 rounded-lg', isDark ? 'hover:bg-dark-700 text-dark-500' : 'hover:bg-gray-100 text-gray-400')}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* List */}
                <div className="max-h-96 overflow-y-auto">
                  {notifs.length === 0 ? (
                    <div className="py-12 text-center">
                      <Bell className={clsx('w-8 h-8 mx-auto mb-2 opacity-20', isDark ? 'text-dark-400' : 'text-gray-400')} />
                      <p className={clsx('text-sm', isDark ? 'text-dark-500' : 'text-gray-400')}>Sin notificaciones</p>
                    </div>
                  ) : (
                    notifs.map(n => {
                      const Icon = NOTIF_ICONS[n.type] || Info;
                      const colorCls = NOTIF_COLORS[n.type] || NOTIF_COLORS.info;
                      return (
                        <button
                          key={n.id}
                          onClick={() => { markReadMutation.mutate(n.id); if (n.link) { navigate(n.link); setShowNotifPanel(false); } }}
                          className={clsx(
                            'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b last:border-b-0',
                            !n.read && (isDark ? 'bg-primary-500/5' : 'bg-primary-50/40'),
                            isDark ? 'hover:bg-dark-800 border-dark-800' : 'hover:bg-gray-50 border-gray-50'
                          )}
                        >
                          <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', colorCls)}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={clsx('text-sm font-semibold leading-tight', isDark ? 'text-white' : 'text-dark-900')}>{n.title}</p>
                            <p className={clsx('text-xs mt-0.5 leading-relaxed', isDark ? 'text-dark-400' : 'text-gray-500')}>{n.message}</p>
                            <p className={clsx('text-[10px] mt-1', isDark ? 'text-dark-600' : 'text-gray-400')}>
                              {formatDateTime(n.createdAt)}
                            </p>
                          </div>
                          {!n.read && <div className="w-2 h-2 bg-primary-500 rounded-full shrink-0 mt-1.5" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── USER MENU ── */}
        <div className="relative ml-1">
          <button
            onClick={() => { setShowUserMenu(v => !v); setShowNotifPanel(false); }}
            className={clsx('flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors', isDark ? 'hover:bg-dark-800' : 'hover:bg-gray-100')}
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold">
              {getInitials(user?.name)}
            </div>
            <div className="hidden sm:block text-left">
              <p className={clsx('text-xs font-semibold leading-none', isDark ? 'text-white' : 'text-dark-900')}>{user?.name?.split(' ')[0]}</p>
              <p className={clsx('text-[10px] leading-none mt-0.5', isDark ? 'text-dark-400' : 'text-gray-500')}>{user?.role}</p>
            </div>
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className={clsx(menuBase, 'w-48')}>
                <div className={clsx('px-4 py-3 border-b', isDark ? 'border-dark-800' : 'border-gray-100')}>
                  <p className={clsx('text-sm font-semibold', isDark ? 'text-white' : 'text-dark-900')}>{user?.name}</p>
                  <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>{user?.email}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
                    className={clsx('w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors', isDark ? 'hover:bg-dark-800 text-dark-300' : 'hover:bg-gray-50 text-gray-700')}
                  >
                    <Settings className="w-4 h-4" />
                    Configuración
                  </button>
                  <button
                    onClick={() => { setShowUserMenu(false); logout(); }}
                    className={clsx('w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors text-red-500', isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-50')}
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
