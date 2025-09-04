const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  originalId: Number,
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['app_admin', 'station_admin', 'ev_user'] },
  ownedStations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Charger' }],
  vehicles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);