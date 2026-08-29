import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socket = null;

/**
 * Retrieve or initialize Socket.IO client instance with auth token
 */
export function getSocket() {
  if (typeof window === 'undefined') return null;

  if (!socket) {
    let token = localStorage.getItem('agentflow_token');
    if (!token) {
      const persisted = localStorage.getItem('agentflow_auth_storage');
      if (persisted) {
        try {
          token = JSON.parse(persisted).state?.token;
        } catch (e) {}
      }
    }

    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
      auth: { token },
    });

    socket.on('connect', () => {
      console.log('⚡ [Socket.IO] Connected to server stream:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 [Socket.IO] Disconnected from server:', reason);
    });

    socket.on('connect_error', (error) => {
      console.warn('⚠️ [Socket.IO] Connection error:', error.message);
    });
  }

  return socket;
}

/**
 * Join an execution room for scoped event streaming
 */
export function joinExecutionRoom(executionId) {
  const s = getSocket();
  if (s && executionId) {
    s.emit('join:execution', executionId);
  }
}

/**
 * Leave an execution room
 */
export function leaveExecutionRoom(executionId) {
  const s = getSocket();
  if (s && executionId) {
    s.emit('leave:execution', executionId);
  }
}

/**
 * Subscribe to an active execution's real-time events.
 * Returns cleanup function.
 */
export function subscribeToExecution(executionId, handlers = {}) {
  const s = getSocket();
  if (!s || !executionId) return () => {};

  joinExecutionRoom(executionId);

  const handleLog = (log) => {
    if (handlers.onLog) handlers.onLog(log);
  };

  const handleProgress = (progress) => {
    if (handlers.onProgress) handlers.onProgress(progress);
  };

  const handleNodeOutput = (output) => {
    if (handlers.onNodeOutput) handlers.onNodeOutput(output);
  };

  const handleStatus = (statusDoc) => {
    if (handlers.onStatus) handlers.onStatus(statusDoc);
  };

  s.on('execution:log', handleLog);
  s.on('execution:progress', handleProgress);
  s.on('execution:node_output', handleNodeOutput);
  s.on('execution:status', handleStatus);

  // Unsubscribe cleanup
  return () => {
    leaveExecutionRoom(executionId);
    s.off('execution:log', handleLog);
    s.off('execution:progress', handleProgress);
    s.off('execution:node_output', handleNodeOutput);
    s.off('execution:status', handleStatus);
  };
}

/**
 * Subscribe to notifications stream for current user.
 * Returns cleanup function.
 */
export function subscribeToNotifications(handlers = {}) {
  const s = getSocket();
  if (!s) return () => {};

  const handleNew = (notification) => {
    if (handlers.onNew) handlers.onNew(notification);
  };

  const handleRead = (data) => {
    if (handlers.onRead) handlers.onRead(data);
  };

  const handleReadAll = (data) => {
    if (handlers.onReadAll) handlers.onReadAll(data);
  };

  s.on('notification:new', handleNew);
  s.on('notification:read', handleRead);
  s.on('notification:read_all', handleReadAll);

  return () => {
    s.off('notification:new', handleNew);
    s.off('notification:read', handleRead);
    s.off('notification:read_all', handleReadAll);
  };
}

/**
 * Disconnect socket instance
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export default getSocket;
