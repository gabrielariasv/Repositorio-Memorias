const express = require('express');
const router = express.Router();
const Charger = require('../models/Charger');
const ChargingSession = require('../models/ChargingSession');
const Vehicle = require('../models/Vehicle');
const Reservation = require('../models/Reservation');

// Estado actual de todos los cargadores
router.get('/chargers-status', async (req, res) => {
  try {
    const chargers = await Charger.find()
      .select('name location status powerOutput chargerType occupancyHistory')
      .populate('occupancyHistory.sessionId', 'startTime endTime');
    
    const now = new Date();
    const chargersWithCurrentStatus = await Promise.all(chargers.map(async charger => {
      // Verificar si hay una sesión de carga activa
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

// Sesiones de carga activas en este momento
router.get('/active-sessions', async (req, res) => {
  try {
    const now = new Date();
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

// Datos en tiempo real de una sesión específica
router.get('/session/:sessionId', async (req, res) => {
  try {
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

// Monitorización en tiempo real de un cargador específico
router.get('/charger/:chargerId', async (req, res) => {
  try {
    const charger = await Charger.findById(req.params.chargerId)
      .populate({
        path: 'chargingHistory.vehicleId',
        select: 'model'
      });
    
    if (!charger) {
      return res.status(404).json({ error: 'Cargador no encontrado' });
    }
    
    const now = new Date();
    
    // Obtener sesión activa actual (si existe)
    const activeSession = await ChargingSession.findOne({
      chargerId: req.params.chargerId,
      startTime: { $lte: now },
      endTime: { $gte: now }
    }).populate('vehicleId', 'model');
    
    // Obtener reserva activa actual (si existe)
    const activeReservation = await Reservation.findOne({
      chargerId: req.params.chargerId,
      startTime: { $lte: now },
      endTime: { $gte: now },
      status: 'active'
    }).populate('vehicleId', 'model brand');
    
    // Determinar el estado real del cargador
    const isOccupied = !!activeSession || !!activeReservation;
    const currentStatus = isOccupied ? 'occupied' : charger.status;
    
    // Calcular métricas recientes (últimas 24 horas)
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const recentSessions = await ChargingSession.find({
      chargerId: req.params.chargerId,
      startTime: { $gte: twentyFourHoursAgo }
    });
    
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

// New endpoint for real-time session data
router.post('/session-data', async (req, res) => {
    try {
        const { sessionId, timestamp, power, energy, chargerId, vehicleId } = req.body;
        
        // Update charger status to occupied
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

// New endpoint to start simulation
router.post('/start-simulation', async (req, res) => {
    try {
        const { chargerId, vehicleId } = req.body;
        
        // Get charger data for simulation parameters
        const charger = await Charger.findById(chargerId);
        if (!charger) {
            return res.status(404).json({ error: 'Cargador no encontrado' });
        }
        
        // Create new charging session
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