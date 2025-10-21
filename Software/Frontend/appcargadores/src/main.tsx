import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import './index.css';
import 'leaflet/dist/leaflet.css'; // Importar correctamente el CSS de Leaflet

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <NotificationsProvider>
        <App />
      </NotificationsProvider>
    </AuthProvider>
  </React.StrictMode>
);