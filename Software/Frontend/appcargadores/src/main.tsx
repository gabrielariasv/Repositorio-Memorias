import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import PermissionsModal from './components/PermissionsModal';
import { Capacitor } from '@capacitor/core';
import { checkCriticalPermissions } from './utils/permissions';
import { useNotificationListeners } from './hooks/useNotificationListeners';
import './index.css';
import 'leaflet/dist/leaflet.css'; // Importar correctamente el CSS de Leaflet

export const Root: React.FC = () => {
  const [showPermissions, setShowPermissions] = useState(false);
  const [permissionsChecked, setPermissionsChecked] = useState(false);

  // Inicializar listeners de notificaciones
  useNotificationListeners();

  useEffect(() => {
    const checkPerms = async () => {
      if (Capacitor.isNativePlatform()) {
        // En plataforma nativa, verificar si necesitamos solicitar permisos
        const hasPerms = await checkCriticalPermissions();
        if (!hasPerms) {
          setShowPermissions(true);
        }
      }
      setPermissionsChecked(true);
    };
    checkPerms();
  }, []);

  if (!permissionsChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-500 mb-4"></i>
          <p className="text-gray-600 dark:text-gray-300">Iniciando aplicación...</p>
        </div>
      </div>
    );
  }

  return (
    <React.StrictMode>
      <AuthProvider>
        <NotificationsProvider>
          <App />
          {showPermissions && (
            <PermissionsModal
              onClose={() => setShowPermissions(false)}
              onComplete={() => setPermissionsChecked(true)}
            />
          )}
        </NotificationsProvider>
      </AuthProvider>
    </React.StrictMode>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);