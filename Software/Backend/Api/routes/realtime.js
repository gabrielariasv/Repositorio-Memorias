const express = require('express');
const router = express.Router();
const Charger = require('../models/Charger');
const ChargingSession = require('../models/ChargingSession');
const Vehicle = require('../models/Vehicle');
const Reservation = require('../models/Reservation');

/**
 * GET /api/realtime/chargers-status
 * Obtener estado actual de todos los cargadores del sistema
 * Calcula ocupación en tiempo real basándose en sesiones y reservas activas
 */
router.get('/chargers-status', async (req, res) => {
  try {
    // PASO 1: Obtener todos los cargadores con información básica
    const chargers = await Charger.find()
      .select('name location status powerOutput chargerType occupancyHistory')
      .populate('occupancyHistory.sessionId', 'startTime endTime');
    
    const now = new Date();
    
    // PASO 2: Calcular estado actual para cada cargador
    const chargersWithCurrentStatus = await Promise.all(chargers.map(async charger => {
      // Verificar si hay una sesión de carga activa en este momento
      const isOccupiedBySession = charger.occupancyHistory.some(record => 
        record.start <= now && record.end >= now && record.occupied
      );
      
      // Verificar si hay una reserva activa en este momento
      const activeReservation = await Reservation.findOne({
        chargerId: charger._id,
        startTime: { $lte: now },
        endTime: { $gte: now },
        status: 'active'
      });
      
      const isOccupied = isOccupiedBySession || !!activeReservation;
      
      return {
        _id: charger._id,
        name: charger.name,
        location: charger.location,
        status: isOccupied ? 'occupied' : charger.status,
        powerOutput: charger.powerOutput,
        chargerType: charger.chargerType,
        currentOccupancy: isOccupied,
        occupiedByReservation: !!activeReservation,
        occupiedBySession: isOccupiedBySession
      };
    }));
    
    res.json(chargersWithCurrentStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/realtime/active-sessions
 * Obtener todas las sesiones de carga activas en este momento
 * Útil para dashboards y monitoreo del sistema
 */
router.get('/active-sessions', async (req, res) => {
  try {
    const now = new Date();
    
    // PASO 1: Buscar sesiones que estén activas ahora (startTime <= now <= endTime)
    const activeSessions = await ChargingSession.find({
      startTime: { $lte: now },
      endTime: { $gte: now }
    })
    .populate('vehicleId', 'model chargerType')
    .populate('chargerId', 'name location powerOutput');
    
    res.json(activeSessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/realtime/session/:sessionId
 * Obtener datos en tiempo real de una sesión específica
 * Incluye información del vehículo y cargador involucrados
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    // PASO 1: Buscar sesión con datos poblados
    const session = await ChargingSession.findById(req.params.sessionId)
      .populate('vehicleId', 'model chargerType')
      .populate('chargerId', 'name location powerOutput');
    
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/realtime/charger/:chargerId
 * Monitorización completa en tiempo real de un cargador específico
 * Incluye: estado actual, sesión activa, reserva activa y estadísticas 24h
 */
router.get('/charger/:chargerId', async (req, res) => {
  try {
    // PASO 1: Buscar el cargador con historial
    const charger = await Charger.findById(req.params.chargerId)
      .populate({
        path: 'chargingHistory.vehicleId',
        select: 'model'
      });
    
    if (!charger) {
      return res.status(404).json({ error: 'Cargador no encontrado' });
    }
    
    const now = new Date();
    
    // PASO 2: Obtener sesión activa actual (si existe)
    const activeSession = await ChargingSession.findOne({
      chargerId: req.params.chargerId,
      startTime: { $lte: now },
      endTime: { $gte: now }
    }).populate('vehicleId', 'model');
    
    // PASO 3: Obtener reserva activa actual (si existe)
    const activeReservation = await Reservation.findOne({
      chargerId: req.params.chargerId,
      startTime: { $lte: now },
      endTime: { $gte: now },
      status: 'active'
    }).populate('vehicleId', 'model brand');
    
    // PASO 4: Determinar el estado real del cargador
    const isOccupied = !!activeSession || !!activeReservation;
    const currentStatus = isOccupied ? 'occupied' : charger.status;
    
    // PASO 5: Calcular métricas recientes (últimas 24 horas)
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const recentSessions = await ChargingSession.find({
      chargerId: req.params.chargerId,
      startTime: { $gte: twentyFourHoursAgo }
    });
    
    // Calcular totales y promedios de las últimas 24h
    const totalEnergy24h = recentSessions.reduce((sum, session) => sum + session.energyDelivered, 0);
    const avgSessionDuration = recentSessions.length > 0 
      ? recentSessions.reduce((sum, session) => sum + session.duration, 0) / recentSessions.length 
      : 0;
    
    res.json({
      charger: {
        ...charger.toObject(),
        currentStatus,
        isOccupied,
        occupiedByReservation: !!activeReservation,
        occupiedBySession: !!activeSession
      },
      activeSession,
      activeReservation,
      stats24h: {
        sessionCount: recentSessions.length,
        totalEnergy: totalEnergy24h,
        avgSessionDuration: avgSessionDuration
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/realtime/session-data
 * Recibir datos en tiempo real de una sesión de carga
 * Actualiza el estado del cargador y registra ocupación
 */
router.post('/session-data', async (req, res) => {
    try {
        const { sessionId, timestamp, power, energy, chargerId, vehicleId } = req.body;
        
        // PASO 1: Actualizar estado del cargador a ocupado
        // PASO 2: Agregar registro al historial de ocupación
        await Charger.findByIdAndUpdate(chargerId, {
            status: 'occupied',
            $push: {
                occupancyHistory: {
                    start: timestamp,
                    occupied: true,
                    sessionId: sessionId
                }
            }
        });
        
        res.json({ success: true, message: 'Realtime data received' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/realtime/start-simulation
 * Iniciar una simulación de sesión de carga
 * Crea una nueva sesión y la marca como activa
 */
router.post('/start-simulation', async (req, res) => {
    try {
        const { chargerId, vehicleId } = req.body;
        
        // PASO 1: Obtener datos del cargador para parámetros de simulación
        const charger = await Charger.findById(chargerId);
        if (!charger) {
            return res.status(404).json({ error: 'Cargador no encontrado' });
        }
        
        // PASO 2: Crear nueva sesión de carga activa
        const session = new ChargingSession({
            vehicleId: vehicleId,
            chargerId: chargerId,
            startTime: new Date(),
            status: 'active'
        });
        await session.save();
        
        res.json({ 
            success: true, 
            sessionId: session._id,
            powerOutput: charger.powerOutput 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;