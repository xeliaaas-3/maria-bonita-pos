import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Loader2, X, ChevronDown, Package, Truck, CheckCircle, Bell } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/services/api';
import { useThemeStore } from '@/store/theme.store';
import { formatCurrency, formatDate } from '@/utils/format';
import { clsx } from 'clsx';
import Badge from '@/components/ui/Badge';

const STATUS_CFG = {
  PENDIENTE:  { label: 'Pendiente',  color: 'warning', icon: Package },
  EN_CAMINO:  { label: 'En Camino',  color: 'violet',  icon: Truck },
  RECIBIDO:   { label: 'Recibido',   color: 'info',    icon: Bell },
  ENTREGADO:  { label: 'Entregado',  color: 'success', icon: CheckCircle },
  CANCELADO:  { label: 'Cancelado',  color: 'danger',  icon: X },
};

const NEXT_STATUS = { PENDIENTE: 'EN_CAMINO', EN_CAMINO: 'RECIBIDO', RECIBIDO: 'ENTREGADO' };
const NEXT_LABEL  = { PENDIENTE: 'Marcar En Camino', EN_CAMINO: 'Marcar Recibido', RECIBIDO: 'Marcar Entregado' };

function NewOrderModal({ onClose, onCreated, isDark }) {
  const [search, setSearch] = useState('');
  const [customer, setCustomer] = useState(null);
  const [expectedAt, setExpectedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ productName: '', size: '', color: '', quantity: 1, unitPrice: '' }]);

  const { data: customers } = useQuery({ queryKey: ['customers-search', search], queryFn: () => api.get(`/customers?search=${search}&limit=5`).then(r => r.data.data), enabled: search.length >= 2 });
  const mutation = useMutation({
    mutationFn: (data) => api.post('/orders', data),
    onSuccess: () => { toast.success('Encargo creado'); onCreated(); onClose(); },
    onError: () => toast.error('Error al crear encargo')
  });

  const inputClass = clsx('w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all', isDark ? 'bg-dark-800 border-dark-700 text-white focus:border-primary-500' : 'bg-white border-gray-200 text-dark-900 focus:border-primary-500');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.5)' }}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={clsx('w-full max-w-xl rounded-2xl shadow-2xl border', isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100')}>
        <div className={clsx('flex items-center justify-between p-5 border-b', isDark ? 'border-dark-800' : 'border-gray-100')}>
          <h3 className={clsx('font-bold text-lg', isDark ? 'text-white' : 'text-dark-900')}>Nuevo Encargo</h3>
          <button onClick={onClose} className={clsx('p-1.5 rounded-lg', isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Cliente */}
          <div>
            <label className={clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700')}>Cliente (opcional)</label>
            {customer ? (
              <div className={clsx('flex items-center justify-between px-3 py-2 rounded-xl border', isDark ? 'border-dark-700 bg-dark-800' : 'border-gray-200 bg-gray-50')}>
                <span className={clsx('text-sm font-medium', isDark ? 'text-white' : 'text-dark-900')}>{customer.name}</span>
                <button onClick={() => setCustomer(null)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="relative">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..." className={inputClass} />
                {customers?.length > 0 && (
                  <div className={clsx('absolute z-10 top-full mt-1 w-full rounded-xl border shadow-lg overflow-hidden', isDark ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200')}>
                    {customers.map(c => <button key={c.id} onClick={() => { setCustomer(c); setSearch(''); }} className={clsx('w-full text-left px-3 py-2 text-sm transition-colors', isDark ? 'hover:bg-dark-700 text-white' : 'hover:bg-gray-50 text-dark-900')}>{c.name} — {c.phone}</button>)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={clsx('text-xs font-semibold', isDark ? 'text-dark-300' : 'text-dark-700')}>Productos encargados</label>
              <button onClick={() => setItems(p => [...p, { productName: '', size: '', color: '', quantity: 1, unitPrice: '' }])} className="text-xs text-primary-500 font-medium flex items-center gap-1"><Plus className="w-3 h-3" />Agregar</button>
            </div>
            {items.map((item, i) => (
              <div key={i} className={clsx('p-3 rounded-xl border mb-2', isDark ? 'border-dark-700 bg-dark-800/50' : 'border-gray-100 bg-gray-50')}>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-3"><input value={item.productName} onChange={e => setItems(p => p.map((x, idx) => idx === i ? { ...x, productName: e.target.value } : x))} placeholder="Descripción del producto *" className={inputClass} /></div>
                  <input value={item.size} onChange={e => setItems(p => p.map((x, idx) => idx === i ? { ...x, size: e.target.value } : x))} placeholder="Talle" className={inputClass} />
                  <input value={item.color} onChange={e => setItems(p => p.map((x, idx) => idx === i ? { ...x, color: e.target.value } : x))} placeholder="Color" className={inputClass} />
                  <input type="number" min="1" value={item.quantity} onChange={e => setItems(p => p.map((x, idx) => idx === i ? { ...x, quantity: Number(e.target.value) } : x))} placeholder="Cant." className={inputClass} />
                  <div className="col-span-2"><input type="number" value={item.unitPrice} onChange={e => setItems(p => p.map((x, idx) => idx === i ? { ...x, unitPrice: e.target.value } : x))} placeholder="Precio aprox. (₲)" className={inputClass} /></div>
                  {items.length > 1 && <button onClick={() => setItems(p => p.filter((_, idx) => idx !== i))} className="text-red-400 self-center"><X className="w-4 h-4" /></button>}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700')}>Fecha estimada de llegada</label>
              <input type="date" value={expectedAt} onChange={e => setExpectedAt(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700')}>Notas</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones..." className={inputClass} />
            </div>
          </div>
        </div>
        <div className={clsx('p-5 border-t', isDark ? 'border-dark-800' : 'border-gray-100')}>
          <button onClick={() => { if (items.some(i => !i.productName)) return toast.error('Completá el nombre de todos los productos'); mutation.mutate({ customerId: customer?.id, items: items.map(i => ({ ...i, unitPrice: Number(i.unitPrice) || 0 })), notes, expectedAt: expectedAt || null }); }} disabled={mutation.isPending} className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Crear Encargo
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function OrdersPage() {
  const { isDark } = useThemeStore();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['orders', statusFilter], queryFn: () => api.get(`/orders${statusFilter ? `?status=${statusFilter}` : ''}`).then(r => r.data.data) });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => { toast.success('Estado actualizado'); queryClient.invalidateQueries(['orders']); },
    onError: () => toast.error('Error')
  });

  const cardBase = isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100';
  const filtered = data?.filter(o => !search || o.customer?.name?.toLowerCase().includes(search.toLowerCase()) || o.number.includes(search)) || [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={clsx('text-2xl font-display font-bold', isDark ? 'text-white' : 'text-dark-900')}>Encargos</h1>
          <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-gray-500')}>Pedidos especiales y seguimiento</p>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold text-sm shadow-glow transition-colors">
          <Plus className="w-4 h-4" />Nuevo Encargo
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className={clsx('flex items-center gap-2 px-3 py-2 rounded-xl border flex-1 min-w-48', cardBase)}>
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className={clsx('flex-1 text-sm outline-none bg-transparent', isDark ? 'text-white placeholder:text-dark-500' : 'text-dark-900 placeholder:text-gray-400')} />
        </div>
        <button onClick={() => setStatusFilter('')} className={clsx('px-4 py-2 rounded-xl text-sm font-medium border', !statusFilter ? 'bg-primary-500 border-primary-500 text-white' : isDark ? 'border-dark-700 text-dark-400' : 'border-gray-200 text-gray-500')}>Todos</button>
        {Object.entries(STATUS_CFG).map(([k, v]) => (
          <button key={k} onClick={() => setStatusFilter(k)} className={clsx('px-4 py-2 rounded-xl text-sm font-medium border', statusFilter === k ? 'bg-primary-500 border-primary-500 text-white' : isDark ? 'border-dark-700 text-dark-400' : 'border-gray-200 text-gray-500')}>{v.label}</button>
        ))}
      </div>

      {isLoading ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div> : (
        <div className="space-y-3">
          {filtered.length === 0 && <div className={clsx('text-center py-16 rounded-2xl border', cardBase)}><p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-gray-500')}>No hay encargos</p></div>}
          {filtered.map(order => {
            const cfg = STATUS_CFG[order.status];
            const Icon = cfg.icon;
            const next = NEXT_STATUS[order.status];
            return (
              <motion.div key={order.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={clsx('rounded-2xl border p-4', cardBase)}>
                <div className="flex items-start gap-4">
                  <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', isDark ? 'bg-dark-800' : 'bg-gray-50')}>
                    <Icon className="w-5 h-5 text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><p className={clsx('font-semibold', isDark ? 'text-white' : 'text-dark-900')}>{order.number}</p><Badge variant={cfg.color}>{cfg.label}</Badge></div>
                    <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-gray-500')}>{order.customer?.name || 'Sin cliente'} · {order.items.length} ítem(s)</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {order.items.map((item, i) => (
                        <span key={i} className={clsx('text-xs px-2 py-0.5 rounded-lg', isDark ? 'bg-dark-800 text-dark-300' : 'bg-gray-100 text-gray-600')}>
                          {item.productName}{item.size ? ` / ${item.size}` : ''}{item.color ? ` / ${item.color}` : ''} ×{item.quantity}
                        </span>
                      ))}
                    </div>
                    {order.expectedAt && <p className={clsx('text-xs mt-1', isDark ? 'text-dark-500' : 'text-gray-400')}>Esperado: {formatDate(order.expectedAt)}</p>}
                  </div>
                  {next && (
                    <button onClick={() => updateStatus.mutate({ id: order.id, status: next })} className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors">
                      {NEXT_LABEL[order.status]}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      {showNew && <NewOrderModal onClose={() => setShowNew(false)} onCreated={() => queryClient.invalidateQueries(['orders'])} isDark={isDark} />}
    </div>
  );
}
