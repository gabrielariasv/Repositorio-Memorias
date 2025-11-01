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
    let { vehicleId, chargerId, startTime, endTime, bufferTime } = req.body;
    const userId = req.user.userId;

    // Validaciones básicas
    if (!vehicleId || !chargerId || !startTime || !endTime) {
      return res.status(400).json({ error: 'vehicleId, chargerId, startTime y endTime son requeridos' });
    }
    if (!bufferTime) {
      bufferTime = 0;
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

    const calculatedEndTime = new Date(end);
    calculatedEndTime.setMinutes(calculatedEndTime.getMinutes() + bufferTime);

    // Verificar disponibilidad del cargador en ese rango de tiempo
    const conflictingReservations = await Reservation.find({
      chargerId: chargerId,
      status: { $in: ['upcoming', 'active'] },
      $or: [
        // La nueva reserva comienza durante una reserva existente
        { startTime: { $lte: start }, endTime: { $gt: start } },
        // La nueva reserva termina durante una reserva existente
        { startTime: { $lt: calculatedEndTime }, endTime: { $gte: calculatedEndTime } },
        // La nueva reserva engloba completamente una reserva existente
        { startTime: { $gte: start }, endTime: { $lte: calculatedEndTime } }
      ]
    });

    if (conflictingReservations.length > 0) {
      return res.status(409).json({
        error: 'El cargador ya está reservado en ese horario',
        conflicts: conflictingReservations
      });
    }

    // Verificar que el vehículo no tenga otra reserva en ese rango de tiempo
    const vehicleConflictingReservations = await Reservation.find({
      vehicleId: vehicleId,
      status: { $in: ['upcoming', 'active'] },
      $or: [
        // La nueva reserva comienza durante una reserva existente
        { startTime: { $lte: start }, endTime: { $gt: start } },
        // La nueva reserva termina durante una reserva existente
        { startTime: { $lt: calculatedEndTime }, endTime: { $gte: calculatedEndTime } },
        // La nueva reserva engloba completamente una reserva existente
        { startTime: { $gte: start }, endTime: { $lte: calculatedEndTime } }
      ]
    });

    if (vehicleConflictingReservations.length > 0) {
      return res.status(409).json({
        error: 'El vehículo ya tiene otra reserva en ese horario',
        conflicts: vehicleConflictingReservations
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
      calculatedEndTime: end,
      estimatedChargeTime: (end - start) / (1000 * 60), // en minutos
      bufferTime: bufferTime || 0
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

// Recomendación de reserva: buscar estaciones y ventanas disponibles considerando vehículo + cargador
// Nota: se añadió aquí porque la recomendación está íntimamente ligada a una reserva (vehículo y ventana)
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
