import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useThemeStore } from '@/store/theme.store';
import api from '@/services/api';
import { clsx } from 'clsx';

export default function ForgotPasswordPage() {
  const { isDark } = useThemeStore();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {}
    setLoading(false);
  };

  return (
    <div className={clsx('min-h-screen flex items-center justify-center p-6', isDark ? 'bg-dark-950' : 'bg-gray-50')}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <Link to="/login" className={clsx('flex items-center gap-2 text-sm mb-8', isDark ? 'text-dark-400 hover:text-dark-200' : 'text-gray-500 hover:text-dark-700')}>
          <ArrowLeft className="w-4 h-4" /> Volver al login
        </Link>

        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className={clsx('text-xl font-bold mb-2', isDark ? 'text-white' : 'text-dark-900')}>Email enviado</h2>
            <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-gray-500')}>
              Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.
            </p>
          </div>
        ) : (
          <>
            <h2 className={clsx('text-2xl font-display font-bold mb-1', isDark ? 'text-white' : 'text-dark-900')}>Recuperar contraseña</h2>
            <p className={clsx('text-sm mb-6', isDark ? 'text-dark-400' : 'text-gray-500')}>
              Ingresa tu email y te enviaremos instrucciones.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700')}>Correo electrónico</label>
                <div className="relative">
                  <Mail className={clsx('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', isDark ? 'text-dark-500' : 'text-gray-400')} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="tu@email.com"
                    className={clsx('w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none', isDark ? 'bg-dark-800 border-dark-700 text-white' : 'bg-white border-gray-200')}
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl disabled:opacity-60">
                {loading ? 'Enviando...' : 'Enviar instrucciones'}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
