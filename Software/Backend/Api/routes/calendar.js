const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const Charger = require('../models/Charger');
const ChargingSession = require('../models/ChargingSession');
const Reservation = require('../models/Reservation');
const moment = require('moment');

// Calendario para un vehículo específico
router.get('/vehicle/:vehicleId', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const vehicleId = req.params.vehicleId;
    
    // Verificar que el vehículo existe
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }
    
    // Construir filtro de fecha
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        $or: [
          {
            startTime: { $gte: new Date(startDate), $lte: new Date(endDate) }
          },
          {
            endTime: { $gte: new Date(startDate), $lte: new Date(endDate) }
          }
        ]
      };
    }
    
    // Obtener sesiones de carga
    const sessions = await ChargingSession.find({
      vehicleId,
      ...dateFilter
    })
    .populate('chargerId', 'name location')
    .sort({ startTime: 1 });
    
    // Obtener reservaciones
    const reservations = await Reservation.find({
      vehicleId,
      ...dateFilter
    })
    .populate('chargerId', 'name location')
    .sort({ startTime: 1 });
    
    // Combinar y formatear eventos para el calendario
    const events = [
      ...sessions.map(session => ({
        id: session._id,
        title: `Carga: ${session.chargerId.name}`,
        start: session.startTime,
        end: session.endTime,
        type: 'session',
        energy: session.energyDelivered,
        duration: session.duration,
        charger: session.chargerId
      })),
      ...reservations.map(reservation => ({
        id: reservation._id,
        title: `Reserva: ${reservation.chargerId.name}`,
        start: reservation.startTime,
        end: reservation.calculatedEndTime,
        type: 'reservation',
        status: reservation.status,
        charger: reservation.chargerId
      }))
    ].sort((a, b) => a.start - b.start);
    
    res.json({
      vehicle,
      events
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calendario para un cargador específico
router.get('/charger/:chargerId', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const chargerId = req.params.chargerId;
    
    // Verificar que el cargador existe
    const charger = await Charger.findById(chargerId);
    if (!charger) {
      return res.status(404).json({ error: 'Cargador no encontrado' });
    }
    
    // Construir filtro de fecha
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        $or: [
          {
            startTime: { $gte: new Date(startDate), $lte: new Date(endDate) }
          },
          {
            endTime: { $gte: new Date(startDate), $lte: new Date(endDate) }
          }
        ]
      };
    }
    
    // Obtener sesiones de carga
    const sessions = await ChargingSession.find({
      chargerId,
      ...dateFilter
    })
    .populate('vehicleId', 'model chargerType')
    .sort({ startTime: 1 });
    
    // Obtener reservaciones
    const reservations = await Reservation.find({
      chargerId,
      ...dateFilter
    })
    .populate('vehicleId', 'model')
    .populate('userId', 'name')
    .sort({ startTime: 1 });
    
    // Combinar y formatear eventos para el calendario
    const events = [
      ...sessions.map(session => ({
        id: session._id,
        title: `Carga: ${session.vehicleId.model}`,
        start: session.startTime,
        end: session.endTime,
        type: 'session',
        energy: session.energyDelivered,
        duration: session.duration,
        vehicle: session.vehicleId
      })),
      ...reservations.map(reservation => ({
        id: reservation._id,
        title: `Reserva: ${reservation.vehicleId.model}`,
        start: reservation.startTime,
        end: reservation.calculatedEndTime,
        type: 'reservation',
        status: reservation.status,
        vehicle: reservation.vehicleId,
        user: reservation.userId
      }))
    ].sort((a, b) => a.start - b.start);
    
    // Calcular disponibilidad futura
    const availability = [];
    const now = new Date();
    const futureEnd = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 días en el futuro
    
    // Agrupar eventos por día
    const eventsByDay = {};
    events.forEach(event => {
      const day = moment(event.start).format('YYYY-MM-DD');
      if (!eventsByDay[day]) {
        eventsByDay[day] = [];
      }
      eventsByDay[day].push(event);
    });
    
    // Generar disponibilidad para los próximos 7 días
    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getTime() + (i * 24 * 60 * 60 * 1000));
      const dayStr = moment(date).format('YYYY-MM-DD');
      const dayEvents = eventsByDay[dayStr] || [];
      
      // Calcular horas ocupadas
      const busySlots = [];
      dayEvents.forEach(event => {
        busySlots.push({
          start: moment(event.start).format('HH:mm'),
          end: moment(event.end).format('HH:mm')
        });
      });
      
      availability.push({
        date: dayStr,
        busySlots,
        available: 24 - busySlots.reduce((total, slot) => {
          const start = moment(slot.start, 'HH:mm');
          const end = moment(slot.end, 'HH:mm');
          return total + end.diff(start, 'hours', true);
        }, 0)
      });
    }
    
    res.json({
      charger,
      events,
      availability
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Disponibilidad de un cargador para reservación
router.get('/charger/:chargerId/availability', async (req, res) => {
  try {
    const { date } = req.query;
    const chargerId = req.params.chargerId;
    
    if (!date) {
      return res.status(400).json({ error: 'Se requiere parámetro de fecha' });
    }
    
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
    
    // Obtener eventos para ese día
    const sessions = await ChargingSession.find({
      chargerId,
      $or: [
        {
          startTime: { $gte: startOfDay, $lte: endOfDay }
        },
        {
          endTime: { $gte: startOfDay, $lte: endOfDay }
        }
      ]
    });
    
    const reservations = await Reservation.find({
      chargerId,
      $or: [
        {
          startTime: { $gte: startOfDay, $lte: endOfDay }
        },
        {
          calculatedEndTime: { $gte: startOfDay, $lte: endOfDay }
        }
      ]
    });
    
    // Combinar eventos
    const events = [
      ...sessions.map(s => ({ start: s.startTime, end: s.endTime })),
      ...reservations.map(r => ({ start: r.startTime, end: r.calculatedEndTime }))
    ];
    
    // Generar slots de disponibilidad (cada 30 minutos)
    const timeSlots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotStart = new Date(startOfDay);
        slotStart.setHours(hour, minute, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotStart.getMinutes() + 30);
        
        // Verificar si el slot está disponible
        const isAvailable = !events.some(event => 
          (slotStart >= event.start && slotStart < event.end) ||
          (slotEnd > event.start && slotEnd <= event.end) ||
          (slotStart <= event.start && slotEnd >= event.end)
        );
        
        timeSlots.push({
          start: slotStart,
          end: slotEnd,
          available: isAvailable
        });
      }
    }
    
    res.json({
      date: startOfDay.toISOString().split('T')[0],
      timeSlots
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear una nueva reserva
router.post('/reservation', async (req, res) => {
  try {
    const {
      vehicleId,
      chargerId,
      userId,
      startTime,
      endTime,
      calculatedEndTime,
      status,
      estimatedChargeTime,
      bufferTime
    } = req.body;

    // Validar campos requeridos
    if (!vehicleId || !chargerId || !userId || !startTime || !endTime || !calculatedEndTime) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // Crear la reserva
    const reservation = new Reservation({
      vehicleId,
      chargerId,
      userId,
      startTime,
      endTime,
      calculatedEndTime,
      status: status || 'upcoming',
      estimatedChargeTime,
      bufferTime
    });
    await reservation.save();
    res.status(201).json(reservation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;