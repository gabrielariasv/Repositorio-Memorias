const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const Charger = require('../models/Charger');
const ChargingSession = require('../models/ChargingSession');

const calcularDistancia = require('../utils/calcularDistancia');
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

// (Mover esta ruta al final del archivo para evitar conflictos con rutas específicas como /recommendation y /nearby)

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

// Requiere: latitude, longitude, vehicleId, distancia, costo, tiempoCarga, demora (pesos)
router.get('/recommendation', async (req, res) => {
  try {
    const { latitude, longitude, vehicleId, distancia, costo, tiempoCarga, demora, currentChargeLevel } = req.query;
    if (!latitude || !longitude || !vehicleId || currentChargeLevel === undefined) {
      return res.status(400).json({ error: 'Faltan parámetros obligatorios' });
    }
    // Validar pesos
    if (
      distancia === undefined || costo === undefined || tiempoCarga === undefined || demora === undefined ||
      isNaN(Number(distancia)) || isNaN(Number(costo)) || isNaN(Number(tiempoCarga)) || isNaN(Number(demora))
    ) {
      return res.status(400).json({ error: 'Faltan o son inválidos los parámetros de pesos (distancia, costo, tiempoCarga, demora)' });
    }

    // 1. Obtener cargadores disponibles con reservas pobladas
    const chargers = await Charger.find({ status: 'available' }).populate('reservations');

    // 2. Obtener datos del vehículo
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }
    const batteryCapacity = vehicle.batteryCapacity;
    const chargeLevel = Number(currentChargeLevel);

    // Nuevo: leer targetCharge (porcentaje objetivo). Si no viene, por defecto 100.
    const targetCharge = req.query.targetCharge !== undefined ? Number(req.query.targetCharge) : 100;
    if (isNaN(targetCharge) || targetCharge <= chargeLevel) {
      return res.status(400).json({ error: 'Parámetro targetCharge inválido o no mayor al nivel actual de carga' });
    }
    // energía necesaria para alcanzar target (kWh)
    const energyNeeded = batteryCapacity * (targetCharge / 100 - chargeLevel / 100);

    // 3. Calcular variables para cada cargador
    let maxDist = 0, maxCost = 0, maxTime = 0, maxDemora = 0;
    const now = new Date();
    const results = [];
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    for (const charger of chargers) {
      // Distancia
      const dist = calcularDistancia(
        parseFloat(latitude),
        parseFloat(longitude),
        charger.location.coordinates[1],
        charger.location.coordinates[0]
      );
      // Costo (puedes ajustar según tu modelo)
      const cost = charger.cost || 1;
      // Tiempo de carga (en minutos)
      const tCarga = charger.powerOutput ? (energyNeeded / charger.powerOutput) * 60 : null;
      if (!tCarga) continue; // Si no hay potencia, no es reservable

      // adjuntar estimación de energía y target al objeto para que el frontend lo use
      const estimatedEnergyKWh = energyNeeded;

      // Demora: buscar el primer bloque disponible suficientemente largo
      let tDemora = null;
      const reservas = await Reservation.find({
        chargerId: charger._id,
        calculatedEndTime: { $gt: now },
        status: { $in: ['upcoming', 'active'] }
      }).sort({ startTime: 1 });

      let cursor = new Date(now);
      let found = false;
      for (let i = 0; i <= reservas.length; i++) {
        const nextStart = reservas[i]?.startTime ? new Date(reservas[i].startTime) : null;
        // Si no hay más reservas, el bloque es hasta 1 semana desde ahora
        const nextBlockEnd = nextStart || new Date(now.getTime() + oneWeekMs);
        const blockDuration = (nextBlockEnd - cursor) / (60 * 1000); // minutos
        if (blockDuration >= tCarga) {
          tDemora = (cursor - now) / (60 * 1000); // minutos de espera
          found = true;
          break;
        }
        // Mover cursor al final de la reserva actual
        if (reservas[i]) {
          cursor = new Date(reservas[i].calculatedEndTime);
        }
      }
      // Si nunca encontró un bloque, o el primer bloque disponible es después de 1 semana, no agregar el cargador
      if (!found || (tDemora !== null && tDemora > (oneWeekMs / (60 * 1000)))) continue;

      maxDist = Math.max(maxDist, dist);
      maxCost = Math.max(maxCost, cost);
      maxTime = Math.max(maxTime, tCarga);
      maxDemora = Math.max(maxDemora, tDemora);

      results.push({ charger, dist, cost, tCarga, tDemora, estimatedEnergyKWh, targetCharge });
    }

    // 4. Calcular performance solo para los reservables
    if (results.length === 0) {
      return res.json({ best: null, ranking: [] });
    }
    const sumaPesos = Number(distancia) + Number(costo) + Number(tiempoCarga) + Number(demora);
    results.forEach(r => {
      r.performance =
        (Number(distancia) / sumaPesos) * (r.dist / (maxDist || 1)) +
        (Number(costo) / sumaPesos) * (r.cost / (maxCost || 1)) +
        (Number(tiempoCarga) / sumaPesos) * (r.tCarga / (maxTime || 1)) +
        (Number(demora) / sumaPesos) * (r.tDemora / (maxDemora || 1));
    });

    // 5. Ordenar y retornar el mejor
    results.sort((a, b) => a.performance - b.performance);
    // incluir target/energy en la respuesta para uso en UI
    res.json({ best: results[0], ranking: results });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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
    
    res.json(charger);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;