const express = require('express');
const router = express.Router();
const Charger = require('../models/Charger');
const ChargingSession = require('../models/ChargingSession');
const Reservation = require('../models/Reservation');

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
    
    res.json(chargers);
  } catch (error) {
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

// Obtener un cargador por ID
router.get('/:id', async (req, res) => {
  try {
    const charger = await Charger.findById(req.params.id)
      .populate('ownerId', 'name email')
      .populate('chargingHistory.vehicleId', 'model chargerType')
      .populate('reservations');
    
    if (!charger) {
      return res.status(404).json({ error: 'Cargador no encontrado' });
    }
    
    res.json(charger);
  } catch (error) {
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

module.exports = router;