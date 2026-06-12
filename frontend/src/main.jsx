import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { useAuthStore } from './store/auth.store';
import api from './services/api';
import { socket } from './services/socket';
import { registerSW } from 'virtual:pwa-register';
import { initOfflineSync } from './utils/offlineQueue';

registerSW({ immediate: true });
initOfflineSync();

// Configurar token al inicio
const { accessToken, isAuthenticated, user } = useAuthStore.getState();
if (accessToken && isAuthenticated) {
  api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  socket.connect(accessToken);
  if (user?.branchId) socket.joinBranch(user.branchId);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      refetchOnWindowFocus: false,
      onError: (error) => {
        if (error?.response?.status === 401) {
          useAuthStore.getState().logout();
        }
      }
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
