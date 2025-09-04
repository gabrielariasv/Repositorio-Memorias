const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const ChargingSession = require('../models/ChargingSession');

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

module.exports = router;