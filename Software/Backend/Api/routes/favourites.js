const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Charger = require('../models/Charger');
// Reutilizar el middleware de autenticación definido en routes/auth.js
const { authenticateToken } = require('./auth');

// Helper: permiso (propietario o admin)
function hasPermission(reqUser, targetUserId) {
  if (!reqUser) return false;
  if (reqUser.role === 'app_admin' || reqUser.role === 'station_admin') return true;
  return String(reqUser.userId) === String(targetUserId);
}

// GET /api/favourites/:userId -> obtener estaciones favoritas del usuario
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!hasPermission(req.user, userId)) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const user = await User.findById(userId).populate('favoriteStations');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.json({ favoriteStations: user.favoriteStations || [] });
  } catch (err) {
    console.error('Error GET favourites:', err);
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

// POST /api/favourites/:userId/:stationId -> agregar estación a favoritos
router.post('/:userId/:stationId', authenticateToken, async (req, res) => {
  try {
    const { userId, stationId } = req.params;
    if (!hasPermission(req.user, userId)) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    // Validar existencia de estación
    const station = await Charger.findById(stationId);
    if (!station) return res.status(404).json({ error: 'Estación no encontrada' });

    // Agregar sin duplicados
    const updated = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { favoriteStations: station._id } },
      { new: true }
    ).populate('favoriteStations').select('-password');

    if (!updated) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.status(200).json({ favoriteStations: updated.favoriteStations });
  } catch (err) {
    console.error('Error POST favourites:', err);
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

// DELETE /api/favourites/:userId/:stationId -> quitar estación de favoritos
router.delete('/:userId/:stationId', authenticateToken, async (req, res) => {
  try {
    const { userId, stationId } = req.params;
    if (!hasPermission(req.user, userId)) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const updated = await User.findByIdAndUpdate(
      userId,
      { $pull: { favoriteStations: stationId } },
      { new: true }
    ).populate('favoriteStations').select('-password');

    if (!updated) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.status(200).json({ favoriteStations: updated.favoriteStations });
  } catch (err) {
    console.error('Error DELETE favourites:', err);
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

module.exports = router;
