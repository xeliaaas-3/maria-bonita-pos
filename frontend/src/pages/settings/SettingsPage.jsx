// ============================================
// SETTINGS PAGE — con gestión de Marcas
// ============================================

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Store, Receipt, Bell, Loader2, Save,
  Building2, Tag, Plus, Edit2, Trash2, X, Check, FolderOpen
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/services/api';
import { useThemeStore } from '@/store/theme.store';
import { clsx } from 'clsx';

const TABS = [
  { id: 'company', label: 'Empresa', icon: Store },
  { id: 'pos', label: 'POS', icon: Receipt },
  { id: 'brands', label: 'Marcas', icon: Tag },
  { id: 'categories', label: 'Categorías', icon: FolderOpen },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
];


// ── Sub-componente gestión de categorías ──
function CategoriesTab({ isDark }) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const inputClass = clsx(
    'w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all',
    isDark
      ? 'bg-dark-800 border-dark-700 text-white placeholder:text-dark-600 focus:border-primary-500'
      : 'bg-white border-gray-200 text-dark-900 placeholder:text-gray-400 focus:border-primary-500'
  );

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data.data)
  });

  const createMutation = useMutation({
    mutationFn: (name) => api.post('/categories', { name, isActive: true }),
    onSuccess: () => { toast.success('Categoría creada'); queryClient.invalidateQueries(['categories']); setNewName(''); },
    onError: () => toast.error('Error al crear categoría')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }) => api.put(`/categories/${id}`, { name }),
    onSuccess: () => { toast.success('Categoría actualizada'); queryClient.invalidateQueries(['categories']); setEditId(null); },
    onError: () => toast.error('Error al actualizar categoría')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/categories/${id}`),
    onSuccess: () => { toast.success('Categoría eliminada'); queryClient.invalidateQueries(['categories']); },
    onError: () => toast.error('Error al eliminar categoría')
  });

  return (
    <div className="space-y-5">
      <h3 className={clsx('font-semibold flex items-center gap-2', isDark ? 'text-white' : 'text-dark-900')}>
        <FolderOpen className="w-4 h-4 text-blue-500" />
        Gestión de Categorías
      </h3>

      {/* Nueva categoría */}
      <div className="flex items-center gap-3">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && newName.trim() && createMutation.mutate(newName.trim())}
          placeholder="Nombre de la nueva categoría..."
          className={clsx(inputClass, 'flex-1')}
        />
        <button
          onClick={() => newName.trim() && createMutation.mutate(newName.trim())}
          disabled={!newName.trim() || createMutation.isPending}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shrink-0"
        >
          {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Agregar
        </button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
      ) : categories?.length === 0 ? (
        <div className={clsx('text-center py-10 rounded-2xl border border-dashed', isDark ? 'border-dark-700 text-dark-500' : 'border-gray-200 text-gray-400')}>
          <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay categorías creadas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories?.map(cat => (
            <div key={cat.id} className={clsx('flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors', isDark ? 'border-dark-700 bg-dark-800/50' : 'border-gray-100 bg-gray-50/50')}>
              {editId === cat.id ? (
                <>
                  <input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') updateMutation.mutate({ id: cat.id, name: editName }); if (e.key === 'Escape') setEditId(null); }} autoFocus className={clsx(inputClass, 'flex-1 py-1.5')} />
                  <button onClick={() => updateMutation.mutate({ id: cat.id, name: editName })} disabled={updateMutation.isPending} className="p-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600">
                    {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => setEditId(null)} className={clsx('p-1.5 rounded-lg', isDark ? 'hover:bg-dark-700 text-dark-400' : 'hover:bg-gray-200 text-gray-400')}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                    <FolderOpen className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-sm font-semibold', isDark ? 'text-white' : 'text-dark-900')}>{cat.name}</p>
                    {cat._count?.products !== undefined && (
                      <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>{cat._count.products} producto{cat._count.products !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                  <button onClick={() => { setEditId(cat.id); setEditName(cat.name); }} className={clsx('p-1.5 rounded-lg transition-colors', isDark ? 'hover:bg-dark-700 text-dark-400 hover:text-dark-200' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600')}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteMutation.mutate(cat.id)} disabled={deleteMutation.isPending} className={clsx('p-1.5 rounded-lg transition-colors', isDark ? 'hover:bg-red-500/10 text-dark-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500')}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sub-componente gestión de marcas ──
function BrandsTab({ isDark }) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const inputClass = clsx(
    'w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all',
    isDark
      ? 'bg-dark-800 border-dark-700 text-white placeholder:text-dark-600 focus:border-primary-500'
      : 'bg-white border-gray-200 text-dark-900 placeholder:text-gray-400 focus:border-primary-500'
  );

  const { data: brands, isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.get('/brands').then(r => r.data.data)
  });

  const createMutation = useMutation({
    mutationFn: (name) => api.post('/brands', { name, isActive: true }),
    onSuccess: () => {
      toast.success('Marca creada');
      queryClient.invalidateQueries(['brands']);
      setNewName('');
    },
    onError: () => toast.error('Error al crear marca')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }) => api.put(`/brands/${id}`, { name }),
    onSuccess: () => {
      toast.success('Marca actualizada');
      queryClient.invalidateQueries(['brands']);
      setEditId(null);
    },
    onError: () => toast.error('Error al actualizar marca')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/brands/${id}`),
    onSuccess: () => {
      toast.success('Marca eliminada');
      queryClient.invalidateQueries(['brands']);
    },
    onError: () => toast.error('Error al eliminar marca')
  });

  const startEdit = (brand) => {
    setEditId(brand.id);
    setEditName(brand.name);
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate(newName.trim());
  };

  const handleUpdate = () => {
    if (!editName.trim()) return;
    updateMutation.mutate({ id: editId, name: editName.trim() });
  };

  return (
    <div className="space-y-5">
      <h3 className={clsx('font-semibold flex items-center gap-2', isDark ? 'text-white' : 'text-dark-900')}>
        <Tag className="w-4 h-4 text-violet-500" />
        Gestión de Marcas
      </h3>

      {/* Agregar nueva marca */}
      <div className="flex items-center gap-3">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="Nombre de la nueva marca..."
          className={clsx(inputClass, 'flex-1')}
        />
        <button
          onClick={handleCreate}
          disabled={!newName.trim() || createMutation.isPending}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shrink-0"
        >
          {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Agregar
        </button>
      </div>

      {/* Lista de marcas */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
      ) : brands?.length === 0 ? (
        <div className={clsx('text-center py-10 rounded-2xl border border-dashed', isDark ? 'border-dark-700 text-dark-500' : 'border-gray-200 text-gray-400')}>
          <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay marcas registradas</p>
          <p className="text-xs mt-0.5">Agrega tu primera marca arriba</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {brands?.map((brand) => (
              <motion.div
                key={brand.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors',
                  isDark ? 'border-dark-700 bg-dark-800/50' : 'border-gray-100 bg-gray-50/50'
                )}
              >
                {editId === brand.id ? (
                  <>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleUpdate(); if (e.key === 'Escape') setEditId(null); }}
                      autoFocus
                      className={clsx(inputClass, 'flex-1 py-1.5')}
                    />
                    <button
                      onClick={handleUpdate}
                      disabled={updateMutation.isPending}
                      className="p-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                    >
                      {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className={clsx('p-1.5 rounded-lg transition-colors', isDark ? 'hover:bg-dark-700 text-dark-400' : 'hover:bg-gray-200 text-gray-400')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center shrink-0">
                      <Tag className="w-4 h-4 text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={clsx('text-sm font-semibold', isDark ? 'text-white' : 'text-dark-900')}>{brand.name}</p>
                      {brand._count?.products !== undefined && (
                        <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>
                          {brand._count.products} producto{brand._count.products !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => startEdit(brand)}
                      className={clsx('p-1.5 rounded-lg transition-colors', isDark ? 'hover:bg-dark-700 text-dark-400 hover:text-dark-200' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600')}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(brand.id)}
                      disabled={deleteMutation.isPending}
                      className={clsx('p-1.5 rounded-lg transition-colors', isDark ? 'hover:bg-red-500/10 text-dark-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ── Página principal de Configuración ──
export default function SettingsPage() {
  const { isDark } = useThemeStore();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('company');
  const [form, setForm] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data.data)
  });

  useEffect(() => {
    if (data) {
      setForm({
        'company.name': data.company?.name || '',
        'company.address': data.company?.address || '',
        'company.phone': data.company?.phone || '',
        'company.email': data.company?.email || '',
        'company.currency': data.company?.currency || 'PYG',
        'company.currencySymbol': data.company?.currencySymbol || '₲',
        'company.taxId': data.company?.taxId || '',
        'pos.taxRate': data.pos?.taxRate || 10,
        'pos.receiptFooter': data.pos?.receiptFooter || '¡Gracias por su compra!',
        'pos.pointsRate': data.pos?.pointsRate || 10000,
        'inventory.lowStockAlert': data.inventory?.lowStockAlert || 5,
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (settings) => api.post('/settings/bulk', { settings }),
    onSuccess: () => {
      toast.success('Configuración guardada');
      queryClient.invalidateQueries(['settings']);
    },
    onError: () => toast.error('Error al guardar configuración')
  });

  const cardBase = isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100';
  const inputClass = clsx('w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all', isDark ? 'bg-dark-800 border-dark-700 text-white placeholder:text-dark-600 focus:border-primary-500' : 'bg-white border-gray-200 text-dark-900 placeholder:text-gray-400 focus:border-primary-500');
  const labelClass = clsx('block text-xs font-semibold mb-1.5', isDark ? 'text-dark-300' : 'text-dark-700');

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className={clsx('text-2xl font-display font-bold', isDark ? 'text-white' : 'text-dark-900')}>Configuración</h1>
        <p className={clsx('text-sm mt-0.5', isDark ? 'text-dark-400' : 'text-gray-500')}>Ajusta los parámetros del sistema</p>
      </div>

      {/* Tabs */}
      <div className={clsx('flex flex-wrap items-center gap-1 p-1 rounded-2xl border w-fit', cardBase)}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all', tab === t.id ? 'bg-primary-500 text-white' : isDark ? 'text-dark-400 hover:text-dark-200' : 'text-gray-500 hover:text-dark-700')}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && tab !== 'brands' ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
      ) : (
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={clsx('rounded-2xl border p-6 space-y-5', cardBase)}>

          {/* EMPRESA */}
          {tab === 'company' && (
            <>
              <h3 className={clsx('font-semibold flex items-center gap-2', isDark ? 'text-white' : 'text-dark-900')}>
                <Building2 className="w-4 h-4 text-primary-500" />
                Datos de la Empresa
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Nombre de la empresa</label>
                  <input value={form['company.name'] || ''} onChange={e => update('company.name', e.target.value)} className={inputClass} placeholder="Maria Bonita" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Dirección</label>
                  <input value={form['company.address'] || ''} onChange={e => update('company.address', e.target.value)} className={inputClass} placeholder="Asunción, Paraguay" />
                </div>
                <div>
                  <label className={labelClass}>Teléfono</label>
                  <input value={form['company.phone'] || ''} onChange={e => update('company.phone', e.target.value)} className={inputClass} placeholder="+595 21 000000" />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input type="email" value={form['company.email'] || ''} onChange={e => update('company.email', e.target.value)} className={inputClass} placeholder="info@boutique.com" />
                </div>
                <div>
                  <label className={labelClass}>Moneda</label>
                  <select value={form['company.currency'] || 'PYG'} onChange={e => update('company.currency', e.target.value)} className={inputClass}>
                    <option value="PYG">Guaraní (₲)</option>
                    <option value="USD">Dólar ($)</option>
                    <option value="ARS">Peso Argentino</option>
                    <option value="BRL">Real Brasileño</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>RUC / NIT / Tax ID</label>
                  <input value={form['company.taxId'] || ''} onChange={e => update('company.taxId', e.target.value)} className={inputClass} placeholder="80000000-0" />
                </div>
              </div>
            </>
          )}

          {/* POS */}
          {tab === 'pos' && (
            <>
              <h3 className={clsx('font-semibold flex items-center gap-2', isDark ? 'text-white' : 'text-dark-900')}>
                <Receipt className="w-4 h-4 text-emerald-500" />
                Configuración del POS
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Tasa de impuesto (%)</label>
                  <input type="number" value={form['pos.taxRate'] || 0} onChange={e => update('pos.taxRate', Number(e.target.value))} className={inputClass} min="0" max="100" step="0.01" />
                </div>
                <div>
                  <label className={labelClass}>Puntos por cada (₲)</label>
                  <input type="number" value={form['pos.pointsRate'] || 10000} onChange={e => update('pos.pointsRate', Number(e.target.value))} className={inputClass} />
                  <p className={clsx('text-xs mt-1', isDark ? 'text-dark-500' : 'text-gray-400')}>1 punto por cada X guaraníes</p>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Mensaje en tickets</label>
                  <input value={form['pos.receiptFooter'] || ''} onChange={e => update('pos.receiptFooter', e.target.value)} className={inputClass} placeholder="¡Gracias por su compra!" />
                  <p className="text-xs text-amber-500 mt-1">
                    ⚠ Todos los documentos incluyen automáticamente: "Documento sin validez fiscal."
                  </p>
                </div>
                <div>
                  <label className={labelClass}>Alerta stock mínimo</label>
                  <input type="number" value={form['inventory.lowStockAlert'] || 5} onChange={e => update('inventory.lowStockAlert', Number(e.target.value))} className={inputClass} min="0" />
                </div>
              </div>
            </>
          )}

          {/* CATEGORÍAS */}
          {tab === 'categories' && <CategoriesTab isDark={isDark} />}

          {/* MARCAS */}
          {tab === 'brands' && <BrandsTab isDark={isDark} />}

          {/* NOTIFICACIONES */}
          {tab === 'notifications' && (
            <>
              <h3 className={clsx('font-semibold', isDark ? 'text-white' : 'text-dark-900')}>Notificaciones</h3>
              <div className="space-y-4">
                {[
                  { key: 'notif.lowStock', label: 'Alerta de stock bajo', desc: 'Cuando un producto llegue al mínimo' },
                  { key: 'notif.newSale', label: 'Nueva venta', desc: 'Al registrar cada venta' },
                  { key: 'notif.cashClose', label: 'Cierre de caja', desc: 'Al cerrar la caja del día' },
                ].map(n => (
                  <div key={n.key} className="flex items-center justify-between">
                    <div>
                      <p className={clsx('text-sm font-medium', isDark ? 'text-white' : 'text-dark-900')}>{n.label}</p>
                      <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>{n.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-10 h-5 bg-gray-200 dark:bg-dark-700 rounded-full peer peer-checked:bg-primary-500 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                    </label>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Guardar — solo tabs de configuración, no marcas */}
          {tab !== 'brands' && tab !== 'categories' && (
            <div className="pt-4 border-t border-gray-100 dark:border-dark-800">
              <button
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors shadow-glow"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar Configuración
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
