const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const env = require('./config/env');
const { getDbStatus } = require('./config/db');
const { getQueueStatus } = require('./queues/executionQueue');
const authRoutes = require('./routes/authRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const executionRoutes = require('./routes/executionRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { notFoundHandler, errorHandler } = require('./middlewares/errorMiddleware');

const app = express();

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or matching CLIENT_URL / localhost
      if (!origin || origin.includes('localhost') || origin === env.CLIENT_URL) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Compression & Body Parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbStatus = getDbStatus();
  const queueStatus = await getQueueStatus();

  res.status(200).json({
    status: 'ok',
    service: 'Agentflow_AI API Server',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    database: {
      mode: dbStatus.mode,
      connected: dbStatus.isConnected,
      name: dbStatus.name,
    },
    queue: {
      mode: queueStatus.mode,
      connected: queueStatus.isConnected,
      waiting: queueStatus.waitingCount,
      active: queueStatus.activeCount,
      completed: queueStatus.completedCount,
      failed: queueStatus.failedCount,
    },
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/executions', executionRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/notifications', notificationRoutes);

// Fallback error handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
