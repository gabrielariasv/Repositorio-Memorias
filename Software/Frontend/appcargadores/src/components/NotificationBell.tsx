import React, { useMemo, useState, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationsContext';
import axios from 'axios';
import { useAuth } from '../contexts/useAuth';
import ConfirmCancelModal from './ConfirmCancelModal';
import Toast from './Toast';

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

const NotificationBell: React.FC = () => {
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <>
      <div className="relative">
        <button
          aria-label="Notificaciones"
          onClick={() => setOpen(o => !o)}
          className="relative btn btn-ghost rounded-full p-2"
        >
          <span className="text-xl">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1 min-w-[18px] text-center">
              {unreadCount}
            </span>
          )}
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded-lg shadow-lg bg-white dark:bg-gray-800 z-50">
            <NotificationsPanel onClose={() => setOpen(false)} onShowToast={addToast} />
          </div>
        )}
      </div>

      {/* Renderizar toasts */}
      <div className="fixed bottom-0 right-0 p-6 space-y-3 z-[10000] pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </>
  );
};

export default NotificationBell;

const NotificationsPanel: React.FC<{ 
  onClose?: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}> = ({ onClose, onShowToast }) => {
  const { items, loading, error, markAsRead, markAllAsRead, refresh, deleteNotification } = useNotifications();
  const { token } = useAuth();
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<{ 
    reservationId: string; 
    notifId: string;
    chargerName?: string;
  } | null>(null);

  const actionable = useMemo(() => new Set(['reservation','reservation-reminder','reservation-start']), []);

  /**
   * Effect: Auto-marcar notificaciones como leídas al abrir panel
   * 
   * Proceso:
   * 1. Detectar notificaciones no leídas (read=false)
   * 2. Esperar 500ms para que usuario las vea
   * 3. Marcar cada una como leída vía API
   * 4. Limpiar timer al desmontar componente
   * 
   * Esto mejora UX: reduce contador automáticamente sin requerir acción manual.
   */
  useEffect(() => {
    const unreadNotifications = items.filter(n => !n.read);
    if (unreadNotifications.length > 0) {
      // Delay de 500ms: permite visualización antes de marcar
      const timer = setTimeout(() => {
        unreadNotifications.forEach(n => {
          markAsRead(n._id);
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [items, markAsRead]);

  /**
   * Handler: Aceptar reserva desde notificación
   * 
   * Proceso:
   * 1. Enviar POST a /api/reservations/:id/accept
   * 2. Eliminar notificación del panel (ya procesada)
   * 3. Mostrar toast con nombre del cargador
   * 4. Refrescar lista de notificaciones
   * 
   * Permite a admins confirmar reservas directamente desde campanita.
   */
  const acceptReservation = async (reservationId: string, notifId: string, chargerName?: string) => {
    if (!token) return;
    try {
      // PASO 1: Aceptar reserva en backend
      await axios.post(`${import.meta.env.VITE_API_URL}/api/reservations/${reservationId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // PASO 2: Eliminar notificación procesada
      await deleteNotification(notifId);
      
      // PASO 3: Feedback visual con nombre del cargador
      const message = chargerName 
        ? `Reserva aceptada para el cargador "${chargerName}"`
        : 'Reserva aceptada exitosamente';
      onShowToast(message, 'success');
      
      // PASO 4: Actualizar lista
      refresh();
    } catch (error) {
      console.error('Error al aceptar la reservación:', error);
      onShowToast('Error al aceptar la reserva', 'error');
    }
  };

  const openCancelModal = (reservationId: string, notifId: string, chargerName?: string) => {
    setSelectedNotification({ reservationId, notifId, chargerName });
    setCancelModalOpen(true);
  };

  /**
   * Handler: Cancelar reserva con motivo específico
   * 
   * Proceso:
   * 1. Enviar POST a /api/reservations/:id/cancel con motivo
   * 2. Eliminar notificación del panel
   * 3. Mostrar toast warning con nombre del cargador
   * 4. Cerrar modal de confirmación
   * 5. Limpiar estado y refrescar lista
   * 
   * Motivos válidos: indisponibilidad, mantenimiento, falta_tiempo, otro
   */
  const cancelReservation = async (reason: 'indisponibilidad' | 'mantenimiento' | 'falta_tiempo' | 'otro') => {
    if (!token || !selectedNotification) return;
    try {
      // PASO 1: Enviar cancelación con motivo al backend
      await axios.post(`${import.meta.env.VITE_API_URL}/api/reservations/${selectedNotification.reservationId}/cancel`, 
        { reason }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // PASO 2: Eliminar notificación procesada
      await deleteNotification(selectedNotification.notifId);
      
      // PASO 3: Feedback visual tipo warning
      const message = selectedNotification.chargerName
        ? `Reserva cancelada para el cargador "${selectedNotification.chargerName}"`
        : 'Reserva cancelada exitosamente';
      onShowToast(message, 'warning');
      
      // PASO 4 y 5: Limpiar estado y actualizar
      setCancelModalOpen(false);
      setSelectedNotification(null);
      refresh();
    } catch (error) {
      console.error('Error al cancelar la reservación:', error);
      onShowToast('Error al cancelar la reserva', 'error');
    }
  };

  return (
    <>
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="item-title">Notificaciones</div>
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-xs" onClick={refresh}>Actualizar</button>
            <button className="btn btn-ghost btn-xs" onClick={markAllAsRead}>Marcar todas</button>
          </div>
        </div>
        {loading && <div className="text-secondary">Cargando…</div>}
  {error && <div className="text-danger">{error}</div>}
        <ul className="space-y-2">
          {items.length === 0 && !loading && <li className="text-secondary">Sin notificaciones</li>}
          {items.map(n => {
            const isActionable = n.data && n.data.reservationId && actionable.has(String(n.type));
            const chargerName = n.data?.chargerName;
            return (
              <li key={n._id} className={`p-2 rounded border ${n.read ? 'border-transparent' : 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-900/20'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-2">
                    <div className="text-primary-medium">{n.title}</div>
                    <div className="text-sm text-secondary">{n.message}</div>
                    {chargerName && (
                      <div className="text-accent text-xs">
                        📍 {chargerName}
                      </div>
                    )}
                    <div className="text-xs text-secondary mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                    {isActionable && (
                      <div className="mt-2 flex gap-2">
                        <button
                          className="btn btn-success btn-xs"
                          onClick={() => acceptReservation(n.data.reservationId, n._id, chargerName)}
                        >
                          Aceptar
                        </button>
                        <button
                          className="btn btn-danger btn-xs"
                          onClick={() => openCancelModal(n.data.reservationId, n._id, chargerName)}
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        {onClose && (
          <div className="mt-2 text-right">
            <button className="btn btn-ghost btn-xs" onClick={onClose}>Cerrar</button>
          </div>
        )}
      </div>

      <ConfirmCancelModal
        isOpen={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false);
          setSelectedNotification(null);
        }}
        onConfirm={cancelReservation}
      />
    </>
  );
};
