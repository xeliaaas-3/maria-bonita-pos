import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

export default function RoleGuard({ children, roles }) {
  const { hasRole } = useAuthStore();
  if (!hasRole(...roles)) return <Navigate to="/dashboard" replace />;
  return children;
}
