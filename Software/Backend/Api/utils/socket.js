let ioInstance = null;

function init(server, corsOrigin = '*') {
  const { Server } = require('socket.io');
  ioInstance = new Server(server, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
      credentials: false,
    },
  });

  const jwt = require('jsonwebtoken');

  ioInstance.on('connection', (socket) => {
    // Client should emit 'auth' with JWT to join its user room
    socket.on('auth', (token) => {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
        const userRoom = `user:${payload.userId}`;
        socket.join(userRoom);
        socket.emit('auth_ok');
      } catch (e) {
        socket.emit('auth_error', 'invalid_token');
      }
    });
  });

  return ioInstance;
}

function getIO() {
  if (!ioInstance) {
    throw new Error('Socket.io not initialized. Call init(server) first.');
  }
  return ioInstance;
}

function emitToUser(userId, event, data) {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit(event, data);
}

module.exports = { init, getIO, emitToUser };
