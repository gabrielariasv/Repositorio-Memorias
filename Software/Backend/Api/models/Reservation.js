const mongoose = require('mongoose');

/**
 * Schema de Reserva
 * Representa una reserva de estación de carga para un vehículo
 * Incluye workflow de aceptación, notificaciones y cancelaciones
 */
const ReservationSchema = new mongoose.Schema({
  // Referencias principales
  vehicleId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Vehicle' 
  },
  chargerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Charger' 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  // Horarios de la reserva
  startTime: Date,          // Hora de inicio solicitada
  endTime: Date,            // Hora de fin solicitada
  calculatedEndTime: Date,  // Hora de fin calculada según carga estimada
  
  // Estado de la reserva en su ciclo de vida
  status: { 
    type: String, 
    enum: ['upcoming', 'active', 'completed', 'cancelled'], 
    default: 'upcoming'
    // upcoming: Reserva futura aún no iniciada
    // active: Reserva en curso (dentro del rango de tiempo)
    // completed: Reserva finalizada exitosamente
    // cancelled: Reserva cancelada por alguna razón
  },
  
  // Tiempos estimados para la carga
  estimatedChargeTime: Number,  // Tiempo estimado de carga en minutos
  bufferTime: Number,           // Tiempo de buffer adicional
  
  // --- Campos de workflow de aceptación ---
  
  // Estado de aceptación por el propietario de la estación
  acceptanceStatus: { 
    type: String, 
    enum: ['pending', 'accepted'], 
    default: 'pending'
    // pending: Esperando aceptación del propietario
    // accepted: Aceptada por el propietario
  },
  
  // Información de cancelación
  cancelledBy: { 
    type: String, 
    enum: ['user', 'owner', 'system'], 
    default: undefined
    // user: Cancelada por el usuario que la creó
    // owner: Cancelada por el propietario de la estación
    // system: Cancelada automáticamente (conflicto, etc.)
  },
  
  cancellationReason: { 
    type: String, 
    enum: ['indisponibilidad', 'mantenimiento', 'falta_tiempo', 'otro'], 
    default: undefined
    // indisponibilidad: Estación no disponible
    // mantenimiento: Estación en mantenimiento
    // falta_tiempo: Usuario no tiene tiempo
    // otro: Otra razón no especificada
  },
  
  // --- Control de notificaciones ---
  
  // Indicadores de notificaciones enviadas
  preNotified: { 
    type: Boolean, 
    default: false 
    // true si se envió notificación previa (10 min antes)
  },
  
  startNotified: { 
    type: Boolean, 
    default: false 
    // true si se envió notificación de inicio
  }
});

module.exports = mongoose.model('Reservation', ReservationSchema);