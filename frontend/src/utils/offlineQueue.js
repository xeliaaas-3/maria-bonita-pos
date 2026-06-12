// ============================================
// COLA DE VENTAS OFFLINE (IndexedDB)
// ============================================

import { get, set } from 'idb-keyval';
import api from '@/services/api';

const STORAGE_KEY = 'pending-sales';

let listeners = [];

export function onPendingSalesChange(cb) {
  listeners.push(cb);
  return () => { listeners = listeners.filter(l => l !== cb); };
}

function notify(pending) {
  listeners.forEach(cb => cb(pending));
}

export async function getPendingSales() {
  return (await get(STORAGE_KEY)) || [];
}

export async function queueSale(saleData) {
  const pending = await getPendingSales();
  const entry = {
    localId: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    saleData,
    createdAt: new Date().toISOString()
  };
  const next = [...pending, entry];
  await set(STORAGE_KEY, next);
  notify(next);
  return entry;
}

export async function removePendingSale(localId) {
  const pending = await getPendingSales();
  const next = pending.filter(p => p.localId !== localId);
  await set(STORAGE_KEY, next);
  notify(next);
}

// Indica si un error de axios es de red (sin conexión) y no de validación del servidor
export function isNetworkError(error) {
  return !error?.response && (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error' || !navigator.onLine);
}

let syncing = false;

export async function syncPendingSales() {
  if (syncing || !navigator.onLine) return;
  syncing = true;
  try {
    const pending = await getPendingSales();
    for (const entry of pending) {
      try {
        await api.post('/sales', entry.saleData);
        await removePendingSale(entry.localId);
      } catch (error) {
        if (!isNetworkError(error)) {
          // Error de validación/servidor: descartar para no bloquear la cola
          await removePendingSale(entry.localId);
        } else {
          break; // sigue sin conexión, reintentar después
        }
      }
    }
  } finally {
    syncing = false;
  }
}

export function initOfflineSync() {
  window.addEventListener('online', syncPendingSales);
  syncPendingSales();
}
