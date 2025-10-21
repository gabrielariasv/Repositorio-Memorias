import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Hook para inicializar listeners de notificaciones en la app
 */
export const useNotificationListeners = () => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Listeners para notificaciones push
    PushNotifications.addListener('registration', (token) => {
      console.log('Push notification token:', token.value);
      // Aquí podrías enviar el token al backend para guardar en el perfil del usuario
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error en registro de push notifications:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification recibida:', notification);
      // Cuando llega una notificación mientras la app está abierta
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push notification action:', notification);
      // Cuando el usuario toca una notificación
    });

    // Listeners para notificaciones locales
    LocalNotifications.addListener('localNotificationReceived', (notification) => {
      console.log('Notificación local recibida:', notification);
    });

    LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      console.log('Acción en notificación local:', action);
    });

    return () => {
      // Cleanup listeners
      PushNotifications.removeAllListeners();
      LocalNotifications.removeAllListeners();
    };
  }, []);
};

export default useNotificationListeners;
