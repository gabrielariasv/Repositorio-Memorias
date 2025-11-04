/**
 * Módulo de gestión de WebSockets con Socket.IO
 * Permite comunicación en tiempo real entre servidor y clientes
 * Implementa autenticación mediante JWT y rooms por usuario
 */

let ioInstance = null;

/**
 * Inicializar Socket.IO en el servidor HTTP
 * @param {http.Server} server - Instancia del servidor HTTP
 * @param {string} corsOrigin - Origen permitido para CORS (default: '*')
 * @returns {Server} Instancia de Socket.IO
 */
function init(server, corsOrigin = '*') {
  const { Server } = require('socket.io');
  
  // Crear instancia de Socket.IO con configuración CORS
  ioInstance = new Server(server, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
      credentials: false,
    },
  });

  const jwt = require('jsonwebtoken');

  // Manejar nuevas conexiones de clientes
  ioInstance.on('connection', (socket) => {
    /**
     * Evento 'auth': Cliente se autentica enviando su token JWT
     * Si el token es válido, el socket se une a un room específico del usuario
     * Esto permite enviar eventos solo a ese usuario específico
     */
    socket.on('auth', (token) => {
      try {
        // Verificar token JWT
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
        
        // Unir socket a room del usuario (formato: "user:<userId>")
        const userRoom = `user:${payload.userId}`;
        socket.join(userRoom);
        
        // Confirmar autenticación exitosa
        socket.emit('auth_ok');
      } catch (e) {
        // Token inválido o expirado
        socket.emit('auth_error', 'invalid_token');
      }
    });
  });

  return ioInstance;
}

/**
 * Obtener la instancia de Socket.IO
 * @returns {Server} Instancia de Socket.IO
 * @throws {Error} Si Socket.IO no ha sido inicializado
 */
function getIO() {
  if (!ioInstance) {
    throw new Error('Socket.io not initialized. Call init(server) first.');
  }
  return ioInstance;
}

/**
 * Emitir un evento a un usuario específico
 * Envía el evento solo a los sockets autenticados de ese usuario
 * @param {string} userId - ID del usuario destinatario
 * @param {string} event - Nombre del evento a emitir
 * @param {*} data - Datos a enviar con el evento
 */
function emitToUser(userId, event, data) {
  if (!ioInstance) return;
  
  // Emitir al room específico del usuario
  ioInstance.to(`user:${userId}`).emit(event, data);
}

module.exports = { init, getIO, emitToUser };
