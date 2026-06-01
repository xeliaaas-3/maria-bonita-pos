// ============================================
// LOGIN PAGE
// ============================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Store, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { clsx } from 'clsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { isDark, toggle } = useThemeStore();
  const [form, setForm] = useState({ email: 'admin@boutique.com', password: 'admin123' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(form.email, form.password);
    setLoading(false);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className={clsx(
      'min-h-screen flex',
      isDark ? 'bg-dark-950' : 'bg-gradient-to-br from-slate-50 via-white to-primary-50'
    )}>
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900">
        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-display font-bold text-lg leading-none">Boutique</p>
              <p className="text-primary-200 text-xs">POS System</p>
            </div>
          </div>

          <div>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl xl:text-5xl font-display font-bold text-white leading-tight mb-4"
            >
              Gestiona tu<br />boutique con<br />
              <span className="text-primary-200">elegancia</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-primary-200 text-sm leading-relaxed max-w-xs"
            >
              Sistema completo de punto de venta, inventario y gestión para tu boutique.
            </motion.p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Ventas/día', value: '∞' },
              { label: 'Productos', value: '∞' },
              { label: 'Clientes', value: '∞' }
            ].map(stat => (
              <div key={stat.label} className="bg-white/10 backdrop-blur rounded-2xl p-4">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-primary-200 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center">
            <Store className="w-4 h-4 text-white" />
          </div>
          <span className={clsx('font-display font-bold', isDark ? 'text-white' : 'text-dark-900')}>
            Maria Bonita
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8">
            <h2 className={clsx('text-2xl font-display font-bold mb-1', isDark ? 'text-white' : 'text-dark-900')}>
              Bienvenido de vuelta
            </h2>
            <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-gray-500')}>
              Ingresa tus credenciales para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className={clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700')}>
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className={clsx('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', isDark ? 'text-dark-500' : 'text-gray-400')} />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="admin@boutique.com"
                  required
                  className={clsx(
                    'w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all',
                    isDark
                      ? 'bg-dark-800 border-dark-700 text-white placeholder:text-dark-600 focus:border-primary-500'
                      : 'bg-white border-gray-200 text-dark-900 placeholder:text-gray-400 focus:border-primary-500 focus:shadow-glow'
                  )}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className={clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700')}>
                Contraseña
              </label>
              <div className="relative">
                <Lock className={clsx('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', isDark ? 'text-dark-500' : 'text-gray-400')} />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                  className={clsx(
                    'w-full pl-10 pr-10 py-3 rounded-xl border text-sm outline-none transition-all',
                    isDark
                      ? 'bg-dark-800 border-dark-700 text-white placeholder:text-dark-600 focus:border-primary-500'
                      : 'bg-white border-gray-200 text-dark-900 placeholder:text-gray-400 focus:border-primary-500 focus:shadow-glow'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className={clsx('absolute right-3 top-1/2 -translate-y-1/2', isDark ? 'text-dark-500 hover:text-dark-300' : 'text-gray-400 hover:text-gray-600')}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg"
              >
                {error}
              </motion.div>
            )}

            {/* Forgot */}
            <div className="flex justify-end">
              <a href="/forgot-password" className="text-xs text-primary-500 hover:text-primary-600">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-glow hover:shadow-lg disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Ingresar al sistema
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className={clsx('mt-6 p-4 rounded-xl border text-xs space-y-1', isDark ? 'border-dark-800 bg-dark-900' : 'border-gray-100 bg-gray-50')}>
            <p className={clsx('font-semibold', isDark ? 'text-dark-300' : 'text-gray-600')}>Credenciales de demo:</p>
            <p className={isDark ? 'text-dark-400' : 'text-gray-500'}>Admin: admin@boutique.com / admin123</p>
            <p className={isDark ? 'text-dark-400' : 'text-gray-500'}>Cajero: cajero@boutique.com / cajero123</p>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className={clsx('mt-4 w-full py-2 rounded-xl text-xs font-medium transition-colors', isDark ? 'text-dark-400 hover:text-dark-200' : 'text-gray-400 hover:text-gray-600')}
          >
            {isDark ? '☀️ Cambiar a modo claro' : '🌙 Cambiar a modo oscuro'}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
