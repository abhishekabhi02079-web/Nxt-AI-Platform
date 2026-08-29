const mongoose = require('mongoose');
const env = require('./env');

let mongoMemoryServerInstance = null;
let dbMode = 'uninitialized'; // 'REAL' | 'IN-MEMORY' | 'DISCONNECTED'

/**
 * Connect to MongoDB with automatic in-memory fallback if MONGODB_URI is not provided or fails.
 */
async function connectDB() {
  const uri = env.MONGODB_URI;

  if (uri && uri.trim() !== '') {
    try {
      console.log(`[MongoDB] Attempting to connect to real MongoDB at ${uri}...`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      dbMode = 'REAL';
      console.log(`[MongoDB] Successfully connected to REAL MongoDB instance.`);
      return;
    } catch (err) {
      console.warn(`[MongoDB] Failed to connect to REAL MongoDB: ${err.message}. Falling back to in-memory MongoDB...`);
    }
  } else {
    console.log(`[MongoDB] No MONGODB_URI provided in environment. Initializing in-memory MongoDB...`);
  }

  // Fallback to mongodb-memory-server
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoMemoryServerInstance = await MongoMemoryServer.create();
    const inMemoryUri = mongoMemoryServerInstance.getUri();
    await mongoose.connect(inMemoryUri);
    dbMode = 'IN-MEMORY';
    console.log(`[MongoDB] Successfully connected to IN-MEMORY MongoDB server (URI: ${inMemoryUri}). Zero external dependencies required.`);
  } catch (memErr) {
    console.error(`[MongoDB] Failed to start in-memory MongoDB: ${memErr.message}`);
    throw memErr;
  }
}

/**
 * Disconnect from MongoDB and stop in-memory server if running.
 */
async function disconnectDB() {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServerInstance) {
      await mongoMemoryServerInstance.stop();
      mongoMemoryServerInstance = null;
    }
    dbMode = 'DISCONNECTED';
    console.log(`[MongoDB] Disconnected.`);
  } catch (err) {
    console.error(`[MongoDB] Error during disconnection:`, err);
  }
}

/**
 * Get current database status
 */
function getDbStatus() {
  return {
    mode: dbMode,
    readyState: mongoose.connection.readyState,
    isConnected: mongoose.connection.readyState === 1,
    host: mongoose.connection.host || 'in-memory',
    name: mongoose.connection.name || 'agentflow_ai',
  };
}

module.exports = {
  connectDB,
  disconnectDB,
  getDbStatus,
};
