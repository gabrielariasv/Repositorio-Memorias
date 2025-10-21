const express = require('express');
const router = express.Router();
const { emitToUser } = require('../utils/socket');
const Notification = require('../models/Notification');
const { authenticateToken } = require('./auth');

// GET /api/notifications - list notifications for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { onlyUnread } = req.query;
    const filter = { user: req.user.userId };
    if (String(onlyUnread) === 'true') filter.read = false;

    const items = await Notification.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications - create a notification for a user
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { userId, title, message, type = 'info', data = {} } = req.body;
    if (!userId || !title || !message) {
      return res.status(400).json({ error: 'userId, title y message son requeridos' });
    }
  const notif = await Notification.create({ user: userId, title, message, type, data });
  // Emit real-time notification to the target user
  try { emitToUser(userId, 'notification', notif); } catch (_) {}
  res.status(201).json(notif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/:id/read - mark a notification as read
router.post('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const notif = await Notification.findOneAndUpdate(
      { _id: id, user: req.user.userId },
      { $set: { read: true } },
      { new: true }
    );
    if (!notif) return res.status(404).json({ error: 'Notificación no encontrada' });
    res.json(notif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/read-all - mark all as read for current user
router.post('/read-all', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.userId, read: false }, { $set: { read: true } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
