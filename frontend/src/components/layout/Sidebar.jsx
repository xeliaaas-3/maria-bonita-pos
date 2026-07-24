// ============================================
// SIDEBAR - Navegación Principal
// ============================================

import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, ShoppingCart, Package, Archive,
  Users, Receipt, Wallet, BarChart3, Settings,
  UserCog, LogOut, Store, X,
  Zap, Tag, ClipboardList, Truck, Printer, ShoppingBag, ArrowLeftRight
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { clsx } from 'clsx';

const navItems = [
  {
    section: 'Principal',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: ShoppingCart, label: 'Punto de Venta', path: '/pos', highlight: true },
    ]
  },
  {
    section: 'Gestión',
    items: [
      { icon: Package, label: 'Productos', path: '/products' },
      { icon: Archive, label: 'Inventario', path: '/inventory' },
      { icon: Users, label: 'Clientes', path: '/customers' },
      { icon: Receipt, label: 'Ventas', path: '/sales' },
      { icon: Wallet, label: 'Caja', path: '/cash' },
      { icon: Tag, label: 'Apartados', path: '/layaways' },
      { icon: ClipboardList, label: 'Encargos', path: '/orders' },
      { icon: ShoppingBag, label: 'Compras', path: '/purchases', roles: ['ADMIN', 'CAJERO'] },
      { icon: ArrowLeftRight, label: 'Transferencias', path: '/transfers', roles: ['ADMIN', 'CAJERO'] },
    ]
  },
  {
    section: 'Administración',
    items: [
      { icon: BarChart3, label: 'Reportes', path: '/reports', roles: ['ADMIN', 'CAJERO'] },
      { icon: Truck, label: 'Proveedores', path: '/suppliers', roles: ['ADMIN', 'CAJERO'] },
      { icon: Printer, label: 'Etiquetas', path: '/labels' },
      { icon: UserCog, label: 'Usuarios', path: '/settings/users', roles: ['ADMIN'] },
      { icon: Settings, label: 'Configuración', path: '/settings', roles: ['ADMIN'] },
    ]
  }
];

export default function Sidebar({ collapsed = false, onClose }) {
  const { user, logout, hasRole } = useAuthStore();
  const { isDark } = useThemeStore();

  const sidebarClass = clsx(
    'flex flex-col h-full border-r transition-colors duration-200',
    isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100'
  );

  return (
    <aside className={sidebarClass}>
      {/* Logo + close button mobile */}
      <div className={clsx(
        'flex items-center h-16 px-4 border-b shrink-0',
        isDark ? 'border-dark-800' : 'border-gray-100'
      )}>
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow shrink-0">
            <Store className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col"
            >
              <span className={clsx('font-display font-bold text-sm leading-tight', isDark ? 'text-white' : 'text-dark-900')}>
                Maria Bonita
              </span>
              <span className="text-xs text-primary-500 font-medium">POS System</span>
            </motion.div>
          )}
        </div>
        {/* Botón cerrar — solo mobile (cuando onClose está definido) */}
        {onClose && (
          <button
            onClick={onClose}
            className={clsx('p-2 rounded-xl transition-colors', isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {navItems.map((section) => (
          <div key={section.section}>
            {!collapsed && (
              <p className={clsx(
                'text-[10px] font-semibold uppercase tracking-widest px-3 mb-2',
                isDark ? 'text-dark-500' : 'text-gray-400'
              )}>
                {section.section}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                if (item.roles && !hasRole(...item.roles)) return null;
                return (
                  <NavItem
                    key={item.path}
                    item={item}
                    collapsed={collapsed}
                    isDark={isDark}
                  />
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Info */}
      <div className={clsx(
        'border-t p-3 shrink-0',
        isDark ? 'border-dark-800' : 'border-gray-100'
      )}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className={clsx(
                'text-sm font-medium truncate',
                isDark ? 'text-white' : 'text-dark-900'
              )}>
                {user?.name}
              </p>
              <p className={clsx(
                'text-xs truncate',
                isDark ? 'text-dark-400' : 'text-gray-500'
              )}>
                {user?.role}
              </p>
            </div>
            <button
              onClick={logout}
              className={clsx(
                'p-1.5 rounded-lg transition-colors',
                isDark
                  ? 'hover:bg-dark-800 text-dark-400 hover:text-red-400'
                  : 'hover:bg-gray-100 text-gray-400 hover:text-red-500'
              )}
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            className={clsx(
              'w-full flex items-center justify-center p-2 rounded-lg transition-colors',
              isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-gray-100 text-gray-400'
            )}
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}

function NavItem({ item, collapsed, isDark }) {
  const Icon = item.icon;

  return (
    <li>
      <NavLink
        to={item.path}
        className={({ isActive }) => clsx(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative',
          isActive
            ? item.highlight
              ? 'bg-primary-500 text-white shadow-glow'
              : isDark
                ? 'bg-dark-800 text-primary-400'
                : 'bg-primary-50 text-primary-600'
            : isDark
              ? 'text-dark-400 hover:bg-dark-800 hover:text-white'
              : 'text-gray-600 hover:bg-gray-50 hover:text-dark-900',
          collapsed && 'justify-center px-2'
        )}
        title={collapsed ? item.label : undefined}
      >
        <Icon className={clsx('shrink-0', collapsed ? 'w-5 h-5' : 'w-4 h-4')} />
        {!collapsed && (
          <span className="truncate">{item.label}</span>
        )}
        {item.highlight && !collapsed && (
          <Zap className="w-3 h-3 ml-auto opacity-70" />
        )}
      </NavLink>
    </li>
  );
}
