const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  originalId: Number,
  model: String,
  chargerType: { type: String, enum: ['Type1', 'Type2', 'CCS', 'CHAdeMO', 'Tesla'] },
  batteryCapacity: Number,
  currentChargeLevel: Number,
  chargingHistory: [{
    startTime: Date,
    endTime: Date,
    duration: Number,
    energyDelivered: Number,
    chargerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Charger' },
    sessionId: Number
  }]
});

module.exports = mongoose.model('Vehicle', VehicleSchema);