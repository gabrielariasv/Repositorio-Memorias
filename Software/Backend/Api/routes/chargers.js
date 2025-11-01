const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const Charger = require('../models/Charger');
const ChargingSession = require('../models/ChargingSession');
const User = require('../models/User');

const calcularDistancia = require('../utils/calcularDistancia');
const Reservation = require('../models/Reservation');
const { authenticateToken } = require('./auth');

// Obtener todos los cargadores
router.get('/', async (req, res) => {
  try {
    const { status, chargerType } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (chargerType) filter.chargerType = chargerType;

    const chargers = await Charger.find(filter)
      .populate('ownerId', 'name email')
      .populate('reservations');

    // Calcular estado en tiempo real basándose en reservas activas
    const now = new Date();
    const chargersWithRealTimeStatus = await Promise.all(chargers.map(async (charger) => {
      // Buscar si hay una reserva activa en este momento (usar calculatedEndTime)
      const activeReservation = await Reservation.findOne({
        chargerId: charger._id,
        startTime: { $lte: now },
        status: { $in: ['active', 'upcoming'] },
        calculatedEndTime: { $gt: now }
      });

      // Si hay una reserva activa, marcar como ocupado
      const realTimeStatus = activeReservation ? 'occupied' : charger.status;

      return {
        ...charger.toObject(),
        status: realTimeStatus,
        hasActiveReservation: !!activeReservation
      };
    }));

    res.json(chargersWithRealTimeStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear un nuevo cargador
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      chargerType,
      powerOutput,
      status = 'available',
      location,
      ownerId: requestedOwnerId
    } = req.body;

    if (!name || !chargerType || !powerOutput || !location?.coordinates || location.coordinates.length !== 2) {
      return res.status(400).json({ error: 'Datos del cargador incompletos' });
    }

    const ownerId = requestedOwnerId || req.user.userId;

    if (!ownerId) {
      return res.status(400).json({ error: 'Se requiere un propietario para el cargador' });
    }

    if (req.user.role !== 'app_admin' && ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'No tienes permiso para crear cargadores para este usuario' });
    }

    const owner = await User.findById(ownerId);
    if (!owner) {
      return res.status(404).json({ error: 'Propietario no encontrado' });
    }

    const charger = await Charger.create({
      name: name.trim(),
      chargerType,
      powerOutput,
      status,
      location,
      ownerId
    });

    if (!owner.ownedStations.includes(charger._id)) {
      owner.ownedStations.push(charger._id);
      await owner.save();
    }

    res.status(201).json(charger);
  } catch (error) {
    console.error('Error al crear cargador:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener cargadores cercanos a una ubicación
router.get('/nearby', async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 5000 } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({ error: 'Se requieren longitud y latitud' });
    }

    const chargers = await Charger.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      },
      status: 'available'
    });

    res.json(chargers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// (Mover esta ruta al final del archivo para evitar conflictos con rutas específicas como /recommendation y /nearby)

// Actualizar nombre de un cargador
router.patch('/:id/name', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const trimmedName = name.trim();

    const charger = await Charger.findById(req.params.id);

    if (!charger) {
      return res.status(404).json({ error: 'Cargador no encontrado' });
    }

    // Validar que el usuario sea dueño del cargador o admin general
    if (req.user.role !== 'app_admin' && charger.ownerId?.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este cargador' });
    }

    charger.name = trimmedName;
    await charger.save();

    res.json({
      message: 'Nombre del cargador actualizado correctamente',
      charger
    });
  } catch (error) {
    console.error('Error al actualizar nombre de cargador:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un cargador
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const charger = await Charger.findById(req.params.id);

    if (!charger) {
      return res.status(404).json({ error: 'Cargador no encontrado' });
    }

    if (req.user.role !== 'app_admin' && charger.ownerId?.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este cargador' });
    }

    await Charger.deleteOne({ _id: charger._id });

    if (charger.ownerId) {
      await User.updateOne(
        { _id: charger.ownerId },
        { $pull: { ownedStations: charger._id } }
      );
    }

    res.json({ message: 'Cargador eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar cargador:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener historial de uso de un cargador
router.get('/:id/usage-history', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let filter = { chargerId: req.params.id };

    if (startDate && endDate) {
      filter.startTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const sessions = await ChargingSession.find(filter)
      .populate('vehicleId', 'model')
      .sort({ startTime: -1 });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener estadísticas de uso de un cargador
router.get('/:id/usage-stats', async (req, res) => {
  try {
    const { period } = req.query; // 'day', 'week', 'month', 'year'

    let groupFormat = {};
    switch (period) {
      case 'day':
        groupFormat = {
          year: { $year: '$startTime' },
          month: { $month: '$startTime' },
          day: { $dayOfMonth: '$startTime' }
        };
        break;
      case 'week':
        groupFormat = {
          year: { $year: '$startTime' },
          week: { $week: '$startTime' }
        };
        break;
      case 'month':
        groupFormat = {
          year: { $year: '$startTime' },
          month: { $month: '$startTime' }
        };
        break;
      case 'year':
        groupFormat = {
          year: { $year: '$startTime' }
        };
        break;
      default:
        groupFormat = {
          year: { $year: '$startTime' },
          month: { $month: '$startTime' }
        };
    }

    const usageStats = await ChargingSession.aggregate([
      { $match: { chargerId: mongoose.Types.ObjectId(req.params.id) } },
      {
        $group: {
          _id: groupFormat,
          totalEnergy: { $sum: '$energyDelivered' },
          sessionCount: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          avgDuration: { $avg: '$duration' },
          revenue: { $sum: '$cost' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Calcular porcentaje de ocupación
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    const occupancyStats = await ChargingSession.aggregate([
      {
        $match: {
          chargerId: mongoose.Types.ObjectId(req.params.id),
          startTime: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          totalOccupiedTime: { $sum: '$duration' },
          totalPossibleTime: { $sum: { $subtract: ['$endTime', '$startTime'] } }
        }
      }
    ]);

    const occupancyRate = occupancyStats.length > 0
      ? (occupancyStats[0].totalOccupiedTime / (30 * 24 * 60)) * 100
      : 0;

    res.json({
      usageStats,
      occupancyRate: Math.min(100, Math.round(occupancyRate)) // Asegurar que no supere 100%
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recommendation moved to reservations route (reservations.js) — kept previously for backward compatibility.

// Obtener un cargador por ID (debe ir al final para evitar conflictos con rutas específicas)
router.get('/:id', async (req, res) => {
  try {
    const charger = await Charger.findById(req.params.id)
      .populate('ownerId', 'name email')
      .populate('chargingHistory.vehicleId', 'model chargerType')
      .populate('reservations');

    if (!charger) {
      return res.status(404).json({ error: 'Cargador no encontrado' });
    }

    // Calcular estado en tiempo real basándose en reservas activas
    const now = new Date();
    const activeReservation = await Reservation.findOne({
      chargerId: charger._id,
      startTime: { $lte: now },
      status: { $in: ['active', 'upcoming'] },
      calculatedEndTime: { $gt: now }
    });

    // Si hay una reserva activa, marcar como ocupado
    const realTimeStatus = activeReservation ? 'occupied' : charger.status;

    const chargerWithRealTimeStatus = {
      ...charger.toObject(),
      status: realTimeStatus,
      hasActiveReservation: !!activeReservation
    };

    res.json(chargerWithRealTimeStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;