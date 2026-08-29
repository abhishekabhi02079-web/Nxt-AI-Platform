const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('./env');

let io = null;

/**
 * Initialize Socket.IO with HTTP server instance
 */
function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        // Permissive in dev / matches CLIENT_URL
        callback(null, true);
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Optional socket authentication middleware
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (token) {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        socket.userId = decoded.id;
      }
    } catch (err) {
      // Allow unauthenticated connection for public status monitors, but userId won't be set
    }
    next();
  });

  io.on('connection', (socket) => {
    // If authenticated, join user-specific room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Join specific execution room for live timeline & progress streaming
    socket.on('join:execution', (executionId) => {
      if (executionId) {
        socket.join(`execution:${executionId}`);
      }
    });

    socket.on('leave:execution', (executionId) => {
      if (executionId) {
        socket.leave(`execution:${executionId}`);
      }
    });

    // Explicit user room subscription
    socket.on('join:user', (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
      }
    });

    socket.on('disconnect', () => {
      // cleanup handled automatically by Socket.IO
    });
  });

  return io;
}

/**
 * Get the current Socket.IO server instance
 */
function getIO() {
  if (!io) {
    console.warn('[Socket.IO] getIO called before initialization');
  }
  return io;
}

/**
 * Emit an execution event scoped to the execution room and global list monitor
 */
function emitExecutionEvent(executionId, eventName, payload) {
  if (!io) return;
  // Scoped room broadcast for /executions/[id]
  io.to(`execution:${executionId}`).emit(eventName, payload);
  // General execution monitor broadcast for /executions list
  io.emit('executions:stream', { executionId, eventName, payload });
}

/**
 * Emit an event directly to a specific user (e.g. notifications)
 */
function emitToUser(userId, eventName, payload) {
  if (!io || !userId) return;
  io.to(`user:${userId.toString()}`).emit(eventName, payload);
}

module.exports = {
  initSocket,
  getIO,
  emitExecutionEvent,
  emitToUser,
};
