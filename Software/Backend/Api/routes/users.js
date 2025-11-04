const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Reservation = require('../models/Reservation');
const ChargingSession = require('../models/ChargingSession');
const Charger = require('../models/Charger');
const { authenticateToken } = require('./auth');

const router = express.Router();

/**
 * Middleware: Verificar que el usuario es app_admin
 * Restringe acceso a endpoints administrativos
 */
const requireAppAdmin = (req, res, next) => {
  if (req.user?.role !== 'app_admin') {
    return res.status(403).json({ error: 'Acceso restringido al administrador general' });
  }
  next();
};

/**
 * Función auxiliar para construir query de lista de usuarios
 * Excluye password y popula vehículos y estaciones
 */
const buildUserListQuery = (filter = {}) => User.find(filter).select('-password').populate('vehicles ownedStations');

/**
 * GET /api/users
 * Listado y búsqueda de usuarios (solo app_admin)
 * Soporta búsqueda por nombre/email y filtro por rol
 */
router.get('/', authenticateToken, requireAppAdmin, async (req, res) => {
  try {
    const { search, role, limit = 20 } = req.query;
    const filter = {};

    // PASO 1: Aplicar filtro por rol si se especifica
    if (role) {
      filter.role = role;
    }

    // PASO 2: Aplicar búsqueda por nombre o email usando regex
    if (search) {
      const regex = new RegExp(search.trim(), 'i'); // Case-insensitive
      filter.$or = [
        { name: regex },
        { email: regex }
      ];
    }

    // PASO 3: Ejecutar búsqueda con límite (máx 100 resultados)
    const users = await buildUserListQuery(filter)
      .limit(Math.min(parseInt(limit, 10) || 20, 100));

    res.json(users);
  } catch (error) {
    console.error('Error al buscar usuarios:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/users/:id
 * Obtener detalle completo de un usuario (solo app_admin)
 */
router.get('/:id', authenticateToken, requireAppAdmin, async (req, res) => {
  try {
    // PASO 1: Buscar usuario con datos poblados, excluyendo password
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('vehicles ownedStations');

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/users/:id/reservations
 * Obtener todas las reservas de un usuario (solo app_admin)
 */
router.get('/:id/reservations', authenticateToken, requireAppAdmin, async (req, res) => {
  try {
    // VALIDACIÓN: Verificar que el usuario existe
    const user = await User.findById(req.params.id).select('_id');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // PASO 1: Buscar todas las reservas del usuario con datos poblados
    const reservations = await Reservation.find({ userId: req.params.id })
      .populate('vehicleId', 'model chargerType')
      .populate('chargerId', 'name location')
      .sort({ startTime: 1 }); // Ordenar por inicio ascendente

    res.json(reservations);
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/users/:id/reservations/:reservationId
 * Cancelar una reserva específica de un usuario (solo app_admin)
 * Mantiene sincronización con el cargador
 */
router.delete('/:id/reservations/:reservationId', authenticateToken, requireAppAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { reservationId } = req.params;

    // PASO 1: Buscar la reserva a cancelar
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    // VALIDACIÓN: Verificar que la reserva pertenece al usuario indicado
    if (reservation.userId?.toString() !== userId) {
      return res.status(400).json({ error: 'La reserva no corresponde al usuario indicado' });
    }

    // PASO 2: Eliminar la reserva
    await Reservation.deleteOne({ _id: reservationId });

    // PASO 3: Remover referencia del array de reservas del cargador
    if (reservation.chargerId) {
      await Charger.updateOne(
        { _id: reservation.chargerId },
        { $pull: { reservations: reservation._id } }
      );
    }

    res.json({ message: 'Reserva cancelada correctamente' });
  } catch (error) {
    console.error('Error al cancelar reserva:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/users/:id/history
 * Obtener historial de sesiones de carga de todos los vehículos del usuario
 * Query multietapa: Usuario -> Vehículos -> Sesiones
 */
router.get('/:id/history', authenticateToken, requireAppAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // VALIDACIÓN: Verificar que el usuario existe
    const user = await User.findById(userId).select('_id');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // PASO 1: Obtener todos los vehículos del usuario
    const vehicles = await Vehicle.find({ userId }).select('_id model chargerType');
    const vehicleIds = vehicles.map((vehicle) => vehicle._id);

    // PASO 2: Si no tiene vehículos, retornar array vacío
    if (!vehicleIds.length) {
      return res.json([]);
    }

    // PASO 3: Buscar sesiones de todos sus vehículos usando $in
    const sessions = await ChargingSession.find({ vehicleId: { $in: vehicleIds } })
      .populate('vehicleId', 'model chargerType')
      .populate('chargerId', 'name location')
      .sort({ startTime: -1 }); // Más recientes primero

    res.json(sessions);
  } catch (error) {
    console.error('Error al obtener historial de usuario:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/users/:id
 * Actualizar datos de un usuario (solo app_admin)
 * Permite actualizar nombre, email y contraseña con validaciones
 */
router.put('/:id', authenticateToken, requireAppAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // PASO 1: Buscar el usuario a actualizar
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // PASO 2: Actualizar nombre si se proporciona
    if (typeof name === 'string') {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({ error: 'El nombre no puede estar vacío' });
      }
      user.name = trimmedName;
    }

    // PASO 3: Actualizar email con validación de unicidad
    if (typeof email === 'string') {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) {
        return res.status(400).json({ error: 'El correo no puede estar vacío' });
      }
      // Verificar que el email no esté en uso por otro usuario
      const existingEmailUser = await User.findOne({ email: trimmedEmail, _id: { $ne: user._id } });
      if (existingEmailUser) {
        return res.status(409).json({ error: 'El correo ya está siendo utilizado por otro usuario' });
      }
      user.email = trimmedEmail;
    }

    // PASO 4: Actualizar contraseña con hash si se proporciona
    if (typeof password === 'string' && password.trim()) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    // PASO 5: Guardar cambios y retornar usuario actualizado sin password
    await user.save();

    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('vehicles ownedStations');
    res.json({
      message: 'Usuario actualizado correctamente',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
