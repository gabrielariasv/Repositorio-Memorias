const mongoose = require('mongoose');

/**
 * Schema de Vehículo Eléctrico
 * Representa vehículos eléctricos registrados en el sistema
 * Incluye información técnica y historial de carga
 */
const VehicleSchema = new mongoose.Schema({
  // Referencia al usuario propietario del vehículo
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  // ID original del sistema anterior (migración de datos)
  originalId: Number,
  
  // Modelo/marca del vehículo
  model: String,
  
  // Tipo de conector de carga compatible
  chargerType: { 
    type: String, 
    enum: ['Type1', 'Type2', 'CCS', 'CHAdeMO', 'Tesla']
    // Type1: SAE J1772 (América del Norte)
    // Type2: IEC 62196 (Europa)
    // CCS: Combined Charging System (carga rápida)
    // CHAdeMO: Estándar japonés (carga rápida)
    // Tesla: Conector propietario de Tesla
  },
  
  // Capacidad total de la batería en kWh
  batteryCapacity: Number,
  
  // Nivel actual de carga (0-100 o kWh dependiendo de implementación)
  currentChargeLevel: Number,
  
  // Historial de sesiones de carga del vehículo
  chargingHistory: [{
    startTime: Date,          // Inicio de la sesión
    endTime: Date,            // Fin de la sesión
    duration: Number,         // Duración en minutos
    energyDelivered: Number,  // Energía entregada en kWh
    chargerId: {              // Cargador utilizado
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Charger' 
    },
    sessionId: Number         // ID de la sesión
  }]
});

module.exports = mongoose.model('Vehicle', VehicleSchema);