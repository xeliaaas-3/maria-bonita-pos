// ============================================
// AUTH STORE - Zustand
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/services/api';
import { socket } from '@/services/socket';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          const { user, accessToken, refreshToken } = data.data;

          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false
          });

          // Configurar token en axios
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

          // Conectar socket
          socket.connect(accessToken);
          if (user.branchId) {
            socket.joinBranch(user.branchId);
          }

          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return {
            success: false,
            error: error.response?.data?.error || 'Error al iniciar sesión'
          };
        }
      },

      logout: async () => {
        try {
          const { refreshToken } = get();
          await api.post('/auth/logout', { refreshToken });
        } catch {}

        socket.disconnect();

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false
        });

        delete api.defaults.headers.common['Authorization'];
        window.location.href = '/login';
      },

      refreshTokens: async () => {
        try {
          const { refreshToken } = get();
          if (!refreshToken) return false;

          const { data } = await api.post('/auth/refresh', { refreshToken });
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = data.data;

          set({ accessToken: newAccessToken, refreshToken: newRefreshToken });
          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

          return true;
        } catch {
          get().logout();
          return false;
        }
      },

      updateUser: (userData) => {
        set((state) => ({ user: { ...state.user, ...userData } }));
      },

      hasRole: (...roles) => {
        const { user } = get();
        return user && roles.includes(user.role);
      }
    }),
    {
      name: 'boutique-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
