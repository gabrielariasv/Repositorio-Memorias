const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const Charger = require('../models/Charger');
const ChargingSession = require('../models/ChargingSession');
const Reservation = require('../models/Reservation');

// Estadísticas generales del sistema
router.get('/overview', async (req, res) => {
  try {
    const totalVehicles = await Vehicle.countDocuments();
    const totalChargers = await Charger.countDocuments();
    const totalSessions = await ChargingSession.countDocuments();
    const totalEnergy = await ChargingSession.aggregate([
      { $group: { _id: null, total: { $sum: '$energyDelivered' } } }
    ]);
    const totalReservations = await Reservation.countDocuments();

    res.json({
      totalVehicles,
      totalChargers,
      totalSessions,
      totalEnergy: totalEnergy[0]?.total || 0,
      totalReservations
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Estadísticas de uso por tipo de cargador
router.get('/charger-types', async (req, res) => {
  try {
    const stats = await Charger.aggregate([
      { $group: { 
        _id: '$chargerType', 
        count: { $sum: 1 },
        avgPower: { $avg: '$powerOutput' }
      }},
      { $sort: { count: -1 } }
    ]);
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Estadísticas de consumo energético por mes
router.get('/energy-monthly', async (req, res) => {
  try {
    const energyByMonth = await ChargingSession.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$startTime' },
            month: { $month: '$startTime' }
          },
          totalEnergy: { $sum: '$energyDelivered' },
          sessionCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    res.json(energyByMonth);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Top 5 vehículos con mayor consumo
router.get('/top-energy-vehicles', async (req, res) => {
  try {
    const topVehicles = await ChargingSession.aggregate([
      {
        $group: {
          _id: '$vehicleId',
          totalEnergy: { $sum: '$energyDelivered' },
          sessionCount: { $sum: 1 }
        }
      },
      { $sort: { totalEnergy: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'vehicles',
          localField: '_id',
          foreignField: '_id',
          as: 'vehicle'
        }
      },
      { $unwind: '$vehicle' }
    ]);
    
    res.json(topVehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Uso de cargadores por hora del día
router.get('/usage-by-hour', async (req, res) => {
  try {
    const usageByHour = await ChargingSession.aggregate([
      {
        $group: {
          _id: { $hour: '$startTime' },
          sessionCount: { $sum: 1 },
          totalEnergy: { $sum: '$energyDelivered' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json(usageByHour);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;