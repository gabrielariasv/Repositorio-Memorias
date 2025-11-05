import React, { useState } from 'react';
import { requestAllPermissions, PermissionStatus } from '../utils/permissions';
import { Capacitor } from '@capacitor/core';

interface PermissionsModalProps {
  onClose: () => void;
  onComplete: () => void;
}

// Modal para solicitar permisos necesarios de la app (ubicación, notificaciones)
const PermissionsModal: React.FC<PermissionsModalProps> = ({ onClose, onComplete }) => {
  const [permissions, setPermissions] = useState<{
    location: PermissionStatus;
    notifications: PermissionStatus;
    pushNotifications: PermissionStatus;
  } | null>(null);
  const [requesting, setRequesting] = useState(false);

  const isNative = Capacitor.isNativePlatform();

  const handleRequestPermissions = async () => {
    setRequesting(true);
    try {
      const result = await requestAllPermissions();
      setPermissions(result);

      // Si todos los permisos críticos están concedidos, cerrar automáticamente
      if (result.location === 'granted' && result.notifications === 'granted') {
        setTimeout(() => {
          onComplete();
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error('Error solicitando permisos:', error);
    } finally {
      setRequesting(false);
    }
  };

  const getStatusIcon = (status: PermissionStatus) => {
    switch (status) {
      case 'granted':
        return <i className="fas fa-check-circle text-green-500 text-2xl"></i>;
      case 'denied':
        return <i className="fas fa-times-circle text-red-500 text-2xl"></i>;
      case 'prompt':
        return <i className="fas fa-question-circle text-yellow-500 text-2xl"></i>;
      default:
        return <i className="fas fa-circle text-gray-400 text-2xl"></i>;
    }
  };

  const getStatusText = (status: PermissionStatus) => {
    switch (status) {
      case 'granted':
        return 'Concedido';
      case 'denied':
        return 'Denegado';
      case 'prompt':
        return 'Pendiente';
      default:
        return 'Desconocido';
    }
  };

  const allGranted = permissions?.location === 'granted' && permissions?.notifications === 'granted';

  return (
    <div className="modal" onClick={onClose}>
      <div className="relative w-full max-w-md modal__panel" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
            <i className="icon-xl-blue fas fa-shield-alt"></i>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Permisos de la aplicación
            </h3>
            <p className="text-sm text-secondary">
              {isNative ? 'Necesarios para funcionar correctamente' : 'Opcionales para mejorar la experiencia'}
            </p>
          </div>
        </div>

  <div className="surface p-4 mb-6 space-y-4 rounded-xl">
          {/* Ubicación */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <i className="fas fa-map-marker-alt text-blue-500 text-xl"></i>
              <div>
                <div className="text-primary-medium">Ubicación</div>
                <div className="text-xs text-secondary">
                  Para encontrar cargadores cercanos
                </div>
              </div>
            </div>
            {permissions && (
              <div className="flex flex-col items-end gap-1">
                {getStatusIcon(permissions.location)}
                <span className="text-xs font-medium text-secondary">
                  {getStatusText(permissions.location)}
                </span>
              </div>
            )}
          </div>

          {/* Notificaciones */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <i className="fas fa-bell text-yellow-500 text-xl"></i>
              <div>
                <div className="text-primary-medium">Notificaciones</div>
                <div className="text-xs text-secondary">
                  Para recordatorios de reservas
                </div>
              </div>
            </div>
            {permissions && (
              <div className="flex flex-col items-end gap-1">
                {getStatusIcon(permissions.notifications)}
                <span className="text-xs font-medium text-secondary">
                  {getStatusText(permissions.notifications)}
                </span>
              </div>
            )}
          </div>

          {isNative && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
              <i className="fas fa-mobile-alt text-purple-500 text-xl"></i>
              <div>
                <div className="text-primary-medium">Notificaciones Push</div>
                <div className="text-xs text-secondary">
                    Para alertas en tiempo real
                  </div>
                </div>
              </div>
              {permissions && (
                <div className="flex flex-col items-end gap-1">
                  {getStatusIcon(permissions.pushNotifications)}
                  <span className="text-xs font-medium text-secondary">
                    {getStatusText(permissions.pushNotifications)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {permissions && permissions.location === 'denied' && (
          <div className="alert alert-error mb-4">
            <div className="flex items-start gap-2">
              <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400 mt-0.5"></i>
              <div className="text-sm text-red-700 dark:text-red-300">
                <strong>Permiso denegado:</strong> Para habilitar los permisos, ve a Configuración → Aplicaciones → CargadoresApp → Permisos
              </div>
            </div>
          </div>
        )}

        {allGranted && (
          <div className="alert mb-4">
            <div className="flex items-center gap-2">
              <i className="fas fa-check-circle text-green-600 dark:text-green-400"></i>
              <div className="text-sm text-green-700 dark:text-green-300">
                <strong>¡Listo!</strong> Todos los permisos necesarios han sido concedidos.
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          {!allGranted && (
            <button
              onClick={handleRequestPermissions}
              disabled={requesting}
              className="btn btn-primary btn-block flex items-center justify-center gap-2"
            >
              {requesting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Solicitando permisos...
                </>
              ) : (
                <>
                  <i className="fas fa-shield-check"></i>
                  Solicitar permisos
                </>
              )}
            </button>
          )}
          <button
            onClick={() => {
              onComplete();
              onClose();
            }}
            className={`btn btn-outline ${allGranted ? 'btn-block' : ''} flex items-center justify-center gap-2`}
          >
            {allGranted ? (
              <>
                <i className="fas fa-check"></i>
                Continuar
              </>
            ) : (
              <>
                <i className="fas fa-times"></i>
                {isNative ? 'Omitir' : 'Cerrar'}
              </>
            )}
          </button>
        </div>

        {!isNative && (
          <div className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
            <i className="fas fa-info-circle mr-1"></i>
            Estás usando la versión web. Algunos permisos son opcionales.
          </div>
        )}
      </div>
    </div>
  );
};

export default PermissionsModal;
