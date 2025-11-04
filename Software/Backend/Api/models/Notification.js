const mongoose = require('mongoose');

/**
 * Schema de Notificación
 * Representa notificaciones del sistema enviadas a usuarios
 * Incluye soporte para tipos, estado de lectura y datos adicionales
 */
const NotificationSchema = new mongoose.Schema(
  {
    // Usuario destinatario de la notificación (indexado para búsquedas rápidas)
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      index: true, 
      required: true 
    },
    
    // Título de la notificación
    title: { 
      type: String, 
      required: true 
    },
    
    // Mensaje descriptivo de la notificación
    message: { 
      type: String, 
      required: true 
    },
    
    // Tipo de notificación para UI (colores, iconos, etc.)
    type: { 
      type: String, 
      default: 'info' 
      // info: Información general (azul)
      // warning: Advertencia (amarillo)
      // success: Éxito (verde)
      // error: Error (rojo)
    },
    
    // Datos adicionales asociados a la notificación (JSON flexible)
    // Ejemplo: { reservationId: '...', chargerId: '...' }
    data: { 
      type: Object, 
      default: {} 
    },
    
    // Estado de lectura de la notificación
    read: { 
      type: Boolean, 
      default: false 
    },
  },
  { 
    // Timestamps automáticos para creación y actualización
    timestamps: { 
      createdAt: 'createdAt', 
      updatedAt: 'updatedAt' 
    } 
  }
);

// Índice compuesto para optimizar consultas de notificaciones no leídas
// Permite búsquedas rápidas por usuario, estado de lectura y fecha
NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
