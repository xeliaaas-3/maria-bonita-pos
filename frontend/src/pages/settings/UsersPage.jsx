// ============================================
// USUARIOS PAGE
// ============================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Edit2, Key, UserX, UserCheck, Shield, Users, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import api from '@/services/api';
import { useThemeStore } from '@/store/theme.store';
import { formatDate, getInitials } from '@/utils/format';
import { clsx } from 'clsx';
import Badge from '@/components/ui/Badge';

const ROLE_CONFIG = {
  ADMIN: { label: 'Admin', color: 'primary' },
  CAJERO: { label: 'Cajero', color: 'success' },
  EMPLEADO: { label: 'Empleado', color: 'gray' }
};

export default function UsersPage() {
  const { isDark } = useThemeStore();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data.data)
  });

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches').then(r => r.data.data)
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editUser ? api.put(`/users/${editUser.id}`, data) : api.post('/users', data),
    onSuccess: () => {
      toast.success(editUser ? 'Usuario actualizado' : 'Usuario creado');
      queryClient.invalidateQueries(['users']);
      setShowModal(false);
      setEditUser(null);
      reset();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al guardar')
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`/users/${id}`, { isActive }),
    onSuccess: () => { toast.success('Estado actualizado'); queryClient.invalidateQueries(['users']); }
  });

  const resetPassword = useMutation({
    mutationFn: ({ id, newPassword }) => api.patch(`/users/${id}/reset-password`, { newPassword }),
    onSuccess: () => toast.success('Contraseña restablecida')
  });

  const openCreate = () => { setEditUser(null); reset({ role: 'EMPLEADO' }); setShowModal(true); };
  const openEdit = (u) => { setEditUser(u); reset({ name: u.name, role: u.role, branchId: u.branchId, phone: u.phone }); setShowModal(true); };

  const cardBase = isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100';
  const inputClass = clsx('w-full px-3 py-2.5 rounded-xl border text-sm outline-none', isDark ? 'bg-dark-800 border-dark-700 text-white' : 'bg-white border-gray-200');

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={clsx('text-2xl font-display font-bold', isDark ? 'text-white' : 'text-dark-900')}>Usuarios</h1>
          <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-gray-500')}>{users?.length || 0} usuarios registrados</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-xl">
          <Plus className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users?.map((u, i) => (
            <motion.div key={u.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={clsx('rounded-2xl border p-5 space-y-4', cardBase)}>
              <div className="flex items-center gap-3">
                <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0', u.isActive ? 'bg-gradient-to-br from-primary-400 to-primary-600' : 'bg-gray-400')}>
                  {getInitials(u.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={clsx('font-semibold truncate', isDark ? 'text-white' : 'text-dark-900')}>{u.name}</p>
                  <p className={clsx('text-xs truncate', isDark ? 'text-dark-400' : 'text-gray-500')}>{u.email}</p>
                </div>
                <Badge variant={ROLE_CONFIG[u.role].color} size="sm">{ROLE_CONFIG[u.role].label}</Badge>
              </div>

              <div className={clsx('text-xs space-y-1', isDark ? 'text-dark-400' : 'text-gray-500')}>
                <p>Sucursal: {u.branch?.name || 'Sin asignar'}</p>
                <p>Último acceso: {u.lastLogin ? formatDate(u.lastLogin) : 'Nunca'}</p>
                <p>Estado: <span className={u.isActive ? 'text-emerald-500' : 'text-red-500'}>{u.isActive ? 'Activo' : 'Inactivo'}</span></p>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(u)} className={clsx('flex-1 py-1.5 rounded-xl text-xs font-medium border transition-colors', isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
                  <Edit2 className="w-3 h-3 inline mr-1" /> Editar
                </button>
                <button
                  onClick={() => {
                    const pwd = prompt('Nueva contraseña (min 6 chars):');
                    if (pwd && pwd.length >= 6) resetPassword.mutate({ id: u.id, newPassword: pwd });
                  }}
                  className={clsx('p-1.5 rounded-xl transition-colors', isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}
                  title="Resetear contraseña"
                >
                  <Key className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => toggleActive.mutate({ id: u.id, isActive: !u.isActive })}
                  className={clsx('p-1.5 rounded-xl transition-colors', u.isActive ? (isDark ? 'hover:bg-red-500/10 text-dark-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500') : (isDark ? 'hover:bg-emerald-500/10 text-dark-400 hover:text-emerald-400' : 'hover:bg-emerald-50 text-gray-400 hover:text-emerald-500'))}
                  title={u.isActive ? 'Desactivar' : 'Activar'}
                >
                  {u.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* User Modal */}
      {showModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.5)' }}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className={clsx('w-full max-w-md rounded-2xl border p-6 shadow-2xl', isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100')}>
            <h3 className={clsx('font-bold text-lg mb-5', isDark ? 'text-white' : 'text-dark-900')}>{editUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>

            <form onSubmit={handleSubmit(data => saveMutation.mutate(data))} className="space-y-4">
              <div>
                <label className={clsx('block text-xs font-semibold mb-1', isDark ? 'text-dark-300' : 'text-dark-700')}>Nombre completo *</label>
                <input {...register('name', { required: true })} className={inputClass} placeholder="Juan Pérez" />
              </div>

              {!editUser && (
                <>
                  <div>
                    <label className={clsx('block text-xs font-semibold mb-1', isDark ? 'text-dark-300' : 'text-dark-700')}>Email *</label>
                    <input type="email" {...register('email', { required: true })} className={inputClass} placeholder="usuario@boutique.com" />
                  </div>
                  <div>
                    <label className={clsx('block text-xs font-semibold mb-1', isDark ? 'text-dark-300' : 'text-dark-700')}>Contraseña *</label>
                    <input type="password" {...register('password', { required: true, minLength: 6 })} className={inputClass} placeholder="••••••••" />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={clsx('block text-xs font-semibold mb-1', isDark ? 'text-dark-300' : 'text-dark-700')}>Rol *</label>
                  <select {...register('role', { required: true })} className={inputClass}>
                    <option value="EMPLEADO">Empleado</option>
                    <option value="CAJERO">Cajero</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                <div>
                  <label className={clsx('block text-xs font-semibold mb-1', isDark ? 'text-dark-300' : 'text-dark-700')}>Sucursal</label>
                  <select {...register('branchId')} className={inputClass}>
                    <option value="">Sin asignar</option>
                    {branches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={clsx('block text-xs font-semibold mb-1', isDark ? 'text-dark-300' : 'text-dark-700')}>Teléfono</label>
                <input {...register('phone')} className={inputClass} placeholder="+595 981 000000" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditUser(null); reset(); }} className={clsx('flex-1 py-2.5 rounded-xl text-sm border', isDark ? 'border-dark-700 text-dark-300' : 'border-gray-200 text-gray-600')}>
                  Cancelar
                </button>
                <button type="submit" disabled={saveMutation.isPending} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-60 flex items-center justify-center gap-2">
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (editUser ? 'Actualizar' : 'Crear')}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
