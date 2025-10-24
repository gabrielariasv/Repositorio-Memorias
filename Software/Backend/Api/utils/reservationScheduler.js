const Reservation = require('../models/Reservation');
const Charger = require('../models/Charger');
const Notification = require('../models/Notification');
const { emitToUser } = require('./socket');

async function sendReminder(res, kind) {
  try {
    // Get charger info first
    const charger = await Charger.findById(res.chargerId).select('ownerId name');
    const chargerName = charger?.name || 'Cargador';

    // Notify reservation owner (vehicle user)
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
    try { emitToUser(String(res.userId), 'notification', notifUser); } catch (_) {}

    // Notify station owner
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

async function tick() {
  const now = new Date();
  const tenMinLater = new Date(now.getTime() + 10 * 60 * 1000);
  const tenMinLaterWindow = new Date(now.getTime() + 11 * 60 * 1000);
  const oneMinLater = new Date(now.getTime() + 60 * 1000);

  try {
    // 10-min reminders for upcoming, not yet sent
    const soon = await Reservation.find({
      status: 'upcoming',
      preNotified: { $ne: true },
      startTime: { $gte: tenMinLater, $lt: tenMinLaterWindow }
    }).limit(100);

    for (const res of soon) {
      await sendReminder(res, 'reminder10');
      res.preNotified = true;
      await res.save();
    }

    // Start-time reminders (now window) for upcoming, not yet startNotified
    const starting = await Reservation.find({
      status: 'upcoming',
      startNotified: { $ne: true },
      startTime: { $lte: oneMinLater, $gte: new Date(now.getTime() - 60 * 1000) }
    }).limit(100);

    for (const res of starting) {
      await sendReminder(res, 'start');
      res.startNotified = true;
      await res.save();
    }
  } catch (err) {
    console.error('Error en scheduler de reservas:', err);
  }
}

function startReservationScheduler() {
  // run every 60s
  setInterval(tick, 60 * 1000);
  // also initial tick after small delay
  setTimeout(tick, 5000);
}

module.exports = { startReservationScheduler };
