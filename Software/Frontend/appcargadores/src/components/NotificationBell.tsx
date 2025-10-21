import React, { useState } from 'react';
import { useNotifications } from '../contexts/NotificationsContext';

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
        {items.map(n => (
          <li key={n._id} className={`p-2 rounded border ${n.read ? 'border-transparent' : 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-900/20'}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-gray-800 dark:text-gray-100">{n.title}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{n.message}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
              {!n.read && (
                <button className="text-xs px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => markAsRead(n._id)}>
                  Marcar leído
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {onClose && (
        <div className="mt-2 text-right">
          <button className="text-sm px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" onClick={onClose}>Cerrar</button>
        </div>
      )}
    </div>
  );
};
