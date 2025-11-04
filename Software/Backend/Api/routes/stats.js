const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const Charger = require('../models/Charger');
const ChargingSession = require('../models/ChargingSession');
const Reservation = require('../models/Reservation');

/**
 * GET /api/stats/overview
 * Estadísticas generales del sistema
 * Retorna conteos totales y energía consumida agregada
 */
router.get('/overview', async (req, res) => {
  try {
    // PASO 1: Contar documentos en cada colección
    const totalVehicles = await Vehicle.countDocuments();
    const totalChargers = await Charger.countDocuments();
    const totalSessions = await ChargingSession.countDocuments();
    
    // PASO 2: Calcular energía total usando agregación
    // $group agrupa todos los documentos y suma energyDelivered
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

/**
 * GET /api/stats/charger-types
 * Estadísticas de cargadores agrupadas por tipo
 * Retorna cantidad y potencia promedio por cada tipo de cargador
 */
router.get('/charger-types', async (req, res) => {
  try {
    // Pipeline de agregación de MongoDB
    const stats = await Charger.aggregate([
      { 
        // PASO 1: Agrupar por tipo de cargador
        $group: { 
          _id: '$chargerType', 
          count: { $sum: 1 }, // Contar documentos
          avgPower: { $avg: '$powerOutput' } // Calcular promedio de potencia
        }
      },
      { 
        // PASO 2: Ordenar por cantidad descendente
        $sort: { count: -1 } 
      }
    ]);
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stats/energy-monthly
 * Consumo energético agrupado por mes
 * Útil para gráficos de tendencias de consumo
 */
router.get('/energy-monthly', async (req, res) => {
  try {
    const energyByMonth = await ChargingSession.aggregate([
      {
        // PASO 1: Agrupar por año y mes usando operadores de fecha
        $group: {
          _id: {
            year: { $year: '$startTime' },  // Extraer año
            month: { $month: '$startTime' }  // Extraer mes (1-12)
          },
          totalEnergy: { $sum: '$energyDelivered' },
          sessionCount: { $sum: 1 }
        }
      },
      { 
        // PASO 2: Ordenar cronológicamente
        $sort: { '_id.year': 1, '_id.month': 1 } 
      }
    ]);
    
    res.json(energyByMonth);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stats/top-energy-vehicles
 * Top 5 vehículos con mayor consumo energético
 * Útil para identificar usuarios más activos del sistema
 */
router.get('/top-energy-vehicles', async (req, res) => {
  try {
    const topVehicles = await ChargingSession.aggregate([
      {
        // PASO 1: Agrupar por vehículo y sumar energía
        $group: {
          _id: '$vehicleId',
          totalEnergy: { $sum: '$energyDelivered' },
          sessionCount: { $sum: 1 }
        }
      },
      { 
        // PASO 2: Ordenar por energía total descendente
        $sort: { totalEnergy: -1 } 
      },
      { 
        // PASO 3: Limitar a top 5
        $limit: 5 
      },
      {
        // PASO 4: Unir con colección de vehículos para obtener detalles
        $lookup: {
          from: 'vehicles',
          localField: '_id',
          foreignField: '_id',
          as: 'vehicle'
        }
      },
      { 
        // PASO 5: Descomponer array de vehicle (siempre será 1 elemento)
        $unwind: '$vehicle' 
      }
    ]);
    
    res.json(topVehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stats/usage-by-hour
 * Uso de cargadores por hora del día (0-23)
 * Útil para identificar horas pico de demanda
 */
router.get('/usage-by-hour', async (req, res) => {
  try {
    const usageByHour = await ChargingSession.aggregate([
      {
        // PASO 1: Agrupar por hora del día usando $hour
        $group: {
          _id: { $hour: '$startTime' }, // Extrae hora (0-23)
          sessionCount: { $sum: 1 },
          totalEnergy: { $sum: '$energyDelivered' }
        }
      },
      { 
        // PASO 2: Ordenar por hora ascendente (0 a 23)
        $sort: { _id: 1 } 
      }
    ]);
    
    res.json(usageByHour);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;