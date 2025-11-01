const mongoose = require('mongoose');

const ChargerSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  originalId: Number,
  name: String,
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number]
  },
  chargerType: { type: String, enum: ['Type1', 'Type2', 'CCS', 'CHAdeMO', 'Tesla'] },
  powerOutput: Number,
  energy_cost: { type: Number, min: 0 },
  status: { type: String, enum: ['available', 'occupied', 'maintenance'], default: 'available' },
  occupancyHistory: [{
    start: Date,
    end: Date,
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChargingSession' },
    occupied: Boolean
  }],
  chargingHistory: [{
    startTime: Date,
    endTime: Date,
    duration: Number,
    energyDelivered: Number,
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    sessionId: Number
  }],
  reservations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reservation' }]
});

ChargerSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Charger', ChargerSchema);