import React, { useMemo, useState } from 'react';
import { useNotifications } from '../contexts/NotificationsContext';
import axios from 'axios';
import { useAuth } from '../contexts/useAuth';

const NotificationBell: React.FC = () => {
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
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
          <NotificationsPanel onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

const NotificationsPanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { items, loading, error, markAsRead, markAllAsRead, refresh } = useNotifications();
  const { token } = useAuth();
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<'indisponibilidad'|'mantenimiento'|'falta_tiempo'|'otro'>('indisponibilidad');

  const actionable = useMemo(() => new Set(['reservation','reservation-reminder','reservation-start']), []);

  const acceptReservation = async (reservationId: string, notifId: string) => {
    if (!token) return;
    await axios.post(`${import.meta.env.VITE_API_URL}/api/reservations/${reservationId}/accept`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    await markAsRead(notifId);
    refresh();
  };

  const cancelReservation = async (reservationId: string, notifId: string) => {
    if (!token) return;
    await axios.post(`${import.meta.env.VITE_API_URL}/api/reservations/${reservationId}/cancel`, { reason: cancelReason }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setCancelingId(null);
    await markAsRead(notifId);
    refresh();
  };
  return (
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
          return (
            <li key={n._id} className={`p-2 rounded border ${n.read ? 'border-transparent' : 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-900/20'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-2">
                  <div className="font-medium text-gray-800 dark:text-gray-100">{n.title}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">{n.message}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                  {isActionable && cancelingId !== n._id && (
                    <div className="mt-2 flex gap-2">
                      <button
                        className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700"
                        onClick={() => acceptReservation(n.data.reservationId, n._id)}
                      >
                        Aceptar
                      </button>
                      <button
                        className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                        onClick={() => setCancelingId(n._id)}
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                  {isActionable && cancelingId === n._id && (
                    <div className="mt-2 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <div className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">¿Seguro que deseas cancelar?</div>
                      <div className="flex items-center gap-2">
                        <select
                          className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-2 py-1 text-gray-800 dark:text-gray-100"
                          value={cancelReason}
                          onChange={e => setCancelReason(e.target.value as any)}
                        >
                          <option value="indisponibilidad">Indisponibilidad</option>
                          <option value="mantenimiento">En mantenimiento</option>
                          <option value="falta_tiempo">Falta de tiempo</option>
                          <option value="otro">Otro motivo</option>
                        </select>
                        <button
                          className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100"
                          onClick={() => setCancelingId(null)}
                        >
                          Volver
                        </button>
                        <button
                          className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                          onClick={() => cancelReservation(n.data.reservationId, n._id)}
                        >
                          Confirmar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {!n.read && (
                  <button className="text-xs px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => markAsRead(n._id)}>
                    Marcar leído
                  </button>
                )}
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
  );
};
