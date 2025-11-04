const mongoose = require('mongoose');

/**
 * Schema de Estación de Carga (Charger)
 * Representa puntos de carga para vehículos eléctricos
 * Incluye geolocalización, historial y reservas
 */
const ChargerSchema = new mongoose.Schema({
  // Referencia al usuario propietario de la estación
  ownerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  // ID original del sistema anterior (migración de datos)
  originalId: Number,
  
  // Nombre descriptivo de la estación
  name: String,
  
  // Ubicación geográfica usando formato GeoJSON
  location: {
    type: { 
      type: String, 
      default: 'Point' // Tipo de geometría GeoJSON
    },
    coordinates: [Number] // [longitud, latitud] - IMPORTANTE: orden inverso a lat/lng
  },
  
  // Tipo de conector disponible en la estación
  chargerType: { 
    type: String, 
    enum: ['Type1', 'Type2', 'CCS', 'CHAdeMO', 'Tesla']
  },
  
  // Potencia de salida en kW
  powerOutput: Number,
  
  // Costo de energía por kWh
  energy_cost: { 
    type: Number, 
    min: 0 
  },
  
  // Costo de estacionamiento por hora
  parking_cost: { 
    type: Number, 
    min: 0 
  },
  
  // Estado actual de la estación
  status: { 
    type: String, 
    enum: ['available', 'occupied', 'maintenance'], 
    default: 'available'
  },
  
  // Historial de ocupación de la estación
  occupancyHistory: [{
    start: Date,                    // Inicio del período
    end: Date,                      // Fin del período
    sessionId: {                    // Sesión asociada
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'ChargingSession' 
    },
    occupied: Boolean               // Estado de ocupación
  }],
  
  // Historial de sesiones de carga realizadas
  chargingHistory: [{
    startTime: Date,                // Inicio de carga
    endTime: Date,                  // Fin de carga
    duration: Number,               // Duración en minutos
    energyDelivered: Number,        // Energía entregada en kWh
    vehicleId: {                    // Vehículo que cargó
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Vehicle' 
    },
    sessionId: Number               // ID de sesión
  }],
  
  // Referencias a reservas activas/futuras
  reservations: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Reservation' 
  }]
});

// Índice geoespacial 2dsphere para búsquedas de proximidad
// Permite usar $near, $geoWithin, etc.
ChargerSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Charger', ChargerSchema);