const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Charger = require('../models/Charger');
const { authenticateToken } = require('./auth');

/**
 * Función auxiliar para verificar permisos
 * Permite acceso al propietario, station_admin o app_admin
 * @param {Object} reqUser - Usuario del token (req.user)
 * @param {string} targetUserId - ID del usuario objetivo
 * @returns {boolean} true si tiene permiso
 */
function hasPermission(reqUser, targetUserId) {
  if (!reqUser) return false;
  if (reqUser.role === 'app_admin' || reqUser.role === 'station_admin') return true;
  return String(reqUser.userId) === String(targetUserId);
}

/**
 * GET /api/favourites/:userId
 * Obtener lista de estaciones favoritas de un usuario
 * Requiere autenticación y permisos adecuados
 */
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // VALIDACIÓN: Verificar permisos de acceso
    if (!hasPermission(req.user, userId)) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    
    // PASO 1: Buscar usuario y popular sus estaciones favoritas
    const user = await User.findById(userId).populate('favoriteStations');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    
    return res.json({ favoriteStations: user.favoriteStations || [] });
  } catch (err) {
    console.error('Error GET favourites:', err);
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

/**
 * POST /api/favourites/:userId/:stationId
 * Agregar una estación a la lista de favoritos del usuario
 * Usa $addToSet para evitar duplicados automáticamente
 */
router.post('/:userId/:stationId', authenticateToken, async (req, res) => {
  try {
    const { userId, stationId } = req.params;
    
    // VALIDACIÓN 1: Verificar permisos de acceso
    if (!hasPermission(req.user, userId)) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    
    // VALIDACIÓN 2: Verificar que la estación existe
    const station = await Charger.findById(stationId);
    if (!station) return res.status(404).json({ error: 'Estación no encontrada' });

    // PASO 1: Agregar a favoritos sin duplicados usando $addToSet
    // $addToSet solo agrega si el elemento no existe en el array
    const updated = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { favoriteStations: station._id } },
      { new: true } // Retornar documento actualizado
    ).populate('favoriteStations').select('-password');

    if (!updated) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.status(200).json({ favoriteStations: updated.favoriteStations });
  } catch (err) {
    console.error('Error POST favourites:', err);
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

/**
 * DELETE /api/favourites/:userId/:stationId
 * Eliminar una estación de la lista de favoritos del usuario
 * Usa $pull para remover el elemento del array
 */
router.delete('/:userId/:stationId', authenticateToken, async (req, res) => {
  try {
    const { userId, stationId } = req.params;
    
    // VALIDACIÓN: Verificar permisos de acceso
    if (!hasPermission(req.user, userId)) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    
    // PASO 1: Eliminar de favoritos usando $pull
    // $pull remueve todas las instancias que coincidan con el valor
    const updated = await User.findByIdAndUpdate(
      userId,
      { $pull: { favoriteStations: stationId } },
      { new: true } // Retornar documento actualizado
    ).populate('favoriteStations').select('-password');

    if (!updated) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.status(200).json({ favoriteStations: updated.favoriteStations });
  } catch (err) {
    console.error('Error DELETE favourites:', err);
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

module.exports = router;
