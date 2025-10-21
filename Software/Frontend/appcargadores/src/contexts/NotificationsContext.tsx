import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from './useAuth';
import { io, Socket } from 'socket.io-client';

export type NotificationItem = {
  _id: string;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'success' | 'error' | string;
  data?: any;
  read: boolean;
  createdAt: string;
};

type NotificationsContextType = {
  items: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/notifications`);
      setItems(res.data || []);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Error al obtener notificaciones');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const markAsRead = async (id: string) => {
    if (!token) return;
    await axios.post(`${import.meta.env.VITE_API_URL}/api/notifications/${id}/read`);
    setItems(prev => prev.map(n => (n._id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = async () => {
    if (!token) return;
    await axios.post(`${import.meta.env.VITE_API_URL}/api/notifications/read-all`);
    setItems(prev => prev.map(n => ({ ...n, read: true })));
  };

  useEffect(() => {
    if (token && user) {
      // initial fetch
      refresh();

      // setup socket
      const socket: Socket = io(import.meta.env.VITE_API_URL, {
        transports: ['websocket'],
      });
      socket.on('connect', () => {
        socket.emit('auth', token);
      });
      socket.on('auth_ok', () => {
        // ok
      });
      socket.on('notification', (notif: NotificationItem) => {
        setItems(prev => [notif, ...prev]);
      });

      return () => {
        socket.disconnect();
      };
    } else {
      setItems([]);
    }
  }, [token, user, refresh]);

  const unreadCount = items.filter(n => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ items, unreadCount, loading, error, refresh, markAsRead, markAllAsRead }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications debe usarse dentro de NotificationsProvider');
  return ctx;
};
