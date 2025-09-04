const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  chargerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Charger' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  startTime: Date,
  endTime: Date,
  calculatedEndTime: Date,
  status: { type: String, enum: ['upcoming', 'active', 'completed', 'cancelled'] },
  estimatedChargeTime: Number,
  bufferTime: Number
});

module.exports = mongoose.model('Reservation', ReservationSchema);