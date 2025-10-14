const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Reservation = require('../models/Reservation');
const ChargingSession = require('../models/ChargingSession');
const Charger = require('../models/Charger');
const { authenticateToken } = require('./auth');

const router = express.Router();

const requireAppAdmin = (req, res, next) => {
  if (req.user?.role !== 'app_admin') {
    return res.status(403).json({ error: 'Acceso restringido al administrador general' });
  }
  next();
};

const buildUserListQuery = (filter = {}) => User.find(filter).select('-password').populate('vehicles ownedStations');

// Listado y búsqueda de usuarios
router.get('/', authenticateToken, requireAppAdmin, async (req, res) => {
  try {
    const { search, role, limit = 20 } = req.query;
    const filter = {};

    if (role) {
      filter.role = role;
    }

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: regex },
        { email: regex }
      ];
    }

    const users = await buildUserListQuery(filter)
      .limit(Math.min(parseInt(limit, 10) || 20, 100));

    res.json(users);
  } catch (error) {
    console.error('Error al buscar usuarios:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener detalle de usuario
router.get('/:id', authenticateToken, requireAppAdmin, async (req, res) => {
  try {
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

// Reservas activas de un usuario
router.get('/:id/reservations', authenticateToken, requireAppAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('_id');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const reservations = await Reservation.find({ userId: req.params.id })
      .populate('vehicleId', 'model chargerType')
      .populate('chargerId', 'name location')
      .sort({ startTime: 1 });

    res.json(reservations);
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancelar (eliminar) una reserva específica del usuario
router.delete('/:id/reservations/:reservationId', authenticateToken, requireAppAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { reservationId } = req.params;

    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    if (reservation.userId?.toString() !== userId) {
      return res.status(400).json({ error: 'La reserva no corresponde al usuario indicado' });
    }

    await Reservation.deleteOne({ _id: reservationId });

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

// Historial de sesiones de un usuario
router.get('/:id/history', authenticateToken, requireAppAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select('_id');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const vehicles = await Vehicle.find({ userId }).select('_id model chargerType');
    const vehicleIds = vehicles.map((vehicle) => vehicle._id);

    if (!vehicleIds.length) {
      return res.json([]);
    }

    const sessions = await ChargingSession.find({ vehicleId: { $in: vehicleIds } })
      .populate('vehicleId', 'model chargerType')
      .populate('chargerId', 'name location')
      .sort({ startTime: -1 });

    res.json(sessions);
  } catch (error) {
    console.error('Error al obtener historial de usuario:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar datos del usuario
router.put('/:id', authenticateToken, requireAppAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (typeof name === 'string') {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({ error: 'El nombre no puede estar vacío' });
      }
      user.name = trimmedName;
    }

    if (typeof email === 'string') {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) {
        return res.status(400).json({ error: 'El correo no puede estar vacío' });
      }
      const existingEmailUser = await User.findOne({ email: trimmedEmail, _id: { $ne: user._id } });
      if (existingEmailUser) {
        return res.status(409).json({ error: 'El correo ya está siendo utilizado por otro usuario' });
      }
      user.email = trimmedEmail;
    }

    if (typeof password === 'string' && password.trim()) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

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
