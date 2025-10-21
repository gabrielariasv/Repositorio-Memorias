import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';

export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unknown';

/**
 * Solicitar permisos de ubicación
 */
export async function requestLocationPermission(): Promise<PermissionStatus> {
  if (!Capacitor.isNativePlatform()) {
    // En web, usar la API estándar del navegador
    if (navigator.geolocation) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        return result.state as PermissionStatus;
      } catch {
        return 'prompt';
      }
    }
    return 'denied';
  }

  try {
    // En plataformas nativas (Android/iOS)
    const permission = await Geolocation.checkPermissions();
    
    if (permission.location === 'granted' || permission.coarseLocation === 'granted') {
      return 'granted';
    }

    if (permission.location === 'denied' || permission.coarseLocation === 'denied') {
      return 'denied';
    }

    // Si no está ni granted ni denied, solicitar
    const requested = await Geolocation.requestPermissions();
    
    if (requested.location === 'granted' || requested.coarseLocation === 'granted') {
      return 'granted';
    }

    return 'denied';
  } catch (error) {
    console.error('Error solicitando permiso de ubicación:', error);
    return 'denied';
  }
}

/**
 * Obtener ubicación actual
 */
export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const hasPermission = await requestLocationPermission();
    
    if (hasPermission !== 'granted') {
      console.warn('Permiso de ubicación no concedido');
      return null;
    }

    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    };
  } catch (error) {
    console.error('Error obteniendo ubicación:', error);
    return null;
  }
}

/**
 * Solicitar permisos de notificaciones locales
 */
export async function requestLocalNotificationPermission(): Promise<PermissionStatus> {
  if (!Capacitor.isNativePlatform()) {
    // En web, usar Notification API
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        return 'granted';
      }
      if (Notification.permission === 'denied') {
        return 'denied';
      }
      const permission = await Notification.requestPermission();
      return permission as PermissionStatus;
    }
    return 'denied';
  }

  try {
    const permission = await LocalNotifications.checkPermissions();
    
    if (permission.display === 'granted') {
      return 'granted';
    }

    if (permission.display === 'denied') {
      return 'denied';
    }

    const requested = await LocalNotifications.requestPermissions();
    return requested.display === 'granted' ? 'granted' : 'denied';
  } catch (error) {
    console.error('Error solicitando permiso de notificaciones locales:', error);
    return 'denied';
  }
}

/**
 * Solicitar permisos de notificaciones push
 */
export async function requestPushNotificationPermission(): Promise<PermissionStatus> {
  if (!Capacitor.isNativePlatform()) {
    // En web, las push notifications requieren service worker
    return await requestLocalNotificationPermission();
  }

  try {
    const permission = await PushNotifications.checkPermissions();
    
    if (permission.receive === 'granted') {
      return 'granted';
    }

    if (permission.receive === 'denied') {
      return 'denied';
    }

    const requested = await PushNotifications.requestPermissions();
    
    if (requested.receive === 'granted') {
      // Registrar para recibir notificaciones
      await PushNotifications.register();
      return 'granted';
    }

    return 'denied';
  } catch (error) {
    console.error('Error solicitando permiso de notificaciones push:', error);
    return 'denied';
  }
}

/**
 * Programar una notificación local
 */
export async function scheduleLocalNotification(options: {
  title: string;
  body: string;
  id: number;
  scheduleAt?: Date;
  extra?: any;
}) {
  if (!Capacitor.isNativePlatform()) {
    // En web, usar Notification API si está disponible
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(options.title, {
        body: options.body,
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: String(options.id),
        data: options.extra
      });
    }
    return;
  }

  try {
    const hasPermission = await requestLocalNotificationPermission();
    
    if (hasPermission !== 'granted') {
      console.warn('Permiso de notificaciones no concedido');
      return;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          title: options.title,
          body: options.body,
          id: options.id,
          schedule: options.scheduleAt ? { at: options.scheduleAt } : undefined,
          extra: options.extra,
          sound: 'default',
          smallIcon: 'ic_launcher',
          largeIcon: 'ic_launcher'
        }
      ]
    });
  } catch (error) {
    console.error('Error programando notificación:', error);
  }
}

/**
 * Cancelar notificación local programada
 */
export async function cancelLocalNotification(id: number) {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch (error) {
    console.error('Error cancelando notificación:', error);
  }
}

/**
 * Solicitar todos los permisos necesarios para la app
 */
export async function requestAllPermissions(): Promise<{
  location: PermissionStatus;
  notifications: PermissionStatus;
  pushNotifications: PermissionStatus;
}> {
  const [location, notifications, pushNotifications] = await Promise.all([
    requestLocationPermission(),
    requestLocalNotificationPermission(),
    requestPushNotificationPermission()
  ]);

  return {
    location,
    notifications,
    pushNotifications
  };
}

/**
 * Verificar si todos los permisos críticos están concedidos
 */
export async function checkCriticalPermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return true; // En web no requerimos permisos críticos
  }

  try {
    const locationPerm = await Geolocation.checkPermissions();
    const notifPerm = await LocalNotifications.checkPermissions();

    const hasLocation = locationPerm.location === 'granted' || locationPerm.coarseLocation === 'granted';
    const hasNotifications = notifPerm.display === 'granted';

    return hasLocation && hasNotifications;
  } catch {
    return false;
  }
}
