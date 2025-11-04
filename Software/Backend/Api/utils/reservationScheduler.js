/**
 * Scheduler de recordatorios de reservas
 * Envía notificaciones automáticas a usuarios y propietarios de estaciones
 * sobre reservas próximas a iniciar
 */

const Reservation = require('../models/Reservation');
const Charger = require('../models/Charger');
const Notification = require('../models/Notification');
const { emitToUser } = require('./socket');

/**
 * Enviar recordatorio de reserva a usuario y propietario de estación
 * @param {Reservation} res - Objeto de reserva
 * @param {string} kind - Tipo de recordatorio: 'reminder10' (10 min antes) o 'start' (al inicio)
 */
async function sendReminder(res, kind) {
  try {
    // PASO 1: Obtener información del cargador
    const charger = await Charger.findById(res.chargerId).select('ownerId name');
    const chargerName = charger?.name || 'Cargador';

    // PASO 2: Notificar al usuario que hizo la reserva
    const notifUser = await Notification.create({
      user: res.userId,
      title: kind === 'reminder10' ? 'Tu carga comienza pronto' : 'Tu carga está comenzando',
      message: kind === 'reminder10'
        ? 'Faltan ~10 minutos para tu reserva. ¿Deseas confirmar o cancelar?'
        : 'Tu reserva está empezando ahora. ¿Deseas confirmar o cancelar? ',
      type: 'reservation',
      data: { 
        reservationId: res._id, 
        kind, 
        actions: ['accept', 'cancel'],
        chargerName: chargerName,
        chargerId: res.chargerId
      }
    });
    
    // Enviar notificación en tiempo real
    try { emitToUser(String(res.userId), 'notification', notifUser); } catch (_) {}

    // PASO 3: Notificar al propietario de la estación
    if (charger?.ownerId) {
      const notifOwner = await Notification.create({
        user: charger.ownerId,
        title: kind === 'reminder10' ? 'Reserva próxima en tu cargador' : 'La reserva está comenzando ahora',
        message: kind === 'reminder10'
          ? `Faltan ~10 minutos para una reserva en ${chargerName}`
          : `Está comenzando una reserva en ${chargerName}`,
        type: 'reservation',
        data: { 
          reservationId: res._id, 
          kind, 
          actions: ['accept', 'cancel'],
          chargerName: chargerName,
          chargerId: res.chargerId
        }
      });
      try { emitToUser(String(charger.ownerId), 'notification', notifOwner); } catch (_) {}
    }
  } catch (err) {
    console.error('Error enviando recordatorio de reserva:', err);
  }
}

/**
 * Función principal del scheduler
 * Se ejecuta periódicamente para verificar y enviar recordatorios
 */
async function tick() {
  const now = new Date();
  const tenMinLater = new Date(now.getTime() + 10 * 60 * 1000);  // +10 minutos
  const tenMinLaterWindow = new Date(now.getTime() + 11 * 60 * 1000); // +11 minutos (ventana)
  const oneMinLater = new Date(now.getTime() + 60 * 1000); // +1 minuto

  try {
    // PASO 1: Buscar reservas que empiezan en ~10 minutos (aún no notificadas)
    const soon = await Reservation.find({
      status: 'upcoming',
      preNotified: { $ne: true }, // No se ha enviado recordatorio previo
      startTime: { $gte: tenMinLater, $lt: tenMinLaterWindow }
    }).limit(100);

    // Enviar recordatorio de 10 minutos y marcar como notificadas
    for (const res of soon) {
      await sendReminder(res, 'reminder10');
      res.preNotified = true;
      await res.save();
    }

    // PASO 2: Buscar reservas que están empezando ahora (ventana de ±1 minuto)
    const starting = await Reservation.find({
      status: 'upcoming',
      startNotified: { $ne: true }, // No se ha enviado notificación de inicio
      startTime: { 
        $lte: oneMinLater, 
        $gte: new Date(now.getTime() - 60 * 1000) 
      }
    }).limit(100);

    // Enviar recordatorio de inicio y marcar como notificadas
    for (const res of starting) {
      await sendReminder(res, 'start');
      res.startNotified = true;
      await res.save();
    }
  } catch (err) {
    console.error('Error en scheduler de reservas:', err);
  }
}

/**
 * Iniciar el scheduler de recordatorios de reservas
 * Se ejecuta cada 60 segundos para verificar reservas próximas
 */
function startReservationScheduler() {
  // Ejecutar cada 60 segundos
  setInterval(tick, 60 * 1000);
  
  // Ejecutar tick inicial después de 5 segundos
  setTimeout(tick, 5000);
}

module.exports = { startReservationScheduler };
