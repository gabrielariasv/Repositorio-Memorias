const express = require('express');
const router = express.Router();
const ChargingSessionActive = require('../models/ChargingSessionActive');
const Reservation = require('../models/Reservation');
const ChargingSession = require('../models/ChargingSession');
const Charger = require('../models/Charger');
const Notification = require('../models/Notification');
const SimulatorController = require('../simulator/simulator-controller');

const simulatorController = new SimulatorController();

/**
 * POST /api/charging-sessions/initiate
 * Iniciar proceso de carga (crear sesión activa en espera de confirmaciones)
 * 
 * Body: { reservationId, chargerId, vehicleId, userId, adminId }
 */
router.post('/initiate', async (req, res) => {
  try {
    const { reservationId, chargerId, vehicleId, userId, adminId } = req.body;
    
    // VALIDACIÓN: Verificar parámetros requeridos
    if (!reservationId || !chargerId || !vehicleId || !userId || !adminId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Faltan parámetros requeridos: reservationId, chargerId, vehicleId, userId, adminId' 
      });
    }
    
    // PASO 1: Verificar que no existe ya una sesión activa para esta reserva
    const existingSession = await ChargingSessionActive.findOne({ 
      reservationId,
      status: { $nin: ['completed', 'cancelled'] }
    });
    
    if (existingSession) {
      return res.json({ 
        success: true, 
        session: existingSession,
        message: 'Ya existe una sesión activa para esta reserva'
      });
    }
    
    // PASO 2: Verificar que la reserva existe y está activa
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({ 
        success: false, 
        error: 'Reserva no encontrada' 
      });
    }
    
    if (reservation.status !== 'active' && reservation.status !== 'upcoming') {
      return res.status(400).json({ 
        success: false, 
        error: 'La reserva no está activa o próxima' 
      });
    }
    
    // PASO 3: Crear sesión de carga activa
    const newSession = new ChargingSessionActive({
      reservationId,
      chargerId,
      vehicleId,
      userId,
      adminId,
      status: 'waiting_confirmations',
      createdAt: new Date()
    });
    
    await newSession.save();
    
    // PASO 4: Crear notificaciones para ambos usuarios
    await Notification.create([
      {
        userId: adminId,
        type: 'charging_confirmation_required',
        message: 'Se requiere tu confirmación para iniciar la carga',
        relatedChargerId: chargerId,
        relatedSessionId: newSession._id,
        read: false
      },
      {
        userId: userId,
        type: 'charging_confirmation_required',
        message: 'Se requiere tu confirmación para iniciar la carga',
        relatedChargerId: chargerId,
        relatedSessionId: newSession._id,
        read: false
      }
    ]);
    
    res.json({ 
      success: true, 
      session: newSession,
      message: 'Sesión de carga iniciada, esperando confirmaciones'
    });
  } catch (error) {
    console.error('Error iniciando sesión de carga:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/charging-sessions/:id/confirm
 * Confirmar participación en la carga (admin o usuario)
 * 
 * Body: { userType: 'admin' | 'user' }
 */
router.post('/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params;
    const { userType } = req.body;
    
    // VALIDACIÓN: Verificar tipo de usuario
    if (!userType || !['admin', 'user'].includes(userType)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Se requiere userType: "admin" o "user"' 
      });
    }
    
    // PASO 1: Buscar sesión activa
    const session = await ChargingSessionActive.findById(id);
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        error: 'Sesión de carga no encontrada' 
      });
    }
    
    // PASO 2: Verificar que la sesión está esperando confirmaciones
    if (!['waiting_confirmations', 'admin_confirmed', 'user_confirmed'].includes(session.status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'La sesión no está esperando confirmaciones' 
      });
    }
    
    // PASO 3: Registrar confirmación según tipo de usuario
    const now = new Date();
    let newStatus = session.status;
    
    if (userType === 'admin' && !session.adminConfirmedAt) {
      session.adminConfirmedAt = now;
      // Actualizar estado según confirmaciones
      if (session.userConfirmedAt) {
        newStatus = 'ready_to_start';
      } else {
        newStatus = 'admin_confirmed';
      }
    } else if (userType === 'user' && !session.userConfirmedAt) {
      session.userConfirmedAt = now;
      // Actualizar estado según confirmaciones
      if (session.adminConfirmedAt) {
        newStatus = 'ready_to_start';
      } else {
        newStatus = 'user_confirmed';
      }
    } else {
      return res.status(400).json({ 
        success: false, 
        error: `${userType} ya ha confirmado anteriormente` 
      });
    }
    
    session.status = newStatus;
    await session.save();
    
    // PASO 4: Si ambos confirmaron, notificar que la carga puede iniciar
    if (newStatus === 'ready_to_start') {
      await Notification.create([
        {
          userId: session.adminId,
          type: 'charging_ready',
          message: 'Ambos usuarios confirmaron. La carga puede iniciar.',
          relatedChargerId: session.chargerId,
          relatedSessionId: session._id,
          read: false
        },
        {
          userId: session.userId,
          type: 'charging_ready',
          message: 'Ambos usuarios confirmaron. La carga puede iniciar.',
          relatedChargerId: session.chargerId,
          relatedSessionId: session._id,
          read: false
        }
      ]);
    }
    
    res.json({ 
      success: true, 
      session,
      message: newStatus === 'ready_to_start' 
        ? 'Ambos usuarios confirmaron, listo para iniciar carga' 
        : 'Confirmación registrada, esperando al otro usuario'
    });
  } catch (error) {
    console.error('Error confirmando carga:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/charging-sessions/:id/start
 * Iniciar la carga real (solo si ambos confirmaron)
 */
router.post('/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    
    // PASO 1: Buscar sesión activa
    const session = await ChargingSessionActive.findById(id).populate('chargerId');
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        error: 'Sesión de carga no encontrada' 
      });
    }
    
    // PASO 2: Verificar que ambos confirmaron
    if (session.status !== 'ready_to_start') {
      return res.status(400).json({ 
        success: false, 
        error: 'La sesión no está lista para iniciar (ambos usuarios deben confirmar)' 
      });
    }
    
    // PASO 3: Iniciar simulación de carga
    const charger = session.chargerId;
    const result = await simulatorController.startNewSession(
      charger._id.toString(),
      session.vehicleId.toString(),
      session._id.toString() // Pasar ID de sesión activa
    );
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    // PASO 4: Actualizar sesión a estado "charging"
    session.status = 'charging';
    session.startedAt = new Date();
    await session.save();
    
    // PASO 5: Notificar a ambos usuarios que la carga inició
    await Notification.create([
      {
        userId: session.adminId,
        type: 'charging_started',
        message: 'La carga ha iniciado',
        relatedChargerId: session.chargerId,
        relatedSessionId: session._id,
        read: false
      },
      {
        userId: session.userId,
        type: 'charging_started',
        message: 'La carga ha iniciado',
        relatedChargerId: session.chargerId,
        relatedSessionId: session._id,
        read: false
      }
    ]);
    
    res.json({ 
      success: true, 
      session,
      simulator: result,
      message: 'Carga iniciada exitosamente'
    });
  } catch (error) {
    console.error('Error iniciando carga:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/charging-sessions/:id/stop
 * Detener la carga en progreso
 * 
 * Body: { stoppedBy: 'admin' | 'user' | 'system' }
 */
router.post('/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;
    const { stoppedBy } = req.body;
    
    // PASO 1: Buscar sesión activa
    const session = await ChargingSessionActive.findById(id).populate('chargerId');
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        error: 'Sesión de carga no encontrada' 
      });
    }
    
    // PASO 2: Verificar que está cargando
    if (session.status !== 'charging') {
      return res.status(400).json({ 
        success: false, 
        error: 'La sesión no está en progreso' 
      });
    }
    
    // PASO 3: Detener simulador
    const result = await simulatorController.stopSession(session.chargerId._id.toString());
    
    // PASO 4: Obtener datos finales del simulador
    const sessionData = simulatorController.getSessionData(session.chargerId._id.toString());
    
    // PASO 5: Calcular costos
    const charger = session.chargerId;
    const energyCost = (sessionData?.energyDelivered || 0) * (charger.energy_cost || 0);
    const durationHours = (sessionData?.duration || 0) / 60;
    const parkingCost = durationHours * (charger.parking_cost || 0);
    const totalCost = energyCost + parkingCost;
    
    // PASO 6: Actualizar sesión a completada
    session.status = 'completed';
    session.endedAt = new Date();
    session.energyDelivered = sessionData?.energyDelivered || session.energyDelivered;
    session.energyCost = energyCost;
    session.parkingCost = parkingCost;
    session.totalCost = totalCost;
    session.realTimeData = sessionData?.realTimeData || [];
    await session.save();
    
    // PASO 7: Guardar en historial permanente (ChargingSession)
    const finalSession = new ChargingSession({
      vehicleId: session.vehicleId,
      chargerId: session.chargerId,
      startTime: session.startedAt,
      endTime: session.endedAt,
      energyDelivered: session.energyDelivered,
      duration: sessionData?.duration || 0,
      cost: totalCost,
      realTimeData: session.realTimeData
    });
    await finalSession.save();
    
    // PASO 8: Actualizar reserva a completada
    await Reservation.findByIdAndUpdate(session.reservationId, {
      status: 'completed'
    });
    
    // PASO 9: Notificar a ambos usuarios
    const durationMinutes = sessionData?.duration || 0;
    const durationText = durationMinutes >= 60 
      ? `${Math.floor(durationMinutes / 60)}h ${Math.round(durationMinutes % 60)}min`
      : `${Math.round(durationMinutes)} minutos`;
    
    await Notification.create([
      {
        userId: session.adminId,
        type: 'charging_completed',
        message: `Carga completada: ${session.energyDelivered.toFixed(2)} kWh en ${durationText}. Costo total: $${totalCost.toFixed(2)}`,
        relatedChargerId: session.chargerId,
        relatedSessionId: session._id,
        read: false
      },
      {
        userId: session.userId,
        type: 'charging_completed',
        message: `Gracias por cargar con nosotros. Has cargado ${session.energyDelivered.toFixed(2)} kWh en ${durationText}. Costo total: $${totalCost.toFixed(2)}`,
        relatedChargerId: session.chargerId,
        relatedSessionId: session._id,
        read: false
      }
    ]);
    
    res.json({ 
      success: true, 
      session,
      finalSession,
      message: `Carga completada: ${session.energyDelivered.toFixed(2)} kWh en ${durationText}`
    });
  } catch (error) {
    console.error('Error deteniendo carga:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/charging-sessions/:id/cancel
 * Cancelar sesión de carga activa
 * 
 * Body: { cancelledBy: 'admin' | 'user' | 'system', reason: string }
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { cancelledBy, reason } = req.body;
    
    // PASO 1: Buscar sesión activa
    const session = await ChargingSessionActive.findById(id);
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        error: 'Sesión de carga no encontrada' 
      });
    }
    
    // PASO 2: Verificar que no está completada
    if (session.status === 'completed') {
      return res.status(400).json({ 
        success: false, 
        error: 'La sesión ya está completada' 
      });
    }
    
    // PASO 3: Si está cargando, detener simulador
    if (session.status === 'charging') {
      await simulatorController.forceStopSession(session.chargerId.toString());
    }
    
    // PASO 4: Actualizar sesión a cancelada
    session.status = 'cancelled';
    session.cancelledBy = cancelledBy;
    session.cancellationReason = reason;
    session.endedAt = new Date();
    await session.save();
    
    // PASO 5: Notificar a ambos usuarios
    await Notification.create([
      {
        userId: session.adminId,
        type: 'charging_cancelled',
        message: `Sesión de carga cancelada por ${cancelledBy}. Motivo: ${reason || 'No especificado'}`,
        relatedChargerId: session.chargerId,
        relatedSessionId: session._id,
        read: false
      },
      {
        userId: session.userId,
        type: 'charging_cancelled',
        message: `Sesión de carga cancelada por ${cancelledBy}. Motivo: ${reason || 'No especificado'}`,
        relatedChargerId: session.chargerId,
        relatedSessionId: session._id,
        read: false
      }
    ]);
    
    res.json({ 
      success: true, 
      session,
      message: 'Sesión de carga cancelada'
    });
  } catch (error) {
    console.error('Error cancelando carga:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/charging-sessions/:id/status
 * Obtener estado actual de una sesión de carga
 */
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    
    // PASO 1: Buscar sesión con datos poblados
    const session = await ChargingSessionActive.findById(id)
      .populate('chargerId', 'name powerOutput energy_cost parking_cost')
      .populate('vehicleId', 'model batteryCapacity')
      .populate('userId', 'name email')
      .populate('adminId', 'name email');
    
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        error: 'Sesión de carga no encontrada' 
      });
    }
    
    // PASO 2: Si está cargando, obtener datos en tiempo real del simulador
    let simulatorStatus = null;
    if (session.status === 'charging') {
      simulatorStatus = simulatorController.getSessionStatus(session.chargerId._id.toString());
    }
    
    res.json({ 
      success: true, 
      session,
      simulatorStatus
    });
  } catch (error) {
    console.error('Error obteniendo estado de carga:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/charging-sessions/active/by-reservation/:reservationId
 * Obtener sesión activa por ID de reserva
 */
router.get('/active/by-reservation/:reservationId', async (req, res) => {
  try {
    const { reservationId } = req.params;
    
    const session = await ChargingSessionActive.findOne({ 
      reservationId,
      status: { $nin: ['completed', 'cancelled'] }
    })
      .populate('chargerId', 'name powerOutput')
      .populate('vehicleId', 'model')
      .populate('userId', 'name')
      .populate('adminId', 'name');
    
    if (!session) {
      return res.json({ 
        success: true, 
        session: null,
        message: 'No hay sesión activa para esta reserva'
      });
    }
    
    res.json({ 
      success: true, 
      session
    });
  } catch (error) {
    console.error('Error buscando sesión por reserva:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/charging-sessions/active/by-charger/:chargerId
 * Obtener sesión activa por ID de cargador
 */
router.get('/active/by-charger/:chargerId', async (req, res) => {
  try {
    const { chargerId } = req.params;
    
    const session = await ChargingSessionActive.findOne({ 
      chargerId,
      status: { $nin: ['completed', 'cancelled'] }
    })
      .populate('vehicleId', 'model')
      .populate('userId', 'name')
      .populate('adminId', 'name');
    
    if (!session) {
      return res.json({ 
        success: true, 
        session: null,
        message: 'No hay sesión activa para este cargador'
      });
    }
    
    res.json({ 
      success: true, 
      session
    });
  } catch (error) {
    console.error('Error buscando sesión por cargador:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
