const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: 'info' }, // info | warning | success | error
    data: { type: Object, default: {} },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
