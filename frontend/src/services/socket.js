// ============================================
// SOCKET SERVICE - Cliente
// ============================================

import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket?.connected) return;

    // VITE_SOCKET_URL o derivar del VITE_API_URL quitando /api/v1
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const socketUrl = import.meta.env.VITE_SOCKET_URL || apiUrl.replace('/api/v1', '') || window.location.origin;

    this.socket = io(socketUrl, {
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      transports: ['polling', 'websocket']
    });

    this.socket.on('connect', () => {
      console.log('Socket conectado:', this.socket.id);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('Socket error:', err.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket desconectado:', reason);
    });

    // Re-attach listeners
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(cb => this.socket.on(event, cb));
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinBranch(branchId) {
    this.socket?.emit('join:branch', branchId);
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    this.socket?.on(event, callback);
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
    this.socket?.off(event, callback);
  }

  emit(event, data) {
    this.socket?.emit(event, data);
  }

  get connected() {
    return this.socket?.connected || false;
  }
}

export const socket = new SocketService();
