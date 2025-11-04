const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const ChargingSession = require('../models/ChargingSession');
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const { authenticateToken } = require('./auth');

/**
 * GET /api/vehicles/user/:userId
 * Obtener todos los vehículos de un usuario específico
 */
router.get('/user/:userId', async (req, res) => {
  try {
    // PASO 1: Buscar vehículos del usuario con información relacionada
    const vehicles = await Vehicle.find({ userId: req.params.userId })
      .populate('userId', 'name email')
      .populate('chargingHistory.chargerId', 'name location');
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/vehicles
 * Obtener todos los vehículos del sistema con datos poblados
 */
router.get('/', async (req, res) => {
  try {
    // PASO 1: Buscar todos los vehículos con información del propietario e historial
    const vehicles = await Vehicle.find()
      .populate('userId', 'name email')
      .populate('chargingHistory.chargerId', 'name location');
    
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/vehicles
 * Crear un nuevo vehículo y asociarlo a un usuario
 * Mantiene sincronización bidireccional Usuario <-> Vehículo
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      userId,
      model,
      chargerType,
      batteryCapacity,
      currentChargeLevel = 0
    } = req.body;

    // VALIDACIÓN 1: Verificar campos requeridos
    if (!userId || !model || !chargerType || batteryCapacity == null) {
      return res.status(400).json({ error: 'Datos del vehículo incompletos' });
    }

    // VALIDACIÓN 2: Verificar permisos (solo admin o propietario)
    if (req.user.role !== 'app_admin' && userId !== req.user.userId) {
      return res.status(403).json({ error: 'No tienes permiso para crear vehículos para este usuario' });
    }

    // PASO 1: Verificar que el usuario propietario existe
    const owner = await User.findById(userId);
    if (!owner) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // PASO 2: Crear el vehículo con datos sanitizados
    const vehicle = await Vehicle.create({
      userId,
      model: model.trim(),
      chargerType,
      batteryCapacity,
      currentChargeLevel
    });

    // PASO 3: Agregar el vehículo al array del usuario (evitando duplicados)
    if (!owner.vehicles.includes(vehicle._id)) {
      owner.vehicles.push(vehicle._id);
      await owner.save();
    }

    // PASO 4: Retornar vehículo creado con datos del propietario
    const populatedVehicle = await Vehicle.findById(vehicle._id)
      .populate('userId', 'name email');

    res.status(201).json(populatedVehicle);
  } catch (error) {
    console.error('Error al crear vehículo:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/vehicles/:id
 * Obtener detalles completos de un vehículo específico
 */
router.get('/:id', async (req, res) => {
  try {
    // PASO 1: Buscar vehículo con información del propietario e historial
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

/**
 * GET /api/vehicles/:id/charging-history
 * Obtener historial de sesiones de carga con filtros opcionales
 * Soporta filtrado por rango de fechas y límite de resultados
 */
router.get('/:id/charging-history', async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;
    let filter = { vehicleId: req.params.id };
    
    // PASO 1: Aplicar filtro de rango de fechas si se proporciona
    if (startDate && endDate) {
      filter.startTime = {
        $gte: new Date(startDate), // Mayor o igual a fecha inicio
        $lte: new Date(endDate)    // Menor o igual a fecha fin
      };
    }
    
    // PASO 2: Construir query con información del cargador
    let query = ChargingSession.find(filter)
      .populate('chargerId', 'name location powerOutput')
      .sort({ startTime: -1 }); // Más recientes primero
    
    // PASO 3: Aplicar límite si se especifica
    if (limit) {
      query = query.limit(parseInt(limit));
    }
    
    const sessions = await query;
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/vehicles/:id
 * Eliminar un vehículo y removerlo del array del usuario
 * Mantiene integridad referencial bidireccional
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // PASO 1: Buscar el vehículo a eliminar
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }

    // VALIDACIÓN: Verificar permisos (admin o propietario)
    if (req.user.role !== 'app_admin' && vehicle.userId?.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este vehículo' });
    }

    // PASO 2: Eliminar el vehículo de la base de datos
    await Vehicle.deleteOne({ _id: vehicle._id });

    // PASO 3: Remover referencia del array de vehículos del usuario usando $pull
    if (vehicle.userId) {
      await User.updateOne(
        { _id: vehicle.userId },
        { $pull: { vehicles: vehicle._id } }
      );
    }

    res.json({ message: 'Vehículo eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar vehículo:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/vehicles/:id/energy-stats
 * Estadísticas energéticas con agrupación dinámica por período
 * Períodos: day (día), week (semana), month (mes), year (año)
 */
router.get('/:id/energy-stats', async (req, res) => {
  try {
    const { period } = req.query;
    
    // PASO 1: Definir formato de agrupación según el período solicitado
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
        // Por defecto agrupa por mes
        groupFormat = {
          year: { $year: '$startTime' },
          month: { $month: '$startTime' }
        };
    }
    
    // PASO 2: Ejecutar agregación de MongoDB para calcular estadísticas
    const energyStats = await ChargingSession.aggregate([
      { 
        // Filtrar sesiones del vehículo específico
        $match: { vehicleId: mongoose.Types.ObjectId(req.params.id) } 
      },
      {
        // Agrupar por período y calcular métricas
        $group: {
          _id: groupFormat,
          totalEnergy: { $sum: '$energyDelivered' },
          sessionCount: { $sum: 1 },
          avgDuration: { $avg: '$duration' }
        }
      },
      { 
        // Ordenar cronológicamente
        $sort: { '_id.year': 1, '_id.month': 1 } 
      }
    ]);
    
    res.json(energyStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/vehicles/:id/actual
 * Obtener reservas futuras/actuales de un vehículo
 * Solo retorna reservas cuyo endTime no ha pasado
 */
router.get('/:id/actual', async (req, res) => {
  try {
    const now = new Date();
    
    // PASO 1: Buscar reservas futuras del vehículo
    const reservations = await Reservation.find({
      vehicleId: req.params.id,
      endTime: { $gt: now } // Solo reservas que no han terminado
    })
      .populate('chargerId', 'name location')
      .sort({ startTime: 1 }); // Ordenar por inicio ascendente
      
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;