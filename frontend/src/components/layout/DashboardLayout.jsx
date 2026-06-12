// ============================================
// DASHBOARD LAYOUT - Shell Principal
// ============================================

import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useThemeStore } from '@/store/theme.store';
import { socket } from '@/services/socket';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'react-hot-toast';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const { isDark } = useThemeStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Cerrar sidebar mobile al cambiar ruta
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location]);

  // Socket listeners globales
  useEffect(() => {
    const handleStockLow = (data) => {
      toast(`⚠️ Stock bajo: ${data.productName} (${data.currentStock} unidades)`, {
        icon: '📦',
        duration: 5000
      });
    };

    const handleNewSale = () => {
      // Sincronizar datos entre dispositivos de la misma sucursal
      queryClient.invalidateQueries(['dashboard']);
      queryClient.invalidateQueries(['cash-session-active']);
      queryClient.invalidateQueries(['products']);
      queryClient.invalidateQueries(['inventory']);
      queryClient.invalidateQueries(['pos-search']);
      queryClient.invalidateQueries(['sales']);
    };

    const handleStockUpdate = () => {
      queryClient.invalidateQueries(['products']);
      queryClient.invalidateQueries(['inventory']);
      queryClient.invalidateQueries(['pos-search']);
    };

    socket.on('stock:low', handleStockLow);
    socket.on('sale:created', handleNewSale);
    socket.on('stock:updated', handleStockUpdate);

    return () => {
      socket.off('stock:low', handleStockLow);
      socket.off('sale:created', handleNewSale);
      socket.off('stock:updated', handleStockUpdate);
    };
  }, [queryClient]);

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'dark bg-dark-950' : 'bg-gray-50'}`}>
      {/* Sidebar Desktop */}
      <div className={`hidden lg:flex transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'}`}>
        <Sidebar collapsed={!sidebarOpen} />
      </div>

      {/* Sidebar Mobile Overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-64 z-50 lg:hidden"
            >
              <Sidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onMobileMenu={() => setMobileSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
