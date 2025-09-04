const mongoose = require('mongoose');

const ChargingSessionSchema = new mongoose.Schema({
  originalId: Number,
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  chargerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Charger' },
  startTime: Date,
  endTime: Date,
  energyDelivered: Number,
  duration: Number,
  cost: Number,
  realTimeData: [{
    timestamp: Date,
    power: Number,
    energy: Number
  }]
});

module.exports = mongoose.model('ChargingSession', ChargingSessionSchema);