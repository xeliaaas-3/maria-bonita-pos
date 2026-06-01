// ============================================
// CUSTOMER SEARCH - POS Component
// ============================================

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, X, Search, Star, Phone } from 'lucide-react';
import api from '@/services/api';
import { formatCurrency } from '@/utils/format';
import { clsx } from 'clsx';

export default function CustomerSearch({ customer, onSelect, isDark }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const { data: results } = useQuery({
    queryKey: ['customer-search', query],
    queryFn: () => api.get(`/customers/search?q=${query}`).then(r => r.data.data),
    enabled: query.length >= 2
  });

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (c) => {
    onSelect(c);
    setQuery('');
    setOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery('');
  };

  return (
    <div ref={ref} className="relative">
      {customer ? (
        <div className={clsx('flex items-center gap-2 px-3 py-2 rounded-xl', isDark ? 'bg-dark-800' : 'bg-primary-50')}>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className={clsx('text-xs font-semibold truncate', isDark ? 'text-white' : 'text-primary-900')}>{customer.name}</p>
            <p className={clsx('text-[10px] truncate', isDark ? 'text-dark-400' : 'text-primary-600')}>
              {customer.points} pts · {formatCurrency(customer.totalSpent, true)}
            </p>
          </div>
          <button onClick={handleClear} className={clsx('p-0.5 rounded', isDark ? 'text-dark-400 hover:text-dark-200' : 'text-primary-400 hover:text-primary-600')}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className={clsx('flex items-center gap-2 px-3 py-2 rounded-xl border', isDark ? 'border-dark-700 bg-dark-800' : 'border-gray-200 bg-gray-50')}>
          <User className={clsx('w-4 h-4 shrink-0', isDark ? 'text-dark-500' : 'text-gray-400')} />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Buscar cliente..."
            className={clsx('flex-1 text-xs bg-transparent outline-none', isDark ? 'text-white placeholder:text-dark-600' : 'text-dark-900 placeholder:text-gray-400')}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Dropdown */}
      {open && query.length >= 2 && !customer && (
        <div className={clsx('absolute top-full left-0 right-0 mt-1 rounded-xl border shadow-xl z-50 overflow-hidden', isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100')}>
          {results?.length === 0 ? (
            <div className={clsx('p-3 text-xs text-center', isDark ? 'text-dark-500' : 'text-gray-400')}>
              No se encontraron clientes
            </div>
          ) : (
            results?.map(c => (
              <button
                key={c.id}
                onClick={() => handleSelect(c)}
                className={clsx('w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors', isDark ? 'hover:bg-dark-800' : 'hover:bg-gray-50')}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-sm font-medium truncate', isDark ? 'text-white' : 'text-dark-900')}>{c.name}</p>
                  <div className={clsx('flex items-center gap-2 text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>
                    {c.phone && <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{c.phone}</span>}
                    <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 text-amber-400" />{c.points} pts</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
