const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { connectDB, getDbStatus } = require('./config/db');
const { initSocket } = require('./config/socket');
const { initExecutionQueue, getQueueStatus } = require('./queues/executionQueue');

const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

async function startServer() {
  try {
    // Connect to database (with automatic in-memory fallback)
    await connectDB();

    // Initialize execution queue (BullMQ + Redis with in-memory fallback)
    await initExecutionQueue();

    const dbStatus = getDbStatus();
    const queueStatus = await getQueueStatus();

    server.listen(env.PORT, () => {
      console.log('====================================================');
      console.log(`🚀 Agentflow_AI Server running on port ${env.PORT}`);
      console.log(`🌐 Environment: ${env.NODE_ENV}`);
      console.log(`📦 Database Mode: [${dbStatus.mode}] (Connected: ${dbStatus.isConnected})`);
      console.log(`⚡ Execution Queue: [${queueStatus.mode}] (Connected: ${queueStatus.isConnected})`);
      console.log(`🔌 Client URL allowed: ${env.CLIENT_URL}`);
      console.log(`⚡ Health check available at: http://localhost:${env.PORT}/api/health`);
      console.log('====================================================');
    });
  } catch (err) {
    console.error('❌ Fatal error during server startup:', err);
    process.exit(1);
  }
}

// Handle unhandled promise rejections & exceptions
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

startServer();
