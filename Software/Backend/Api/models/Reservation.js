const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  chargerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Charger' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  startTime: Date,
  endTime: Date,
  calculatedEndTime: Date,
  status: { type: String, enum: ['upcoming', 'active', 'completed', 'cancelled'], default: 'upcoming' },
  estimatedChargeTime: Number,
  bufferTime: Number,
  // Workflow fields
  acceptanceStatus: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  cancelledBy: { type: String, enum: ['user', 'owner', 'system'], default: undefined },
  cancellationReason: { type: String, enum: ['indisponibilidad', 'mantenimiento', 'falta_tiempo', 'otro'], default: undefined },
  preNotified: { type: Boolean, default: false },
  startNotified: { type: Boolean, default: false }
});

module.exports = mongoose.model('Reservation', ReservationSchema);