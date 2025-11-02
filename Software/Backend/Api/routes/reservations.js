const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const Charger = require('../models/Charger');
const Vehicle = require('../models/Vehicle');
const Notification = require('../models/Notification');
const calcularDistancia = require('../utils/calcularDistancia');
const { emitToUser } = require('../utils/socket');
const { authenticateToken } = require('./auth');

// POST /api/reservations - Crear una nueva reserva
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { vehicleId, chargerId, startTime, endTime } = req.body;
    if (!vehicleId || !chargerId || !startTime || !endTime) {
      return res.status(400).json({ error: 'Faltan campos obligatorios (vehicleId, chargerId, startTime, endTime)' });
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({ error: 'Fechas inválidas' });
    }

    // Verificar conflicto por la estación
    const chargerConflict = await Reservation.findOne({
      chargerId,
      status: { $in: ['upcoming', 'active'] },
      $or: [
        { startTime: { $lt: end }, calculatedEndTime: { $gt: start } },
        { startTime: { $lt: end }, endTime: { $gt: start } }
      ]
    });
    if (chargerConflict) {
      return res.status(409).json({ error: 'La estación ya está reservada en ese intervalo' });
    }

    // Verificar conflicto por el mismo vehículo
    const vehicleConflict = await Reservation.findOne({
      vehicleId,
      status: { $in: ['upcoming', 'active'] },
      $or: [
        { startTime: { $lt: end }, calculatedEndTime: { $gt: start } },
        { startTime: { $lt: end }, endTime: { $gt: start } }
      ]
    });
    if (vehicleConflict) {
      return res.status(409).json({ error: 'El vehículo ya tiene una reserva en ese intervalo' });
    }

    // Crear reserva
    const reservation = new Reservation({
      vehicleId,
      chargerId,
      userId,
      startTime: start,
      endTime: end,
      calculatedEndTime: end,
      status: 'upcoming'
    });
    await reservation.save();

    res.status(201).json({ message: 'Reserva creada', reservation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reservations - Obtener reservas del usuario actual
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const reservations = await Reservation.find({ userId })
      .populate('vehicleId chargerId')
      .sort({ startTime: -1 });

    res.json(reservations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/reservations/:id - Cancelar una reserva
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const reservation = await Reservation.findOne({ _id: id, userId });

    if (!reservation) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    if (reservation.status === 'completed' || reservation.status === 'cancelled') {
      return res.status(400).json({ error: 'Esta reserva no se puede cancelar' });
    }

    reservation.status = 'cancelled';
    await reservation.save();

    res.json({ message: 'Reserva cancelada exitosamente', reservation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper: Actualizar estados de reservas basándose en la hora actual
router.post('/update-statuses', async (req, res) => {
  try {
    const now = new Date();

    // Actualizar reservas que deberían estar activas
    await Reservation.updateMany(
      {
        status: 'upcoming',
        startTime: { $lte: now },
        endTime: { $gt: now }
      },
      { $set: { status: 'active' } }
    );

    // Actualizar reservas que deberían estar completadas
    await Reservation.updateMany(
      {
        status: { $in: ['upcoming', 'active'] },
        endTime: { $lte: now }
      },
      { $set: { status: 'completed' } }
    );

    res.json({ message: 'Estados de reservas actualizados' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/reservations/:id/accept - Aceptar una reserva (usuario o dueño de estación)
router.post('/:id/accept', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user.userId;

    const reservation = await Reservation.findById(id);
    if (!reservation) return res.status(404).json({ error: 'Reserva no encontrada' });

    const charger = await Charger.findById(reservation.chargerId).select('ownerId name');
    const isOwner = charger && String(charger.ownerId) === String(requesterId);
    const isUser = String(reservation.userId) === String(requesterId);
    const isAdmin = req.user.role === 'app_admin';
    if (!isOwner && !isUser && !isAdmin) {
      return res.status(403).json({ error: 'No autorizado para aceptar esta reserva' });
    }

    if (reservation.status === 'cancelled' || reservation.status === 'completed') {
      return res.status(400).json({ error: 'La reserva ya no es válida para aceptar' });
    }

    reservation.acceptanceStatus = 'accepted';
    await reservation.save();

    // Notificar a ambas partes
    const messages = {
      user: `Tu reserva ha sido aceptada${isOwner ? ' por el dueño de la estación' : ''}.`,
      owner: `La reserva fue aceptada${isUser ? ' por el usuario' : ''}.`
    };
    try {
      const notifUser = await Notification.create({
        user: reservation.userId,
        title: 'Reserva aceptada',
        message: messages.user,
        type: 'success',
        data: {
          reservationId: reservation._id,
          chargerName: charger?.name || 'Cargador',
          chargerId: reservation.chargerId
        }
      });
      emitToUser(String(reservation.userId), 'notification', notifUser);
      if (charger?.ownerId) {
        const notifOwner = await Notification.create({
          user: charger.ownerId,
          title: 'Reserva aceptada',
          message: messages.owner,
          type: 'success',
          data: {
            reservationId: reservation._id,
            chargerName: charger?.name || 'Cargador',
            chargerId: reservation.chargerId
          }
        });
        emitToUser(String(charger.ownerId), 'notification', notifOwner);
      }
    } catch (_) { }

    res.json({ message: 'Reserva aceptada', reservation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/reservations/:id/cancel - Cancelar con motivo (usuario o dueño de estación)
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const requesterId = req.user.userId;
    const ALLOWED = ['indisponibilidad', 'mantenimiento', 'falta_tiempo', 'otro'];
    if (!ALLOWED.includes(String(reason))) {
      return res.status(400).json({ error: 'Motivo inválido' });
    }

    const reservation = await Reservation.findById(id);
    if (!reservation) return res.status(404).json({ error: 'Reserva no encontrada' });
    if (reservation.status === 'cancelled' || reservation.status === 'completed') {
      return res.status(400).json({ error: 'La reserva ya no se puede cancelar' });
    }

    const charger = await Charger.findById(reservation.chargerId).select('ownerId name');
    const isOwner = charger && String(charger.ownerId) === String(requesterId);
    const isUser = String(reservation.userId) === String(requesterId);
    const isAdmin = req.user.role === 'app_admin';
    if (!isOwner && !isUser && !isAdmin) {
      return res.status(403).json({ error: 'No autorizado para cancelar esta reserva' });
    }

    reservation.status = 'cancelled';
    reservation.cancellationReason = reason;
    reservation.cancelledBy = isOwner ? 'owner' : isUser ? 'user' : 'system';
    await reservation.save();

    // Notificar a ambas partes con el motivo
    const reasonText = {
      indisponibilidad: 'Indisponibilidad',
      mantenimiento: 'En mantenimiento',
      falta_tiempo: 'Falta de tiempo',
      otro: 'Otro motivo'
    }[reason];
    const baseMsg = `Reserva cancelada. Motivo: ${reasonText}`;
    try {
      const notifUser = await Notification.create({
        user: reservation.userId,
        title: 'Reserva cancelada',
        message: baseMsg,
        type: 'warning',
        data: {
          reservationId: reservation._id,
          reason,
          chargerName: charger?.name || 'Cargador',
          chargerId: reservation.chargerId
        }
      });
      emitToUser(String(reservation.userId), 'notification', notifUser);
      if (charger?.ownerId) {
        const notifOwner = await Notification.create({
          user: charger.ownerId,
          title: 'Reserva cancelada',
          message: baseMsg,
          type: 'warning',
          data: {
            reservationId: reservation._id,
            reason,
            chargerName: charger?.name || 'Cargador',
            chargerId: reservation.chargerId
          }
        });
        emitToUser(String(charger.ownerId), 'notification', notifOwner);
      }
    } catch (_) { }

    res.json({ message: 'Reserva cancelada', reservation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
