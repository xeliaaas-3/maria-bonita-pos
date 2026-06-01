import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Loader2, X, Edit2, Trash2, Phone, Mail, Package, ShoppingBag, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/services/api';
import { useThemeStore } from '@/store/theme.store';
import { formatCurrency } from '@/utils/format';
import { clsx } from 'clsx';

function SupplierModal({ supplier, onClose, onSaved, isDark }) {
  const [form, setForm] = useState(supplier || { name: '', contact: '', phone: '', email: '', address: '', ruc: '', notes: '' });
  const mutation = useMutation({
    mutationFn: (data) => supplier ? api.put(`/suppliers/${supplier.id}`, data) : api.post('/suppliers', data),
    onSuccess: () => { toast.success(supplier ? 'Proveedor actualizado' : 'Proveedor creado'); onSaved(); onClose(); },
    onError: () => toast.error('Error')
  });
  const inputClass = clsx('w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all', isDark ? 'bg-dark-800 border-dark-700 text-white focus:border-primary-500' : 'bg-white border-gray-200 text-dark-900 focus:border-primary-500');
  const labelClass = clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.5)' }}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={clsx('w-full max-w-md rounded-2xl shadow-2xl border', isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100')}>
        <div className={clsx('flex items-center justify-between p-5 border-b', isDark ? 'border-dark-800' : 'border-gray-100')}>
          <h3 className={clsx('font-bold', isDark ? 'text-white' : 'text-dark-900')}>{supplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
          <button onClick={onClose} className={clsx('p-1.5 rounded-lg', isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div><label className={labelClass}>Nombre *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="Nombre del proveedor" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Contacto</label><input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} className={inputClass} placeholder="Nombre del contacto" /></div>
            <div><label className={labelClass}>Teléfono</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} placeholder="+595..." /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Email</label><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} placeholder="email@..." /></div>
            <div><label className={labelClass}>RUC</label><input value={form.ruc} onChange={e => setForm(f => ({ ...f, ruc: e.target.value }))} className={inputClass} placeholder="80000000-0" /></div>
          </div>
          <div><label className={labelClass}>Dirección</label><input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={inputClass} placeholder="Dirección..." /></div>
          <div><label className={labelClass}>Notas</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={clsx(inputClass, 'resize-none')} placeholder="Notas internas..." /></div>
        </div>
        <div className={clsx('p-5 border-t', isDark ? 'border-dark-800' : 'border-gray-100')}>
          <button onClick={() => { if (!form.name) return toast.error('El nombre es requerido'); mutation.mutate(form); }} disabled={mutation.isPending} className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {supplier ? 'Guardar Cambios' : 'Crear Proveedor'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function NewPurchaseModal({ suppliers, onClose, onCreated, isDark }) {
  const [supplierId, setSupplierId] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ productName: '', sku: '', quantity: 1, unitCost: '' }]);
  const mutation = useMutation({
    mutationFn: (data) => api.post('/suppliers/purchases', data),
    onSuccess: () => { toast.success('Compra registrada y stock actualizado'); onCreated(); onClose(); },
    onError: () => toast.error('Error al registrar compra')
  });
  const total = items.reduce((s, i) => s + (Number(i.unitCost) || 0) * (Number(i.quantity) || 0), 0);
  const inputClass = clsx('w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all', isDark ? 'bg-dark-800 border-dark-700 text-white focus:border-primary-500' : 'bg-white border-gray-200 text-dark-900 focus:border-primary-500');
  const labelClass = clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.5)' }}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={clsx('w-full max-w-xl rounded-2xl shadow-2xl border', isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100')}>
        <div className={clsx('flex items-center justify-between p-5 border-b', isDark ? 'border-dark-800' : 'border-gray-100')}>
          <h3 className={clsx('font-bold text-lg', isDark ? 'text-white' : 'text-dark-900')}>Registrar Compra</h3>
          <button onClick={onClose} className={clsx('p-1.5 rounded-lg', isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Proveedor *</label>
              <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className={inputClass}>
                <option value="">Seleccionar...</option>
                {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div><label className={labelClass}>N° Factura / Referencia</label><input value={invoiceRef} onChange={e => setInvoiceRef(e.target.value)} placeholder="FACT-0001" className={inputClass} /></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelClass}>Productos recibidos</label>
              <button onClick={() => setItems(p => [...p, { productName: '', sku: '', quantity: 1, unitCost: '' }])} className="text-xs text-primary-500 font-medium flex items-center gap-1"><Plus className="w-3 h-3" />Agregar</button>
            </div>
            {items.map((item, i) => (
              <div key={i} className={clsx('p-3 rounded-xl border mb-2', isDark ? 'border-dark-700 bg-dark-800/50' : 'border-gray-100 bg-gray-50')}>
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-2"><input value={item.productName} onChange={e => setItems(p => p.map((x, idx) => idx === i ? { ...x, productName: e.target.value } : x))} placeholder="Nombre del producto *" className={inputClass} /></div>
                  <input value={item.sku} onChange={e => setItems(p => p.map((x, idx) => idx === i ? { ...x, sku: e.target.value } : x))} placeholder="SKU" className={inputClass} />
                  <input type="number" min="1" value={item.quantity} onChange={e => setItems(p => p.map((x, idx) => idx === i ? { ...x, quantity: Number(e.target.value) } : x))} placeholder="Cant." className={inputClass} />
                  <div className="col-span-3"><input type="number" value={item.unitCost} onChange={e => setItems(p => p.map((x, idx) => idx === i ? { ...x, unitCost: e.target.value } : x))} placeholder="Costo unitario (₲)" className={inputClass} /></div>
                  {items.length > 1 && <button onClick={() => setItems(p => p.filter((_, idx) => idx !== i))} className="text-red-400 self-center"><X className="w-4 h-4" /></button>}
                </div>
              </div>
            ))}
          </div>
          <div><label className={labelClass}>Notas</label><input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones..." className={inputClass} /></div>
          <div className={clsx('rounded-xl p-3', isDark ? 'bg-dark-800' : 'bg-gray-50')}>
            <div className="flex justify-between text-sm"><span className={isDark ? 'text-dark-400' : 'text-gray-500'}>Total compra</span><span className={clsx('font-bold', isDark ? 'text-white' : 'text-dark-900')}>{formatCurrency(total)}</span></div>
          </div>
        </div>
        <div className={clsx('p-5 border-t', isDark ? 'border-dark-800' : 'border-gray-100')}>
          <button onClick={() => { if (!supplierId) return toast.error('Seleccioná un proveedor'); if (items.some(i => !i.productName)) return toast.error('Completá los productos'); mutation.mutate({ supplierId, invoiceRef, notes, items: items.map(i => ({ ...i, unitCost: Number(i.unitCost) || 0 })) }); }} disabled={mutation.isPending} className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}Registrar Compra
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function SuppliersPage() {
  const { isDark } = useThemeStore();
  const queryClient = useQueryClient();
  const [showSupplier, setShowSupplier] = useState(null);
  const [showNewPurchase, setShowNewPurchase] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('suppliers');

  const { data: suppliers, isLoading } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.get('/suppliers').then(r => r.data.data) });
  const { data: purchases } = useQuery({ queryKey: ['purchases'], queryFn: () => api.get('/suppliers/purchases/all').then(r => r.data.data), enabled: tab === 'purchases' });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/suppliers/${id}`),
    onSuccess: () => { toast.success('Proveedor eliminado'); queryClient.invalidateQueries(['suppliers']); }
  });

  const cardBase = isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100';
  const filtered = suppliers?.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase())) || [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={clsx('text-2xl font-display font-bold', isDark ? 'text-white' : 'text-dark-900')}>Proveedores</h1>
          <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-gray-500')}>Gestión de proveedores y compras</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowNewPurchase(true)} className={clsx('flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border transition-colors', isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
            <ShoppingBag className="w-4 h-4" />Registrar Compra
          </button>
          <button onClick={() => setShowSupplier({})} className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold text-sm shadow-glow transition-colors">
            <Plus className="w-4 h-4" />Nuevo Proveedor
          </button>
        </div>
      </div>

      <div className={clsx('flex items-center gap-1 p-1 rounded-2xl border w-fit', cardBase)}>
        {[{ id: 'suppliers', label: 'Proveedores' }, { id: 'purchases', label: 'Historial de Compras' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={clsx('px-4 py-2 rounded-xl text-sm font-medium transition-all', tab === t.id ? 'bg-primary-500 text-white' : isDark ? 'text-dark-400 hover:text-white' : 'text-gray-500 hover:text-dark-900')}>{t.label}</button>
        ))}
      </div>

      {tab === 'suppliers' && (
        <>
          <div className={clsx('flex items-center gap-2 px-3 py-2 rounded-xl border', cardBase)}>
            <Search className="w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar proveedor..." className={clsx('flex-1 text-sm outline-none bg-transparent', isDark ? 'text-white placeholder:text-dark-500' : 'text-dark-900 placeholder:text-gray-400')} />
          </div>
          {isLoading ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.length === 0 && <div className={clsx('col-span-3 text-center py-16 rounded-2xl border', cardBase)}><p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-gray-500')}>No hay proveedores</p></div>}
              {filtered.map(s => (
                <motion.div key={s.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className={clsx('rounded-2xl border p-4 space-y-3', cardBase)}>
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center"><Package className="w-5 h-5 text-blue-500" /></div>
                    <div className="flex gap-1">
                      <button onClick={() => setShowSupplier(s)} className={clsx('p-1.5 rounded-lg', isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteMutation.mutate(s.id)} className={clsx('p-1.5 rounded-lg', isDark ? 'hover:bg-red-500/10 text-dark-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500')}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div>
                    <p className={clsx('font-semibold', isDark ? 'text-white' : 'text-dark-900')}>{s.name}</p>
                    {s.contact && <p className={clsx('text-xs mt-0.5', isDark ? 'text-dark-400' : 'text-gray-500')}>{s.contact}</p>}
                  </div>
                  <div className="space-y-1">
                    {s.phone && <p className={clsx('text-xs flex items-center gap-1', isDark ? 'text-dark-400' : 'text-gray-500')}><Phone className="w-3 h-3" />{s.phone}</p>}
                    {s.email && <p className={clsx('text-xs flex items-center gap-1', isDark ? 'text-dark-400' : 'text-gray-500')}><Mail className="w-3 h-3" />{s.email}</p>}
                  </div>
                  <div className={clsx('pt-2 border-t text-xs', isDark ? 'border-dark-700 text-dark-500' : 'border-gray-100 text-gray-400')}>
                    {s._count?.purchases || 0} compra(s) registrada(s)
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'purchases' && (
        <div className="space-y-3">
          {!purchases ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div> : purchases.length === 0 ? (
            <div className={clsx('text-center py-16 rounded-2xl border', cardBase)}><p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-gray-500')}>No hay compras registradas</p></div>
          ) : purchases.map(p => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={clsx('rounded-2xl border p-4', cardBase)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={clsx('font-semibold', isDark ? 'text-white' : 'text-dark-900')}>{p.number} — {p.supplier?.name}</p>
                  <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-gray-500')}>{p.items.length} producto(s) · {p.invoiceRef && `Fact: ${p.invoiceRef}`}</p>
                </div>
                <p className="font-bold text-primary-500 font-mono">{formatCurrency(p.total)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showSupplier !== null && <SupplierModal supplier={Object.keys(showSupplier).length > 0 ? showSupplier : null} onClose={() => setShowSupplier(null)} onSaved={() => queryClient.invalidateQueries(['suppliers'])} isDark={isDark} />}
      {showNewPurchase && <NewPurchaseModal suppliers={suppliers} onClose={() => setShowNewPurchase(false)} onCreated={() => { queryClient.invalidateQueries(['purchases']); queryClient.invalidateQueries(['products']); }} isDark={isDark} />}
    </div>
  );
}
