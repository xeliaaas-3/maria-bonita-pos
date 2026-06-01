// ============================================
// CUSTOMER MODAL
// ============================================

import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/services/api';
import { clsx } from 'clsx';

export default function CustomerModal({ customer, onClose, onSaved, isDark }) {
  const isEdit = Boolean(customer);
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: customer ? {
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      whatsapp: customer.whatsapp || '',
      document: customer.document || '',
      address: customer.address || '',
      city: customer.city || '',
      birthdate: customer.birthdate ? new Date(customer.birthdate).toISOString().split('T')[0] : '',
      tier: customer.tier || 'REGULAR',
      notes: customer.notes || ''
    } : { tier: 'REGULAR' }
  });

  const saveMutation = useMutation({
    mutationFn: (data) => isEdit
      ? api.put(`/customers/${customer.id}`, data)
      : api.post('/customers', data),
    onSuccess: () => {
      toast.success(isEdit ? 'Cliente actualizado' : 'Cliente creado');
      onSaved();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al guardar')
  });

  const inputClass = clsx('w-full px-3 py-2.5 rounded-xl border text-sm outline-none', isDark ? 'bg-dark-800 border-dark-700 text-white placeholder:text-dark-600' : 'bg-white border-gray-200 placeholder:text-gray-400');
  const labelClass = clsx('block text-xs font-semibold mb-1', isDark ? 'text-dark-300' : 'text-dark-700');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.5)' }}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className={clsx('w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden', isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100')}>
        <div className={clsx('flex items-center justify-between px-6 py-4 border-b', isDark ? 'border-dark-800' : 'border-gray-100')}>
          <h3 className={clsx('font-bold text-lg', isDark ? 'text-white' : 'text-dark-900')}>
            {isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h3>
          <button onClick={onClose} className={clsx('p-1.5 rounded-lg', isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>Nombre completo *</label>
              <input {...register('name', { required: true })} className={clsx(inputClass, errors.name && 'border-red-500')} placeholder="Juan Pérez" />
            </div>
            <div>
              <label className={labelClass}>Teléfono</label>
              <input {...register('phone')} className={inputClass} placeholder="+595 981 000000" />
            </div>
            <div>
              <label className={labelClass}>WhatsApp</label>
              <input {...register('whatsapp')} className={inputClass} placeholder="+595 981 000000" />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Email</label>
              <input type="email" {...register('email')} className={inputClass} placeholder="email@ejemplo.com" />
            </div>
            <div>
              <label className={labelClass}>Documento / CI</label>
              <input {...register('document')} className={inputClass} placeholder="1234567-8" />
            </div>
            <div>
              <label className={labelClass}>Fecha de Nacimiento</label>
              <input type="date" {...register('birthdate')} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Dirección</label>
              <input {...register('address')} className={inputClass} placeholder="Calle, número, barrio" />
            </div>
            <div>
              <label className={labelClass}>Ciudad</label>
              <input {...register('city')} className={inputClass} placeholder="Asunción" />
            </div>
            <div>
              <label className={labelClass}>Nivel de cliente</label>
              <select {...register('tier')} className={inputClass}>
                <option value="REGULAR">Regular</option>
                <option value="VIP">VIP</option>
                <option value="PREMIUM">Premium</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Notas</label>
              <textarea {...register('notes')} rows={2} placeholder="Observaciones..." className={clsx(inputClass, 'resize-none')} />
            </div>
          </div>

          <div className={clsx('flex gap-3 pt-2 border-t', isDark ? 'border-dark-800' : 'border-gray-100')}>
            <button type="button" onClick={onClose} className={clsx('flex-1 py-2.5 rounded-xl text-sm border', isDark ? 'border-dark-700 text-dark-300' : 'border-gray-200 text-gray-600')}>
              Cancelar
            </button>
            <button type="submit" disabled={saveMutation.isPending} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-60 flex items-center justify-center gap-2">
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEdit ? 'Actualizar' : 'Crear Cliente')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
