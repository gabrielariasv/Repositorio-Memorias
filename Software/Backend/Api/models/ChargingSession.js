const mongoose = require('mongoose');

/**
 * Schema de Sesión de Carga
 * Representa una sesión de carga real o simulada de un vehículo
 * Incluye métricas de energía, tiempo y datos en tiempo real
 */
const ChargingSessionSchema = new mongoose.Schema({
  // ID original del sistema anterior (migración de datos)
  originalId: Number,
  
  // Referencias principales
  vehicleId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Vehicle' 
  },
  chargerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Charger' 
  },
  
  // Tiempos de la sesión
  startTime: Date,  // Inicio de la sesión de carga
  endTime: Date,    // Fin de la sesión de carga
  
  // Métricas de la sesión
  energyDelivered: Number,  // Energía total entregada en kWh
  duration: Number,         // Duración total en minutos
  cost: Number,            // Costo total de la sesión (energía + estacionamiento)
  
  // Datos en tiempo real durante la carga
  // Permite monitoreo y análisis del proceso de carga
  realTimeData: [{
    timestamp: Date,    // Momento de la medición
    power: Number,      // Potencia instantánea en kW
    energy: Number      // Energía acumulada hasta ese momento en kWh
  }]
});

module.exports = mongoose.model('ChargingSession', ChargingSessionSchema);