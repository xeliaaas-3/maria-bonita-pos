// ============================================
// PUNTO DE VENTA - POS
// ============================================

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Minus, Trash2, ShoppingCart,
  User, Percent, DollarSign, Printer, X,
  Barcode, CreditCard, Smartphone, Banknote,
  QrCode, CheckCircle, AlertCircle, Package
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/services/api';
import { useThemeStore } from '@/store/theme.store';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency } from '@/utils/format';
import { clsx } from 'clsx';
import CustomerSearch from '@/components/pos/CustomerSearch';
import PaymentModal from '@/components/pos/PaymentModal';
import OpenCashModal from '@/components/pos/OpenCashModal';
import { queueSale, isNetworkError } from '@/utils/offlineQueue';

export default function POSPage() {
  const { isDark } = useThemeStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Estado del carrito
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [discount, setDiscount] = useState({ value: 0, type: 'MONTO' });
  const [searchQuery, setSearchQuery] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [showOpenCash, setShowOpenCash] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const searchRef = useRef(null);

  // Verificar caja
  const { data: cashData, isLoading: cashLoading } = useQuery({
    queryKey: ['cash-session-active'],
    queryFn: () => api.get('/cash/session/active').then(r => r.data.data),
    refetchInterval: 60000
  });

  // Búsqueda de productos
  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['pos-search', searchQuery],
    queryFn: () => api.get(`/products/search?q=${searchQuery}&limit=12`).then(r => r.data.data),
    enabled: searchQuery.length >= 2,
    staleTime: 30000
  });

  // Crear venta
  const createSaleMutation = useMutation({
    mutationFn: (saleData) => api.post('/sales', saleData).then(r => r.data.data),
    onSuccess: (sale) => {
      setLastSale(sale);
      setShowSuccess(true);
      setCart([]);
      setCustomer(null);
      setDiscount({ value: 0, type: 'MONTO' });
      setShowPayment(false);
      queryClient.invalidateQueries(['dashboard']);
      queryClient.invalidateQueries(['cash-session-active']);
    },
    onError: async (error, saleData) => {
      if (isNetworkError(error)) {
        await queueSale(saleData);
        setLastSale(null);
        setShowSuccess('offline');
        setCart([]);
        setCustomer(null);
        setDiscount({ value: 0, type: 'MONTO' });
        setShowPayment(false);
        toast.success('Sin conexión: la venta se guardó y se enviará automáticamente');
        return;
      }
      toast.error(error.response?.data?.error || 'Error al procesar la venta');
    }
  });

  // Agregar al carrito
  const addToCart = useCallback((product, variant = null) => {
    const key = `${product.id}-${variant?.id || 'base'}`;
    setCart(prev => {
      const existing = prev.find(i => i.key === key);
      if (existing) {
        return prev.map(i =>
          i.key === key ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        key,
        productId: product.id,
        variantId: variant?.id,
        name: product.name + (variant ? ` - ${variant.size || ''} ${variant.color || ''}`.trim() : ''),
        sku: variant?.sku || product.sku,
        unitPrice: Number(variant?.price || product.salePrice),
        quantity: 1,
        discount: 0,
        image: product.images?.[0]
      }];
    });
  }, []);

  // Cambiar cantidad
  const updateQuantity = (key, delta) => {
    setCart(prev => prev.map(i =>
      i.key === key
        ? { ...i, quantity: Math.max(1, i.quantity + delta) }
        : i
    ).filter(i => i.quantity > 0));
  };

  // Eliminar item
  const removeItem = (key) => {
    setCart(prev => prev.filter(i => i.key !== key));
  };

  // Cálculos
  const subtotal = cart.reduce((sum, i) => sum + (i.unitPrice * i.quantity - i.discount), 0);
  const discountAmount = discount.type === 'PORCENTAJE'
    ? (subtotal * discount.value) / 100
    : discount.value;
  const total = Math.max(0, subtotal - discountAmount);

  // Manejar pago
  const handlePay = (payments) => {
    const saleData = {
      customerId: customer?.id,
      items: cart.map(i => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount
      })),
      payments,
      discount: discount.value,
      discountType: discount.type,
      cashSessionId: cashData?.id
    };
    createSaleMutation.mutate(saleData);
  };

  // Imprimir comprobante PDF (A4)
  const printTicket = async (saleId) => {
    try {
      const response = await api.get(`/sales/${saleId}/ticket`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      win?.focus();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('Error al generar el ticket');
    }
  };

  // Imprimir ticket térmico (80mm) - ideal para celular/impresora térmica
  const printThermalTicket = async (saleId) => {
    try {
      const response = await api.get(`/sales/${saleId}/ticket-html`, { responseType: 'text' });
      const blob = new Blob([response.data], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      win?.focus();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('Error al generar el ticket');
    }
  };

  // Focus en búsqueda al cargar
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const cardBase = isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100';

  if (cashLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!cashData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
        <div className="w-20 h-20 rounded-2xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-amber-500" />
        </div>
        <div className="text-center">
          <h2 className={clsx('text-xl font-bold mb-2', isDark ? 'text-white' : 'text-dark-900')}>
            Caja no abierta
          </h2>
          <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-gray-500')}>
            Debe abrir la caja antes de realizar ventas
          </p>
        </div>
        <button
          onClick={() => setShowOpenCash(true)}
          className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors"
        >
          Abrir Caja
        </button>
        {showOpenCash && <OpenCashModal onClose={() => setShowOpenCash(false)} />}
      </div>
    );
  }

  return (
    <div className={clsx('flex flex-col lg:flex-row min-h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] lg:overflow-hidden', isDark ? 'bg-dark-950' : 'bg-gray-50')}>
      {/* Left: Product Search */}
      <div className="flex-1 flex flex-col lg:overflow-hidden p-3 sm:p-4 gap-3 sm:gap-4">
        {/* Search Bar */}
        <div className={clsx('flex items-center gap-3 px-4 py-3 rounded-2xl border', cardBase)}>
          <Search className={clsx('w-5 h-5 shrink-0', isDark ? 'text-dark-400' : 'text-gray-400')} />
          <input
            ref={searchRef}
            type="text"
            placeholder="Buscar producto por nombre, SKU o código de barras..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={clsx(
              'flex-1 bg-transparent text-sm outline-none',
              isDark ? 'text-white placeholder:text-dark-500' : 'text-dark-900 placeholder:text-gray-400'
            )}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
          <div className={clsx('flex items-center gap-1 px-2 py-1 rounded-lg text-xs', isDark ? 'bg-dark-800 text-dark-400' : 'bg-gray-100 text-gray-500')}>
            <Barcode className="w-3 h-3" />
            Escanear
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 lg:overflow-y-auto">
          {searchQuery.length < 2 ? (
            <div className={clsx('flex flex-col items-center justify-center h-full gap-3', isDark ? 'text-dark-600' : 'text-gray-300')}>
              <Package className="w-16 h-16" />
              <p className="text-sm font-medium">Busca un producto para comenzar</p>
            </div>
          ) : searching ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className={clsx('h-36 rounded-xl animate-pulse', isDark ? 'bg-dark-800' : 'bg-gray-100')} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {searchResults?.map(product => (
                <motion.button
                  key={product.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => addToCart(product)}
                  className={clsx(
                    'text-left rounded-xl border p-3 transition-colors hover:border-primary-500/50',
                    cardBase
                  )}
                >
                  <div className={clsx('w-full aspect-square rounded-lg mb-2 flex items-center justify-center overflow-hidden', isDark ? 'bg-dark-800' : 'bg-gray-50')}>
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-8 h-8 text-gray-300" />
                    )}
                  </div>
                  <p className={clsx('text-xs font-medium truncate', isDark ? 'text-white' : 'text-dark-900')}>
                    {product.name}
                  </p>
                  <p className={clsx('text-xs truncate mb-1', isDark ? 'text-dark-400' : 'text-gray-500')}>
                    {product.sku}
                  </p>
                  <p className="text-sm font-bold text-primary-500">
                    {formatCurrency(product.salePrice)}
                  </p>
                </motion.button>
              ))}
              {searchResults?.length === 0 && (
                <div className={clsx('col-span-full text-center py-12 text-sm', isDark ? 'text-dark-500' : 'text-gray-400')}>
                  No se encontraron productos
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart */}
      <div className={clsx('w-full lg:w-80 xl:w-96 flex flex-col border-t lg:border-t-0 lg:border-l lg:overflow-hidden', isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100')}>
        {/* Cart Header */}
        <div className={clsx('flex items-center justify-between p-4 border-b', isDark ? 'border-dark-800' : 'border-gray-100')}>
          <div className="flex items-center gap-2">
            <ShoppingCart className={clsx('w-5 h-5', isDark ? 'text-dark-300' : 'text-dark-700')} />
            <span className={clsx('font-semibold', isDark ? 'text-white' : 'text-dark-900')}>Carrito</span>
            {cart.length > 0 && (
              <span className="bg-primary-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="text-xs text-red-500 hover:text-red-600"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Customer */}
        <div className={clsx('px-4 py-3 border-b', isDark ? 'border-dark-800' : 'border-gray-100')}>
          <CustomerSearch customer={customer} onSelect={setCustomer} isDark={isDark} />
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[50vh] lg:max-h-none">
          <AnimatePresence>
            {cart.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={clsx('flex flex-col items-center justify-center h-32 gap-2', isDark ? 'text-dark-600' : 'text-gray-300')}
              >
                <ShoppingCart className="w-10 h-10" />
                <p className="text-xs">Agrega productos al carrito</p>
              </motion.div>
            ) : (
              cart.map(item => (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={clsx('rounded-xl p-3 border', isDark ? 'border-dark-800 bg-dark-800/50' : 'border-gray-100 bg-gray-50')}
                >
                  <div className="flex items-start gap-2">
                    <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden', isDark ? 'bg-dark-700' : 'bg-white')}>
                      {item.image ? (
                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={clsx('text-xs font-medium truncate', isDark ? 'text-white' : 'text-dark-900')}>
                        {item.name}
                      </p>
                      <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>
                        {formatCurrency(item.unitPrice)} c/u
                      </p>
                    </div>
                    <button onClick={() => removeItem(item.key)} className="text-gray-400 hover:text-red-500 shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className={clsx('flex items-center gap-2 rounded-lg', isDark ? 'bg-dark-700' : 'bg-white')}>
                      <button
                        onClick={() => updateQuantity(item.key, -1)}
                        className={clsx('w-9 h-9 rounded-lg flex items-center justify-center transition-colors active:scale-95', isDark ? 'hover:bg-dark-600 text-dark-300' : 'hover:bg-gray-100 text-gray-600')}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className={clsx('text-sm font-bold w-5 text-center', isDark ? 'text-white' : 'text-dark-900')}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.key, 1)}
                        className={clsx('w-9 h-9 rounded-lg flex items-center justify-center transition-colors active:scale-95', isDark ? 'hover:bg-dark-600 text-dark-300' : 'hover:bg-gray-100 text-gray-600')}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className={clsx('text-sm font-bold', isDark ? 'text-white' : 'text-dark-900')}>
                      {formatCurrency(item.unitPrice * item.quantity - item.discount)}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Totals & Payment */}
        <div className={clsx('p-4 border-t space-y-3 sticky bottom-0', isDark ? 'border-dark-800 bg-dark-900' : 'border-gray-100 bg-white')}>
          {/* Discount */}
          <div className="flex items-center gap-2">
            <Percent className={clsx('w-4 h-4 shrink-0', isDark ? 'text-dark-400' : 'text-gray-400')} />
            <input
              type="number"
              placeholder="Descuento"
              value={discount.value || ''}
              onChange={e => setDiscount(d => ({ ...d, value: Number(e.target.value) || 0 }))}
              className={clsx(
                'flex-1 text-sm rounded-lg px-2 py-1.5 outline-none border',
                isDark
                  ? 'bg-dark-800 border-dark-700 text-white placeholder:text-dark-500'
                  : 'bg-gray-50 border-gray-200 text-dark-900 placeholder:text-gray-400'
              )}
            />
            <select
              value={discount.type}
              onChange={e => setDiscount(d => ({ ...d, type: e.target.value }))}
              className={clsx(
                'text-sm rounded-lg px-2 py-1.5 outline-none border',
                isDark ? 'bg-dark-800 border-dark-700 text-white' : 'bg-gray-50 border-gray-200 text-dark-900'
              )}
            >
              <option value="MONTO">₲</option>
              <option value="PORCENTAJE">%</option>
            </select>
          </div>

          {/* Totals */}
          <div className={clsx('rounded-xl p-3 space-y-1.5', isDark ? 'bg-dark-800' : 'bg-gray-50')}>
            <div className="flex justify-between text-sm">
              <span className={isDark ? 'text-dark-400' : 'text-gray-500'}>Subtotal</span>
              <span className={isDark ? 'text-white' : 'text-dark-900'}>{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-red-500">Descuento</span>
                <span className="text-red-500">-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className={clsx('flex justify-between text-base font-bold border-t pt-1.5', isDark ? 'border-dark-700' : 'border-gray-200')}>
              <span className={isDark ? 'text-white' : 'text-dark-900'}>TOTAL</span>
              <span className="text-primary-500 font-mono">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Pay Button */}
          <button
            onClick={() => setShowPayment(true)}
            disabled={cart.length === 0}
            className={clsx(
              'w-full py-4 rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2 active:scale-[0.99]',
              cart.length === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-dark-800 dark:text-dark-600'
                : 'bg-primary-500 hover:bg-primary-600 text-white shadow-glow hover:shadow-lg'
            )}
          >
            <CreditCard className="w-4 h-4" />
            Cobrar {cart.length > 0 && formatCurrency(total)}
          </button>
        </div>
      </div>

      {/* ── Modal Venta Guardada Offline ── */}
      {showSuccess === 'offline' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.6)' }}
        >
          <div className={clsx(
            'w-full max-w-sm rounded-3xl shadow-2xl border overflow-hidden',
            isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100'
          )}>
            <div className="bg-amber-500 px-6 pt-8 pb-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-9 h-9 text-white" />
              </div>
              <p className="text-white font-bold text-xl">Venta guardada (sin conexión)</p>
              <p className="text-amber-100 text-sm mt-0.5">Se enviará automáticamente al recuperar internet</p>
            </div>
            <div className="px-6 py-5">
              <button
                onClick={() => setShowSuccess(false)}
                className="w-full py-3 rounded-xl font-medium text-sm bg-primary-500 hover:bg-primary-600 text-white transition-colors"
              >
                Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Éxito Post-Venta ── */}
      {showSuccess === true && lastSale && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.6)' }}
        >
          <div className={clsx(
            'w-full max-w-sm rounded-3xl shadow-2xl border overflow-hidden',
            isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100'
          )}>
            {/* Top green band */}
            <div className="bg-emerald-500 px-6 pt-8 pb-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-9 h-9 text-white" />
              </div>
              <p className="text-white font-bold text-xl">¡Venta Registrada!</p>
              <p className="text-emerald-100 text-sm mt-0.5">N° {lastSale.number}</p>
            </div>

            {/* Details */}
            <div className="px-6 py-5 space-y-3">
              <div className={clsx('rounded-2xl p-4 space-y-2', isDark ? 'bg-dark-800' : 'bg-gray-50')}>
                <div className="flex justify-between text-sm">
                  <span className={isDark ? 'text-dark-400' : 'text-gray-500'}>Total cobrado</span>
                  <span className={clsx('font-mono font-bold text-lg text-emerald-500')}>{formatCurrency(lastSale.total)}</span>
                </div>
                {Number(lastSale.change) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className={isDark ? 'text-dark-400' : 'text-gray-500'}>Vuelto</span>
                    <span className="font-mono font-semibold text-emerald-500">{formatCurrency(lastSale.change)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className={isDark ? 'text-dark-400' : 'text-gray-500'}>Cliente</span>
                  <span className={clsx('font-medium', isDark ? 'text-white' : 'text-dark-900')}>
                    {lastSale.customer?.name || 'Consumidor Final'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={isDark ? 'text-dark-400' : 'text-gray-500'}>Productos</span>
                  <span className={clsx('font-medium', isDark ? 'text-white' : 'text-dark-900')}>
                    {lastSale.items?.length || 0} ítem(s)
                  </span>
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={() => printThermalTicket(lastSale.id)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-colors"
              >
                <Printer className="w-4 h-4" />
                Imprimir Ticket (térmico)
              </button>

              <button
                onClick={() => printTicket(lastSale.id)}
                className={clsx(
                  'w-full flex items-center justify-center gap-2 py-3 font-medium text-sm rounded-xl transition-colors',
                  isDark ? 'bg-dark-800 text-dark-300 hover:bg-dark-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <Printer className="w-4 h-4" />
                Comprobante PDF (A4)
              </button>

              <button
                onClick={() => setShowSuccess(false)}
                className={clsx(
                  'w-full py-3 rounded-xl font-medium text-sm transition-colors',
                  isDark ? 'bg-dark-800 text-dark-300 hover:bg-dark-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal
          total={total}
          onPay={handlePay}
          onClose={() => setShowPayment(false)}
          loading={createSaleMutation.isPending}
          isDark={isDark}
        />
      )}
    </div>
  );
}
