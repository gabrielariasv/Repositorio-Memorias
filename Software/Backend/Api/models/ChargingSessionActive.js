const mongoose = require('mongoose');

/**
 * Schema de Sesión de Carga Activa
 * Representa una sesión de carga en progreso con confirmación dual (admin + usuario)
 * Incluye workflow de confirmación, timeouts automáticos, y seguimiento en tiempo real
 */
const ChargingSessionActiveSchema = new mongoose.Schema({
  // Referencia a la reserva que originó esta sesión
  reservationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Reservation',
    required: true
  },
  
  // Referencias principales
  chargerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Charger',
    required: true
  },
  vehicleId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Vehicle',
    required: true
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  adminId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  
  // Estado de la sesión de carga
  status: { 
    type: String, 
    enum: [
      'waiting_confirmations',  // Esperando confirmación de ambos usuarios
      'admin_confirmed',        // Solo admin ha confirmado
      'user_confirmed',         // Solo usuario ha confirmado
      'ready_to_start',         // Ambos confirmaron, listo para iniciar
      'charging',               // Carga en progreso
      'completed',              // Carga completada exitosamente
      'cancelled'               // Carga cancelada
    ], 
    default: 'waiting_confirmations'
  },
  
  // Timestamps de confirmaciones
  adminConfirmedAt: { 
    type: Date, 
    default: null 
  },
  userConfirmedAt: { 
    type: Date, 
    default: null 
  },
  
  // Timestamps del proceso de carga
  startedAt: { 
    type: Date, 
    default: null 
  },
  endedAt: { 
    type: Date, 
    default: null 
  },
  
  // Métricas de la carga en progreso
  energyDelivered: { 
    type: Number, 
    default: 0 
  },
  currentPower: { 
    type: Number, 
    default: 0 
  },
  
  // Datos en tiempo real durante la carga
  realTimeData: [{
    timestamp: Date,
    power: Number,
    energy: Number
  }],
  
  // Costo calculado (energía + estacionamiento)
  energyCost: { 
    type: Number, 
    default: 0 
  },
  parkingCost: { 
    type: Number, 
    default: 0 
  },
  totalCost: { 
    type: Number, 
    default: 0 
  },
  
  // Información de cancelación
  cancelledBy: { 
    type: String, 
    enum: ['admin', 'user', 'system'], 
    default: null
  },
  cancellationReason: { 
    type: String, 
    default: null
  },
  
  // Control de timeouts y advertencias
  timeoutWarnings: [{
    timestamp: Date,
    warningType: { 
      type: String, 
      enum: ['5min_no_confirmation', '10min_warning', '15min_auto_cancel']
    }
  }],
  
  // Timestamp de creación
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Índice para búsqueda rápida por reserva
ChargingSessionActiveSchema.index({ reservationId: 1 });

// Índice para búsqueda rápida por cargador (admin)
ChargingSessionActiveSchema.index({ chargerId: 1, status: 1 });

// Índice para búsqueda rápida por vehículo (usuario)
ChargingSessionActiveSchema.index({ vehicleId: 1, status: 1 });

// Índice para cleanup de sesiones viejas
ChargingSessionActiveSchema.index({ createdAt: 1, status: 1 });

module.exports = mongoose.model('ChargingSessionActive', ChargingSessionActiveSchema);
