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

// Requiere: latitude, longitude, vehicleId, distancia, costo, tiempoCarga, demora (pesos)
router.get('/recommendation', async (req, res) => {
  try {
    const { latitude, longitude, vehicleId, distancia, costo, tiempoCarga, demora, currentChargeLevel, targetChargeLevel } = req.query;
    if (!latitude || !longitude || !vehicleId || currentChargeLevel === undefined || targetChargeLevel === undefined) {
      return res.status(400).json({ error: 'Faltan parámetros obligatorios (latitude, longitude, vehicleId, currentChargeLevel, targetChargeLevel)' });
    }
    // Validar pesos
    if (
      distancia === undefined || costo === undefined || tiempoCarga === undefined || demora === undefined ||
      isNaN(Number(distancia)) || isNaN(Number(costo)) || isNaN(Number(tiempoCarga)) || isNaN(Number(demora))
    ) {
      return res.status(400).json({ error: 'Faltan o son inválidos los parámetros de pesos (distancia, costo, tiempoCarga, demora)' });
    }

    const target = Number(targetChargeLevel);
    const current = Number(currentChargeLevel);
    if (isNaN(target) || target < 0 || target > 100) {
      return res.status(400).json({ error: 'targetChargeLevel inválido (0-100)' });
    }
    if (isNaN(current) || current < 0 || current > 100) {
      return res.status(400).json({ error: 'currentChargeLevel inválido (0-100)' });
    }

    // No considerar cargadores a más de X metros
    const MAX_DISTANCE_METERS = 30000;

    // 1. Obtener cargadores disponibles cerca del usuario (filtrado en BD)
    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);
    const chargers = await Charger.find({
      status: 'available',
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [userLng, userLat] },
          $maxDistance: MAX_DISTANCE_METERS
        }
      }
    }).populate('reservations');

    // 2. Obtener datos del vehículo
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }
    const batteryCapacity = vehicle.batteryCapacity;
    const chargeLevel = current;
    // energia necesaria para llegar a target (porcentaje objetivo)
    const targetLevel = target;
    const energyNeeded = batteryCapacity * ((targetLevel - chargeLevel) / 100);
    if (energyNeeded <= 0) {
      return res.status(400).json({ error: 'El nivel objetivo debe ser mayor al nivel actual' });
    }

    // 3. Calcular variables para cada cargador
    let maxDist = 0, maxCost = 0, maxTime = 0, maxDemora = 0;
    const now = new Date();
    const results = [];
    const daysThreshold = 2 * 24 * 60 * 60 * 1000; // 2 días en milisegundos
    // Obtener una vez las reservas del vehículo (son las mismas para todos los cargadores)
    // Proyectar solo los campos necesarios para la búsqueda de huecos
    const vehicleReservations = await Reservation.find({
      vehicleId: vehicleId,
      status: { $in: ['upcoming', 'active'] },
      calculatedEndTime: { $gt: now }
    }, 'startTime calculatedEndTime').sort({ startTime: 1 });

    for (const charger of chargers) {
      // Distancia
      const dist = calcularDistancia(
        parseFloat(latitude),
        parseFloat(longitude),
        charger.location.coordinates[1],
        charger.location.coordinates[0]
      );
      // Costo por kWh (asumir 1 unidad monetaria si no está definido)
      const unitCost = charger.energy_cost || 1;
      // Costo total para aportar la energía necesaria (kWh * precio por kWh)
      const totalCost = unitCost * energyNeeded;
      // Tiempo de carga necesario para aportar energyNeeded en este cargador (minutos)
      const tCarga = charger.powerOutput ? (energyNeeded / charger.powerOutput) * 60 : null;
      if (!tCarga) continue;

      let tDemora = null;

      // Obtener reservas del cargador y del vehículo, ya que ambos deben estar libres
      // Proyectar solo los campos necesarios para la búsqueda de huecos
      const chargerReservations = await Reservation.find({
        chargerId: charger._id,
        status: { $in: ['upcoming', 'active'] },
        calculatedEndTime: { $gt: now }
      }, 'startTime calculatedEndTime').sort({ startTime: 1 });

      // Construir intervalos ocupados (por cargador O por vehículo)
      const intervals = [];
      const pushInterval = (r) => {
        const s = new Date(r.startTime);
        const e = new Date(r.calculatedEndTime);
        if (e <= now) return;
        intervals.push({ start: s < now ? new Date(now) : s, end: e });
      };
      chargerReservations.forEach(pushInterval);
      vehicleReservations.forEach(pushInterval);

      // Ordenar e unir intervalos solapados
      intervals.sort((a, b) => a.start - b.start);
      const merged = [];
      for (const iv of intervals) {
        if (!merged.length) {
          merged.push({ ...iv });
          continue;
        }
        const last = merged[merged.length - 1];
        if (iv.start <= last.end) {
          if (iv.end > last.end) last.end = iv.end;
        } else {
          merged.push({ ...iv });
        }
      }

      // Buscar huecos libres donde tanto el cargador como el vehículo estén disponibles
      const tCargaMs = tCarga * 60 * 1000;
      const limit = new Date(now.getTime() + daysThreshold);
      let gapStart = new Date(now);
      let found = false;

      if (merged.length === 0) {
        // No hay bloqueos, verificar si podemos cargar antes del límite
        if ((limit - gapStart) >= tCargaMs) {
          tDemora = 0;
          found = true;
        }
      } else {
        for (let i = 0; i <= merged.length; i++) {
          const gapEnd = merged[i] ? merged[i].start : limit;
          const gapDurationMs = gapEnd - gapStart;
          if (gapDurationMs >= tCargaMs) {
            tDemora = (gapStart - now) / (60 * 1000);
            found = true;
            break;
          }
          if (merged[i]) {
            gapStart = merged[i].end;
            if (gapStart > limit) break;
          }
        }
      }

      // Si nunca encontró un bloque, o el primer bloque disponible es después del limite de tiempo
      if (!found || (tDemora !== null && tDemora > (daysThreshold / (60 * 1000)))) continue;

      maxDist = Math.max(maxDist, dist);
      maxCost = Math.max(maxCost, totalCost);
      maxTime = Math.max(maxTime, tCarga);
      maxDemora = Math.max(maxDemora, tDemora);

      results.push({ charger, dist, cost: totalCost, unitCost, tCarga, tDemora });
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