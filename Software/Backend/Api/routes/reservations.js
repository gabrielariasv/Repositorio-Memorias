const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const Charger = require('../models/Charger');
const Vehicle = require('../models/Vehicle');
const { authenticateToken } = require('./auth');

// POST /api/reservations - Crear una nueva reserva
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { vehicleId, chargerId, startTime, endTime } = req.body;
    const userId = req.user.userId;

    // Validaciones básicas
    if (!vehicleId || !chargerId || !startTime || !endTime) {
      return res.status(400).json({ error: 'vehicleId, chargerId, startTime y endTime son requeridos' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Fechas inválidas' });
    }

    if (start >= end) {
      return res.status(400).json({ error: 'La fecha de inicio debe ser anterior a la fecha de fin' });
    }

    if (start < new Date()) {
      return res.status(400).json({ error: 'No se puede reservar en el pasado' });
    }

    // Verificar que el vehículo exista y pertenezca al usuario
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }

    // Verificar que el cargador exista
    const charger = await Charger.findById(chargerId);
    if (!charger) {
      return res.status(404).json({ error: 'Cargador no encontrado' });
    }

    // Verificar disponibilidad del cargador en ese rango de tiempo
    const conflictingReservations = await Reservation.find({
      chargerId: chargerId,
      status: { $in: ['upcoming', 'active'] },
      $or: [
        // La nueva reserva comienza durante una reserva existente
        { startTime: { $lte: start }, endTime: { $gt: start } },
        // La nueva reserva termina durante una reserva existente
        { startTime: { $lt: end }, endTime: { $gte: end } },
        // La nueva reserva engloba completamente una reserva existente
        { startTime: { $gte: start }, endTime: { $lte: end } }
      ]
    });

    if (conflictingReservations.length > 0) {
      return res.status(409).json({ 
        error: 'El cargador ya está reservado en ese horario',
        conflicts: conflictingReservations 
      });
    }

    // Crear la reserva
    const reservation = new Reservation({
      vehicleId,
      chargerId,
      userId,
      startTime: start,
      endTime: end,
      status: 'upcoming',
      estimatedChargeTime: (end - start) / (1000 * 60), // en minutos
      bufferTime: 0
    });

    await reservation.save();

    // Poblar para devolver datos completos
    await reservation.populate('vehicleId chargerId userId');

    res.status(201).json(reservation);
  } catch (error) {
    console.error('Error creating reservation:', error);
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

module.exports = router;
