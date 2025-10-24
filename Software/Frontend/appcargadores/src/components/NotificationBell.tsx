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
          className="relative rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
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

  // Marcar automáticamente como leídas las notificaciones no leídas cuando se abre el panel
  useEffect(() => {
    const unreadNotifications = items.filter(n => !n.read);
    if (unreadNotifications.length > 0) {
      // Marcar como leídas después de un pequeño delay para que el usuario las vea
      const timer = setTimeout(() => {
        unreadNotifications.forEach(n => {
          markAsRead(n._id);
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [items, markAsRead]);

  const acceptReservation = async (reservationId: string, notifId: string, chargerName?: string) => {
    if (!token) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/reservations/${reservationId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Eliminar la notificación después de aceptar
      await deleteNotification(notifId);
      // Mostrar toast con el nombre del cargador
      const message = chargerName 
        ? `Reserva aceptada para el cargador "${chargerName}"`
        : 'Reserva aceptada exitosamente';
      onShowToast(message, 'success');
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

  const cancelReservation = async (reason: 'indisponibilidad' | 'mantenimiento' | 'falta_tiempo' | 'otro') => {
    if (!token || !selectedNotification) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/reservations/${selectedNotification.reservationId}/cancel`, 
        { reason }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Eliminar la notificación después de cancelar
      await deleteNotification(selectedNotification.notifId);
      // Mostrar toast con el nombre del cargador
      const message = selectedNotification.chargerName
        ? `Reserva cancelada para el cargador "${selectedNotification.chargerName}"`
        : 'Reserva cancelada exitosamente';
      onShowToast(message, 'warning');
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
          <div className="font-semibold text-gray-800 dark:text-gray-100">Notificaciones</div>
          <div className="flex gap-2">
            <button className="text-sm px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" onClick={refresh}>Actualizar</button>
            <button className="text-sm px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" onClick={markAllAsRead}>Marcar todas</button>
          </div>
        </div>
        {loading && <div className="text-sm text-gray-500 dark:text-gray-400">Cargando…</div>}
        {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
        <ul className="space-y-2">
          {items.length === 0 && !loading && <li className="text-sm text-gray-500 dark:text-gray-400">Sin notificaciones</li>}
          {items.map(n => {
            const isActionable = n.data && n.data.reservationId && actionable.has(String(n.type));
            const chargerName = n.data?.chargerName;
            return (
              <li key={n._id} className={`p-2 rounded border ${n.read ? 'border-transparent' : 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-900/20'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-2">
                    <div className="font-medium text-gray-800 dark:text-gray-100">{n.title}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{n.message}</div>
                    {chargerName && (
                      <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                        📍 {chargerName}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                    {isActionable && (
                      <div className="mt-2 flex gap-2">
                        <button
                          className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700"
                          onClick={() => acceptReservation(n.data.reservationId, n._id, chargerName)}
                        >
                          Aceptar
                        </button>
                        <button
                          className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
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
            <button className="text-sm px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" onClick={onClose}>Cerrar</button>
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
