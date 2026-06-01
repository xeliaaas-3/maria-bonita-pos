import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Loader2, X, Check, ChevronRight, Banknote, Calendar, User, Tag, CreditCard, QrCode, Smartphone } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/services/api';
import { useThemeStore } from '@/store/theme.store';
import { formatCurrency, formatDate } from '@/utils/format';
import { clsx } from 'clsx';
import Badge from '@/components/ui/Badge';

const STATUS_MAP = { ACTIVO: { label: 'Activo', color: 'warning' }, COMPLETADO: { label: 'Completado', color: 'success' }, CANCELADO: { label: 'Cancelado', color: 'danger' } };
const PAY_METHODS = [
  { id: 'EFECTIVO', label: 'Efectivo', icon: Banknote },
  { id: 'TARJETA', label: 'Tarjeta', icon: CreditCard },
  { id: 'TRANSFERENCIA', label: 'Transferencia', icon: Smartphone },
  { id: 'QR', label: 'QR', icon: QrCode },
];

function PaymentModal({ layaway, onClose, onPaid, isDark }) {
  const [amount, setAmount] = useState(Number(layaway.balance));
  const [method, setMethod] = useState('EFECTIVO');
  const [reference, setReference] = useState('');
  const mutation = useMutation({
    mutationFn: (data) => api.post(`/layaways/${layaway.id}/payments`, data),
    onSuccess: () => { toast.success('Pago registrado'); onPaid(); onClose(); },
    onError: () => toast.error('Error al registrar pago')
  });
  const inputClass = clsx('w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all', isDark ? 'bg-dark-800 border-dark-700 text-white focus:border-primary-500' : 'bg-white border-gray-200 text-dark-900 focus:border-primary-500');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.5)' }}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={clsx('w-full max-w-sm rounded-2xl shadow-2xl border p-6 space-y-4', isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100')}>
        <div className="flex items-center justify-between">
          <h3 className={clsx('font-bold', isDark ? 'text-white' : 'text-dark-900')}>Registrar Pago</h3>
          <button onClick={onClose} className={clsx('p-1.5 rounded-lg', isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}><X className="w-4 h-4" /></button>
        </div>
        <div className={clsx('rounded-xl p-3 text-sm', isDark ? 'bg-dark-800' : 'bg-gray-50')}>
          <div className="flex justify-between"><span className={isDark ? 'text-dark-400' : 'text-gray-500'}>Saldo pendiente</span><span className="font-bold text-amber-500">{formatCurrency(layaway.balance)}</span></div>
        </div>
        <div>
          <label className={clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700')}>Método de pago</label>
          <div className="grid grid-cols-4 gap-2">
            {PAY_METHODS.map(m => (
              <button key={m.id} onClick={() => setMethod(m.id)} className={clsx('flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all', method === m.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10' : isDark ? 'border-dark-700' : 'border-gray-200')}>
                <m.icon className={clsx('w-4 h-4', method === m.id ? 'text-primary-500' : isDark ? 'text-dark-400' : 'text-gray-400')} />
                <span className={clsx('text-[9px] font-medium', method === m.id ? 'text-primary-500' : isDark ? 'text-dark-500' : 'text-gray-400')}>{m.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700')}>Monto (₲)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className={inputClass} />
        </div>
        {method !== 'EFECTIVO' && (
          <div>
            <label className={clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700')}>Referencia</label>
            <input value={reference} onChange={e => setReference(e.target.value)} placeholder="Nro. operación" className={inputClass} />
          </div>
        )}
        <button onClick={() => mutation.mutate({ amount: Number(amount), method, reference })} disabled={mutation.isPending || !amount} className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Registrar Pago
        </button>
      </motion.div>
    </div>
  );
}

function NewLayawayModal({ onClose, onCreated, isDark }) {
  const [search, setSearch] = useState('');
  const [customer, setCustomer] = useState(null);
  const [deposit, setDeposit] = useState('');
  const [depositMethod, setDepositMethod] = useState('EFECTIVO');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ productName: '', size: '', color: '', quantity: 1, unitPrice: '' }]);

  const { data: customers } = useQuery({ queryKey: ['customers-search', search], queryFn: () => api.get(`/customers?search=${search}&limit=6`).then(r => r.data.data), enabled: search.length >= 2 });

  const total = items.reduce((s, i) => s + (Number(i.unitPrice) || 0) * (Number(i.quantity) || 0), 0);
  const mutation = useMutation({
    mutationFn: (data) => api.post('/layaways', data),
    onSuccess: () => { toast.success('Apartado creado'); onCreated(); onClose(); },
    onError: () => toast.error('Error al crear apartado')
  });

  const inputClass = clsx('w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all', isDark ? 'bg-dark-800 border-dark-700 text-white focus:border-primary-500' : 'bg-white border-gray-200 text-dark-900 focus:border-primary-500');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.5)' }}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={clsx('w-full max-w-xl rounded-2xl shadow-2xl border', isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100')}>
        <div className={clsx('flex items-center justify-between p-5 border-b', isDark ? 'border-dark-800' : 'border-gray-100')}>
          <h3 className={clsx('font-bold text-lg', isDark ? 'text-white' : 'text-dark-900')}>Nuevo Apartado</h3>
          <button onClick={onClose} className={clsx('p-1.5 rounded-lg', isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Cliente */}
          <div>
            <label className={clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700')}>Cliente *</label>
            {customer ? (
              <div className={clsx('flex items-center justify-between px-3 py-2.5 rounded-xl border', isDark ? 'border-dark-700 bg-dark-800' : 'border-gray-200 bg-gray-50')}>
                <div><p className={clsx('text-sm font-semibold', isDark ? 'text-white' : 'text-dark-900')}>{customer.name}</p><p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>{customer.phone}</p></div>
                <button onClick={() => setCustomer(null)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="relative">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente por nombre o teléfono..." className={inputClass} />
                {customers?.length > 0 && (
                  <div className={clsx('absolute z-10 top-full mt-1 w-full rounded-xl border shadow-lg overflow-hidden', isDark ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200')}>
                    {customers.map(c => (
                      <button key={c.id} onClick={() => { setCustomer(c); setSearch(''); }} className={clsx('w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors', isDark ? 'hover:bg-dark-700' : 'hover:bg-gray-50')}>
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center text-sm font-bold text-primary-600">{c.name[0]}</div>
                        <div><p className={clsx('text-sm font-medium', isDark ? 'text-white' : 'text-dark-900')}>{c.name}</p><p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>{c.phone}</p></div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={clsx('text-xs font-semibold', isDark ? 'text-dark-300' : 'text-dark-700')}>Productos a apartar</label>
              <button onClick={() => setItems(p => [...p, { productName: '', size: '', color: '', quantity: 1, unitPrice: '' }])} className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"><Plus className="w-3 h-3" />Agregar</button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className={clsx('p-3 rounded-xl border space-y-2', isDark ? 'border-dark-700 bg-dark-800/50' : 'border-gray-100 bg-gray-50')}>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-3"><input value={item.productName} onChange={e => setItems(p => p.map((x, idx) => idx === i ? { ...x, productName: e.target.value } : x))} placeholder="Nombre del producto *" className={inputClass} /></div>
                    <input value={item.size} onChange={e => setItems(p => p.map((x, idx) => idx === i ? { ...x, size: e.target.value } : x))} placeholder="Talle" className={inputClass} />
                    <input value={item.color} onChange={e => setItems(p => p.map((x, idx) => idx === i ? { ...x, color: e.target.value } : x))} placeholder="Color" className={inputClass} />
                    <input type="number" min="1" value={item.quantity} onChange={e => setItems(p => p.map((x, idx) => idx === i ? { ...x, quantity: e.target.value } : x))} placeholder="Cant." className={inputClass} />
                    <div className="col-span-2"><input type="number" value={item.unitPrice} onChange={e => setItems(p => p.map((x, idx) => idx === i ? { ...x, unitPrice: e.target.value } : x))} placeholder="Precio unitario (₲)" className={inputClass} /></div>
                    {items.length > 1 && <button onClick={() => setItems(p => p.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-500 self-center"><X className="w-4 h-4" /></button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total / Seña */}
          <div className={clsx('rounded-xl p-3 space-y-2', isDark ? 'bg-dark-800' : 'bg-gray-50')}>
            <div className="flex justify-between text-sm"><span className={isDark ? 'text-dark-400' : 'text-gray-500'}>Total</span><span className={clsx('font-bold', isDark ? 'text-white' : 'text-dark-900')}>{formatCurrency(total)}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700')}>Seña / Depósito inicial (₲)</label>
              <input type="number" value={deposit} onChange={e => setDeposit(e.target.value)} placeholder="0" className={inputClass} />
            </div>
            <div>
              <label className={clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700')}>Método de pago seña</label>
              <select value={depositMethod} onChange={e => setDepositMethod(e.target.value)} className={inputClass}>
                {PAY_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700')}>Fecha límite</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700')}>Notas</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones..." className={inputClass} />
            </div>
          </div>
        </div>
        <div className={clsx('p-5 border-t', isDark ? 'border-dark-800' : 'border-gray-100')}>
          <button onClick={() => { if (!customer) return toast.error('Seleccioná un cliente'); if (items.some(i => !i.productName || !i.unitPrice)) return toast.error('Completá todos los productos'); mutation.mutate({ customerId: customer.id, items: items.map(i => ({ ...i, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })), deposit: Number(deposit) || 0, depositMethod, dueDate: dueDate || null, notes }); }} disabled={mutation.isPending} className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Crear Apartado
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function LayawaysPage() {
  const { isDark } = useThemeStore();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [payingLayaway, setPayingLayaway] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVO');

  const { data, isLoading } = useQuery({ queryKey: ['layaways', statusFilter], queryFn: () => api.get(`/layaways?status=${statusFilter}`).then(r => r.data.data) });

  const cardBase = isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100';
  const filtered = data?.filter(l => !search || l.customer?.name?.toLowerCase().includes(search.toLowerCase()) || l.number.includes(search)) || [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={clsx('text-2xl font-display font-bold', isDark ? 'text-white' : 'text-dark-900')}>Apartados</h1>
          <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-gray-500')}>Separas y pagos en cuotas</p>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold text-sm shadow-glow transition-colors">
          <Plus className="w-4 h-4" />Nuevo Apartado
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className={clsx('flex items-center gap-2 px-3 py-2 rounded-xl border flex-1 min-w-48', cardBase)}>
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por cliente o número..." className={clsx('flex-1 text-sm outline-none bg-transparent', isDark ? 'text-white placeholder:text-dark-500' : 'text-dark-900 placeholder:text-gray-400')} />
        </div>
        {['ACTIVO', 'COMPLETADO', 'CANCELADO'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={clsx('px-4 py-2 rounded-xl text-sm font-medium border transition-colors', statusFilter === s ? 'bg-primary-500 border-primary-500 text-white' : isDark ? 'border-dark-700 text-dark-400 hover:text-white' : 'border-gray-200 text-gray-500 hover:text-dark-900')}>
            {STATUS_MAP[s].label}
          </button>
        ))}
      </div>

      {isLoading ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div> : (
        <div className="space-y-3">
          {filtered.length === 0 && <div className={clsx('text-center py-16 rounded-2xl border', cardBase)}><p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-gray-500')}>No hay apartados {statusFilter.toLowerCase()}s</p></div>}
          {filtered.map(l => {
            const pct = Math.round(((Number(l.totalAmount) - Number(l.balance)) / Number(l.totalAmount)) * 100);
            const st = STATUS_MAP[l.status];
            return (
              <motion.div key={l.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={clsx('rounded-2xl border p-4', cardBase)}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Tag className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={clsx('font-semibold', isDark ? 'text-white' : 'text-dark-900')}>{l.number}</p>
                      <Badge variant={st.color}>{st.label}</Badge>
                    </div>
                    <p className={clsx('text-sm mt-0.5', isDark ? 'text-dark-400' : 'text-gray-500')}><User className="w-3 h-3 inline mr-1" />{l.customer?.name}</p>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <span className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>Total: <span className="font-semibold text-primary-500">{formatCurrency(l.totalAmount)}</span></span>
                      <span className="text-xs text-amber-500">Saldo: <span className="font-semibold">{formatCurrency(l.balance)}</span></span>
                      {l.dueDate && <span className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-400')}><Calendar className="w-3 h-3 inline mr-0.5" />{formatDate(l.dueDate)}</span>}
                    </div>
                    {/* Progress bar */}
                    <div className={clsx('mt-2 h-1.5 rounded-full overflow-hidden', isDark ? 'bg-dark-700' : 'bg-gray-100')}>
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className={clsx('text-xs mt-0.5', isDark ? 'text-dark-500' : 'text-gray-400')}>{pct}% pagado</p>
                  </div>
                  {l.status === 'ACTIVO' && (
                    <button onClick={() => setPayingLayaway(l)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors">
                      <Banknote className="w-3.5 h-3.5" />Pagar
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {showNew && <NewLayawayModal onClose={() => setShowNew(false)} onCreated={() => queryClient.invalidateQueries(['layaways'])} isDark={isDark} />}
      {payingLayaway && <PaymentModal layaway={payingLayaway} onClose={() => setPayingLayaway(null)} onPaid={() => queryClient.invalidateQueries(['layaways'])} isDark={isDark} />}
    </div>
  );
}
