const mongoose = require('mongoose');

/**
 * Schema de Usuario
 * Modelo central del sistema que representa a todos los tipos de usuarios
 * Soporta tres roles: app_admin, station_admin, ev_user
 */
const UserSchema = new mongoose.Schema({
  // ID original del sistema anterior (migración de datos)
  originalId: Number,
  
  // Información básica del usuario
  name: String,
  email: { 
    type: String, 
    unique: true // Índice único para evitar duplicados
  },
  password: String, // Hash bcrypt almacenado
  
  // Rol del usuario en el sistema
  role: { 
    type: String, 
    enum: ['app_admin', 'station_admin', 'ev_user']
    // app_admin: Administrador general del sistema
    // station_admin: Administrador de estaciones de carga
    // ev_user: Usuario propietario de vehículos eléctricos
  },
  
  // Referencias a estaciones de carga propiedad del usuario (station_admin)
  ownedStations: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Charger' 
  }],
  
  // Referencias a vehículos del usuario (ev_user)
  vehicles: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Vehicle' 
  }],
  
  // Referencias a estaciones marcadas como favoritas
  favoriteStations: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Charger' 
  }],
  
  // Fecha de creación del registro
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('User', UserSchema);