const express = require('express');
const router = express.Router();
const { emitToUser } = require('../utils/socket');
const Notification = require('../models/Notification');
const { authenticateToken } = require('./auth');

/**
 * GET /api/notifications
 * Obtener lista de notificaciones del usuario autenticado
 * Soporta filtrado por estado de lectura
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { onlyUnread } = req.query;
    
    // PASO 1: Construir filtro base por usuario
    const filter = { user: req.user.userId };
    
    // PASO 2: Aplicar filtro de no leídas si se solicita
    if (String(onlyUnread) === 'true') filter.read = false;

    // PASO 3: Buscar notificaciones ordenadas por fecha (más recientes primero)
    const items = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(100); // Máximo 100 notificaciones
      
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications
 * Crear una nueva notificación para un usuario
 * Envía notificación en tiempo real mediante WebSocket
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { userId, title, message, type = 'info', data = {} } = req.body;
    
    // VALIDACIÓN: Verificar campos requeridos
    if (!userId || !title || !message) {
      return res.status(400).json({ error: 'userId, title y message son requeridos' });
    }
    
    // PASO 1: Crear notificación en base de datos
    const notif = await Notification.create({ 
      user: userId, 
      title, 
      message, 
      type, 
      data 
    });
    
    // PASO 2: Enviar notificación en tiempo real vía Socket.IO
    // Se ignora si falla (usuario desconectado)
    try { 
      emitToUser(userId, 'notification', notif); 
    } catch (_) {}
    
    res.status(201).json(notif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/:id/read
 * Marcar una notificación específica como leída
 * Solo el propietario puede marcar sus propias notificaciones
 */
router.post('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // PASO 1: Actualizar estado de lectura solo si pertenece al usuario
    const notif = await Notification.findOneAndUpdate(
      { _id: id, user: req.user.userId }, // Filtro de seguridad
      { $set: { read: true } },
      { new: true } // Retornar documento actualizado
    );
    
    if (!notif) return res.status(404).json({ error: 'Notificación no encontrada' });
    res.json(notif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/read-all
 * Marcar todas las notificaciones del usuario como leídas
 * Operación en lote usando updateMany
 */
router.post('/read-all', authenticateToken, async (req, res) => {
  try {
    // PASO 1: Actualizar todas las notificaciones no leídas del usuario
    await Notification.updateMany(
      { user: req.user.userId, read: false },
      { $set: { read: true } }
    );
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/notifications/:id
 * Eliminar una notificación específica
 * Solo el propietario puede eliminar sus propias notificaciones
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // PASO 1: Eliminar solo si pertenece al usuario autenticado
    const notif = await Notification.findOneAndDelete({
      _id: id,
      user: req.user.userId // Filtro de seguridad
    });
    
    if (!notif) return res.status(404).json({ error: 'Notificación no encontrada' });
    res.json({ success: true, message: 'Notificación eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
