import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, Search, Plus, Minus, Tag, Loader2, FileText, Check, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/services/api';
import { useThemeStore } from '@/store/theme.store';
import { formatCurrency } from '@/utils/format';
import { clsx } from 'clsx';

export default function LabelsPage() {
  const { isDark } = useThemeStore();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [printing, setPrinting] = useState(false);

  // Catalog options
  const [showCatalogPanel, setShowCatalogPanel] = useState(false);
  const [selectedCats, setSelectedCats] = useState([]);   // [] = all

  const { data: products, isLoading } = useQuery({
    queryKey: ['products-labels', search],
    queryFn: () => api.get(`/products?search=${search}&limit=30&status=ACTIVO`).then(r => r.data.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data.data),
  });

  const addProduct = (product, variant = null) => {
    const key = `${product.id}-${variant?.id || 'base'}`;
    if (selected.find(s => s.key === key)) return;
    setSelected(prev => [...prev, { key, product, variant, qty: 1 }]);
  };

  const updateQty = (key, delta) => {
    setSelected(prev =>
      prev.map(s => s.key === key ? { ...s, qty: Math.max(1, s.qty + delta) } : s)
    );
  };

  const removeSelected = (key) => setSelected(prev => prev.filter(s => s.key !== key));

  const printLabels = async () => {
    if (selected.length === 0) return toast.error('Seleccioná al menos un producto');
    setPrinting(true);
    try {
      const response = await api.post('/products/labels', {
        items: selected.map(s => ({ productId: s.product.id, variantId: s.variant?.id, qty: s.qty }))
      }, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('Error al generar etiquetas');
    } finally {
      setPrinting(false);
    }
  };

  const generateCatalog = async (withPrice = true, layout = 'grid') => {
    setPrinting(true);
    try {
      const catParam = selectedCats.length > 0 ? `&categories=${selectedCats.join(',')}` : '';
      const response = await api.get(
        `/products/catalog?showPrice=${withPrice}&layout=${layout}${catParam}`,
        { responseType: 'blob' }
      );
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setShowCatalogPanel(false);
    } catch {
      toast.error('Error al generar catálogo');
    } finally {
      setPrinting(false);
    }
  };

  const toggleCat = (id) => {
    setSelectedCats(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const cardBase = isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100';
  const inputClass = clsx(
    'w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all',
    isDark
      ? 'bg-dark-800 border-dark-700 text-white placeholder:text-dark-600 focus:border-primary-500'
      : 'bg-white border-gray-200 text-dark-900 placeholder:text-gray-400 focus:border-primary-500'
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={clsx('text-2xl font-display font-bold', isDark ? 'text-white' : 'text-dark-900')}>
            Etiquetas y Catálogo
          </h1>
          <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-gray-500')}>
            Imprimí etiquetas de precio y generá catálogos para WhatsApp
          </p>
        </div>

        {/* Catalog buttons */}
        <div className="relative">
          <button
            onClick={() => setShowCatalogPanel(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold text-sm shadow-glow transition-colors"
          >
            <FileText className="w-4 h-4" />
            Generar Catálogo
            <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform', showCatalogPanel && 'rotate-180')} />
          </button>

          {/* Dropdown panel */}
          {showCatalogPanel && (
            <div className={clsx(
              'absolute right-0 top-full mt-2 w-80 rounded-2xl border shadow-2xl z-30 p-4 space-y-4',
              isDark ? 'bg-dark-900 border-dark-700' : 'bg-white border-gray-100'
            )}>
              <div>
                <p className={clsx('text-xs font-bold uppercase tracking-wide mb-2', isDark ? 'text-dark-300' : 'text-dark-600')}>
                  Filtrar por categorías
                </p>
                <p className={clsx('text-xs mb-3', isDark ? 'text-dark-500' : 'text-gray-400')}>
                  Sin selección = todas las categorías
                </p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {categories?.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => toggleCat(cat.id)}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors text-left',
                        selectedCats.includes(cat.id)
                          ? 'bg-primary-500 text-white'
                          : isDark ? 'hover:bg-dark-800 text-dark-200' : 'hover:bg-gray-50 text-dark-800'
                      )}
                    >
                      <div className={clsx(
                        'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0',
                        selectedCats.includes(cat.id)
                          ? 'border-white bg-white/20'
                          : isDark ? 'border-dark-600' : 'border-gray-300'
                      )}>
                        {selectedCats.includes(cat.id) && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      {cat.name}
                      <span className={clsx('ml-auto text-xs', selectedCats.includes(cat.id) ? 'text-white/70' : isDark ? 'text-dark-500' : 'text-gray-400')}>
                        {cat._count?.products || ''}
                      </span>
                    </button>
                  ))}
                  {!categories?.length && (
                    <p className={clsx('text-xs text-center py-3', isDark ? 'text-dark-500' : 'text-gray-400')}>
                      No hay categorías creadas
                    </p>
                  )}
                </div>
                {selectedCats.length > 0 && (
                  <button
                    onClick={() => setSelectedCats([])}
                    className="text-xs text-red-400 hover:text-red-500 mt-2"
                  >
                    Limpiar selección ({selectedCats.length})
                  </button>
                )}
              </div>

              <div className={clsx('border-t pt-3 space-y-2', isDark ? 'border-dark-700' : 'border-gray-100')}>
                <p className={clsx('text-xs font-bold uppercase tracking-wide', isDark ? 'text-dark-300' : 'text-dark-600')}>
                  Catálogo en cuadrícula
                </p>
                <button
                  onClick={() => generateCatalog(true, 'grid')}
                  disabled={printing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Con precios
                </button>
                <button
                  onClick={() => generateCatalog(false, 'grid')}
                  disabled={printing}
                  className={clsx(
                    'w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl border transition-colors disabled:opacity-50',
                    isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Sin precios
                </button>
              </div>

              <div className={clsx('border-t pt-3 space-y-2', isDark ? 'border-dark-700' : 'border-gray-100')}>
                <p className={clsx('text-xs font-bold uppercase tracking-wide', isDark ? 'text-dark-300' : 'text-dark-600')}>
                  Ficha por producto (1 hoja c/u)
                </p>
                <button
                  onClick={() => generateCatalog(true, 'poster')}
                  disabled={printing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Con precios
                </button>
                <button
                  onClick={() => generateCatalog(false, 'poster')}
                  disabled={printing}
                  className={clsx(
                    'w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl border transition-colors disabled:opacity-50',
                    isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Sin precios
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Product selector */}
        <div className={clsx('rounded-2xl border p-5 space-y-4', cardBase)}>
          <h3 className={clsx('font-semibold flex items-center gap-2', isDark ? 'text-white' : 'text-dark-900')}>
            <Search className="w-4 h-4 text-primary-500" />
            Buscar Productos para Etiquetas
          </h3>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Escribí el nombre del producto..."
            className={inputClass}
          />
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {isLoading && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
              </div>
            )}
            {products?.map(p => (
              <div key={p.id} className={clsx('rounded-xl border overflow-hidden', isDark ? 'border-dark-700' : 'border-gray-100')}>
                <button
                  onClick={() => addProduct(p)}
                  className={clsx('w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors', isDark ? 'hover:bg-dark-800' : 'hover:bg-gray-50')}
                >
                  {p.images?.[0]
                    ? <img src={p.images[0]} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    : <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', isDark ? 'bg-dark-700' : 'bg-gray-100')}><Tag className="w-4 h-4 text-gray-400" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-sm font-medium truncate', isDark ? 'text-white' : 'text-dark-900')}>{p.name}</p>
                    <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>
                      {p.sku} · {formatCurrency(p.salePrice)}
                    </p>
                  </div>
                  <Plus className="w-4 h-4 text-primary-500 shrink-0" />
                </button>
                {p.variants?.map(v => (
                  <button
                    key={v.id}
                    onClick={() => addProduct(p, v)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2 text-left border-t transition-colors',
                      isDark ? 'border-dark-700 hover:bg-dark-800/60' : 'border-gray-50 hover:bg-gray-50/60'
                    )}
                  >
                    <div className="w-8" />
                    <div className="flex-1 min-w-0">
                      <p className={clsx('text-xs', isDark ? 'text-dark-300' : 'text-dark-700')}>
                        {[v.size, v.color].filter(Boolean).join(' / ')} · {v.sku}
                      </p>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Print queue */}
        <div className={clsx('rounded-2xl border p-5 space-y-4', cardBase)}>
          <h3 className={clsx('font-semibold flex items-center gap-2', isDark ? 'text-white' : 'text-dark-900')}>
            <Tag className="w-4 h-4 text-violet-500" />
            Etiquetas a imprimir ({selected.reduce((s, x) => s + x.qty, 0)} total)
          </h3>

          {selected.length === 0 ? (
            <div className={clsx(
              'text-center py-12 rounded-xl border border-dashed',
              isDark ? 'border-dark-700' : 'border-gray-200'
            )}>
              <Tag className="w-8 h-8 mx-auto mb-2 opacity-30 text-gray-400" />
              <p className={clsx('text-sm', isDark ? 'text-dark-500' : 'text-gray-400')}>
                Agregá productos desde la izquierda
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {selected.map(s => (
                <div
                  key={s.key}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl border',
                    isDark ? 'border-dark-700 bg-dark-800/50' : 'border-gray-100 bg-gray-50/50'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-sm font-medium truncate', isDark ? 'text-white' : 'text-dark-900')}>
                      {s.product.name}
                    </p>
                    <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>
                      {s.variant ? `${[s.variant.size, s.variant.color].filter(Boolean).join(' / ')} · ` : ''}
                      {formatCurrency(s.variant?.price || s.product.salePrice)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => updateQty(s.key, -1)}
                      className={clsx('w-6 h-6 rounded-lg flex items-center justify-center border', isDark ? 'border-dark-600 hover:bg-dark-700' : 'border-gray-200 hover:bg-gray-100')}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className={clsx('text-sm font-bold w-6 text-center', isDark ? 'text-white' : 'text-dark-900')}>
                      {s.qty}
                    </span>
                    <button
                      onClick={() => updateQty(s.key, 1)}
                      className={clsx('w-6 h-6 rounded-lg flex items-center justify-center border', isDark ? 'border-dark-600 hover:bg-dark-700' : 'border-gray-200 hover:bg-gray-100')}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeSelected(s.key)}
                    className="text-gray-400 hover:text-red-500 shrink-0 p-1"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={printLabels}
            disabled={selected.length === 0 || printing}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            Imprimir Etiquetas
          </button>
        </div>
      </div>

      {/* Info */}
      <div className={clsx('rounded-2xl border p-4', isDark ? 'bg-dark-900 border-dark-800' : 'bg-gray-50 border-gray-100')}>
        <p className={clsx('text-sm font-semibold mb-2', isDark ? 'text-dark-300' : 'text-dark-700')}>Sobre los formatos</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className={clsx('rounded-xl p-3', isDark ? 'bg-dark-800' : 'bg-white border border-gray-100')}>
            <p className={clsx('font-semibold mb-1', isDark ? 'text-white' : 'text-dark-900')}>🏷️ Etiquetas de precio</p>
            <p className={isDark ? 'text-dark-400' : 'text-gray-500'}>
              A4 con 24 etiquetas por hoja. Incluye nombre, SKU, talle/color y precio.
            </p>
          </div>
          <div className={clsx('rounded-xl p-3', isDark ? 'bg-dark-800' : 'bg-white border border-gray-100')}>
            <p className={clsx('font-semibold mb-1', isDark ? 'text-white' : 'text-dark-900')}>📋 Catálogo WhatsApp</p>
            <p className={isDark ? 'text-dark-400' : 'text-gray-500'}>
              PDF con fotos, talles y precios. Podés filtrar por categorías antes de generar.
            </p>
          </div>
        </div>
      </div>

      {/* Click outside to close catalog panel */}
      {showCatalogPanel && (
        <div className="fixed inset-0 z-20" onClick={() => setShowCatalogPanel(false)} />
      )}
    </div>
  );
}
