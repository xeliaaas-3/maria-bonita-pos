// ============================================
// NOT FOUND PAGE
// ============================================

import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { useThemeStore } from '@/store/theme.store';
import { clsx } from 'clsx';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { isDark } = useThemeStore();

  return (
    <div className={clsx('min-h-screen flex items-center justify-center p-6', isDark ? 'bg-dark-950' : 'bg-gray-50')}>
      <div className="text-center">
        <p className="text-8xl font-display font-bold text-primary-500 mb-4">404</p>
        <h1 className={clsx('text-2xl font-bold mb-2', isDark ? 'text-white' : 'text-dark-900')}>Página no encontrada</h1>
        <p className={clsx('text-sm mb-8', isDark ? 'text-dark-400' : 'text-gray-500')}>
          La página que buscas no existe o fue movida.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => navigate(-1)} className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium', isDark ? 'border-dark-700 text-dark-300' : 'border-gray-200 text-gray-600')}>
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium">
            <Home className="w-4 h-4" /> Ir al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
