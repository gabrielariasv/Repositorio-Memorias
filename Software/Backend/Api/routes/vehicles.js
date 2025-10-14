const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const ChargingSession = require('../models/ChargingSession');
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const { authenticateToken } = require('./auth');
// Obtener vehículos por id de usuario
router.get('/user/:userId', async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ userId: req.params.userId })
      .populate('userId', 'name email')
      .populate('chargingHistory.chargerId', 'name location');
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener todos los vehículos
router.get('/', async (req, res) => {
  try {
    const vehicles = await Vehicle.find()
      .populate('userId', 'name email')
      .populate('chargingHistory.chargerId', 'name location');
    
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear un vehículo
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      userId,
      model,
      chargerType,
      batteryCapacity,
      currentChargeLevel = 0
    } = req.body;

    if (!userId || !model || !chargerType || batteryCapacity == null) {
      return res.status(400).json({ error: 'Datos del vehículo incompletos' });
    }

    if (req.user.role !== 'app_admin' && userId !== req.user.userId) {
      return res.status(403).json({ error: 'No tienes permiso para crear vehículos para este usuario' });
    }

    const owner = await User.findById(userId);
    if (!owner) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const vehicle = await Vehicle.create({
      userId,
      model: model.trim(),
      chargerType,
      batteryCapacity,
      currentChargeLevel
    });

    if (!owner.vehicles.includes(vehicle._id)) {
      owner.vehicles.push(vehicle._id);
      await owner.save();
    }

    const populatedVehicle = await Vehicle.findById(vehicle._id)
      .populate('userId', 'name email');

    res.status(201).json(populatedVehicle);
  } catch (error) {
    console.error('Error al crear vehículo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener un vehículo por ID
router.get('/:id', async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('chargingHistory.chargerId', 'name location');
    
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }
    
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener historial de carga de un vehículo
router.get('/:id/charging-history', async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;
    let filter = { vehicleId: req.params.id };
    
    // Filtrar por rango de fechas si se proporciona
    if (startDate && endDate) {
      filter.startTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    let query = ChargingSession.find(filter)
      .populate('chargerId', 'name location powerOutput')
      .sort({ startTime: -1 });
    
    if (limit) {
      query = query.limit(parseInt(limit));
    }
    
    const sessions = await query;
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un vehículo
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }

    if (req.user.role !== 'app_admin' && vehicle.userId?.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este vehículo' });
    }

    await Vehicle.deleteOne({ _id: vehicle._id });

    if (vehicle.userId) {
      await User.updateOne(
        { _id: vehicle.userId },
        { $pull: { vehicles: vehicle._id } }
      );
    }

    res.json({ message: 'Vehículo eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar vehículo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener estadísticas de consumo de un vehículo
router.get('/:id/energy-stats', async (req, res) => {
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
    
    const energyStats = await ChargingSession.aggregate([
      { $match: { vehicleId: mongoose.Types.ObjectId(req.params.id) } },
      {
        $group: {
          _id: groupFormat,
          totalEnergy: { $sum: '$energyDelivered' },
          sessionCount: { $sum: 1 },
          avgDuration: { $avg: '$duration' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    res.json(energyStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener reservas futuras (actuales) de un vehículo
router.get('/:id/actual', async (req, res) => {
  try {
    const now = new Date();
    const reservations = await Reservation.find({
      vehicleId: req.params.id,
      endTime: { $gt: now }
    })
      .populate('chargerId', 'name location')
      .sort({ startTime: 1 });
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;