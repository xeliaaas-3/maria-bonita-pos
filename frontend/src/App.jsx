// ============================================
// BOUTIQUE POS - App Principal
// ============================================

import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { useEffect } from 'react';

// Layouts
import DashboardLayout from '@/components/layout/DashboardLayout';
import AuthLayout from '@/components/layout/AuthLayout';

// Pages
import LoginPage from '@/pages/auth/LoginPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import DashboardPage from '@/pages/DashboardPage';
import POSPage from '@/pages/POSPage';
import ProductsPage from '@/pages/products/ProductsPage';
import ProductFormPage from '@/pages/products/ProductFormPage';
import InventoryPage from '@/pages/InventoryPage';
import CustomersPage from '@/pages/customers/CustomersPage';
import CustomerDetailPage from '@/pages/customers/CustomerDetailPage';
import SalesPage from '@/pages/sales/SalesPage';
import SaleDetailPage from '@/pages/sales/SaleDetailPage';
import CashPage from '@/pages/CashPage';
import ReportsPage from '@/pages/ReportsPage';
import UsersPage from '@/pages/settings/UsersPage';
import SettingsPage from '@/pages/settings/SettingsPage';
import NotFoundPage from '@/pages/NotFoundPage';
import LayawaysPage from '@/pages/layaways/LayawaysPage';
import OrdersPage from '@/pages/orders/OrdersPage';
import SuppliersPage from '@/pages/suppliers/SuppliersPage';
import LabelsPage from '@/pages/labels/LabelsPage';
import PurchasesPage from '@/pages/purchases/PurchasesPage';
import TransfersPage from '@/pages/transfers/TransfersPage';

// Components
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import RoleGuard from '@/components/auth/RoleGuard';

function App() {
  const { isDark } = useThemeStore();
  
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: isDark ? '#1a1a24' : '#fff',
            color: isDark ? '#f7f7f8' : '#1a1a24',
            border: isDark ? '1px solid #2d2d3a' : '1px solid #e0e0e8',
            borderRadius: '12px',
            fontSize: '14px',
            fontFamily: 'Plus Jakarta Sans'
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } }
        }}
      />

      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Dashboard Routes */}
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pos" element={<POSPage />} />
          
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/new" element={<RoleGuard roles={['ADMIN', 'CAJERO']}><ProductFormPage /></RoleGuard>} />
          <Route path="/products/:id/edit" element={<RoleGuard roles={['ADMIN', 'CAJERO']}><ProductFormPage /></RoleGuard>} />
          
          <Route path="/inventory" element={<InventoryPage />} />
          
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/sales/:id" element={<SaleDetailPage />} />
          
          <Route path="/cash" element={<CashPage />} />
          
          <Route path="/reports" element={<RoleGuard roles={['ADMIN', 'CAJERO']}><ReportsPage /></RoleGuard>} />
          
          <Route path="/settings" element={<RoleGuard roles={['ADMIN']}><SettingsPage /></RoleGuard>} />
          <Route path="/settings/users" element={<RoleGuard roles={['ADMIN']}><UsersPage /></RoleGuard>} />
          <Route path="/layaways" element={<LayawaysPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/suppliers" element={<RoleGuard roles={['ADMIN', 'CAJERO']}><SuppliersPage /></RoleGuard>} />
          <Route path="/labels" element={<LabelsPage />} />
          <Route path="/purchases" element={<RoleGuard roles={['ADMIN', 'CAJERO']}><PurchasesPage /></RoleGuard>} />
          <Route path="/transfers" element={<RoleGuard roles={['ADMIN', 'CAJERO']}><TransfersPage /></RoleGuard>} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export default App;
