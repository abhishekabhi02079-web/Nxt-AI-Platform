/**
 * Background Execution Queue (BullMQ on Redis with In-Memory Fallback)
 * 
 * Wraps BullMQ for distributed background execution scheduling and exponential
 * retry backoff when Redis is available, with an automatic zero-dependency in-memory
 * queue fallback for seamless local development.
 */

const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const env = require('../config/env');

let bullQueue = null;
let bullWorker = null;
let redisConnection = null;
let queueMode = 'IN_MEMORY';
let isConnected = false;
let executionProcessor = null;

// In-Memory Queue fallback state
const inMemoryQueue = [];
let isProcessingInMemory = false;
const inMemoryStats = {
  totalEnqueued: 0,
  totalProcessed: 0,
  totalFailed: 0,
};

/**
 * Registers an async processor function `(executionId, userId, workflowSnapshot, inputs) => Promise<any>`
 */
function registerExecutionProcessor(processor) {
  executionProcessor = processor;
}

/**
 * Initializes the execution queue (BullMQ + Redis if configured, otherwise In-Memory)
 * 
 * @param {Function} [customProcessor] - Optional execution processor callback
 * @returns {Promise<Object>} { mode: 'BULLMQ_REDIS' | 'IN_MEMORY', isConnected: boolean }
 */
async function initExecutionQueue(customProcessor = null) {
  if (customProcessor) {
    executionProcessor = customProcessor;
  }

  // If REDIS_URL is provided, try initializing BullMQ on Redis
  if (env.REDIS_URL && env.REDIS_URL.trim() !== '') {
    try {
      redisConnection = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: null, // Required by BullMQ
        enableReadyCheck: false,
        connectTimeout: 3000,
        retryStrategy: (times) => {
          if (times > 2) {
            console.warn('[ExecutionQueue] Redis connection retry limit reached, switching to IN-MEMORY fallback');
            return null; // Stop retrying and trigger error
          }
          return 500;
        },
      });

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Redis connection timed out after 3000ms'));
        }, 3000);

        redisConnection.once('ready', () => {
          clearTimeout(timeout);
          resolve();
        });

        redisConnection.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      // Initialize BullMQ Queue
      bullQueue = new Queue('workflow-executions', {
        connection: redisConnection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: {
            age: 3600, // Retain completed jobs for 1 hour
            count: 1000,
          },
          removeOnFail: {
            age: 86400, // Retain failed jobs for 24 hours
          },
        },
      });

      // Initialize BullMQ Worker
      bullWorker = new Worker(
        'workflow-executions',
        async (job) => {
          const { executionId, userId, workflowSnapshot, inputs } = job.data;
          console.log(`[BullMQ Worker] Processing execution job ${job.id} for Execution: ${executionId}`);

          if (typeof executionProcessor === 'function') {
            return await executionProcessor(executionId, userId, workflowSnapshot, inputs);
          } else {
            const execService = require('../services/executionService');
            return await execService.runExecutionLifecycle(executionId, userId, workflowSnapshot, inputs);
          }
        },
        {
          connection: redisConnection,
          concurrency: 5,
        }
      );

      bullWorker.on('completed', (job) => {
        console.log(`[BullMQ Worker] Job ${job.id} completed successfully`);
      });

      bullWorker.on('failed', (job, err) => {
        console.error(`[BullMQ Worker] Job ${job?.id} failed:`, err.message);
      });

      queueMode = 'BULLMQ_REDIS';
      isConnected = true;
      console.log('[ExecutionQueue] Initialized BullMQ queue with Redis backend');
      return { mode: queueMode, isConnected: true };
    } catch (err) {
      console.warn(`[ExecutionQueue] Redis initialization failed (${err.message}). Using zero-dependency IN-MEMORY fallback queue.`);
      queueMode = 'IN_MEMORY';
      isConnected = true;
    }
  } else {
    queueMode = 'IN_MEMORY';
    isConnected = true;
    console.log('[ExecutionQueue] No REDIS_URL specified. Initialized IN-MEMORY background execution queue.');
  }

  return { mode: queueMode, isConnected: true };
}

/**
 * Processes queued in-memory execution jobs asynchronously
 */
async function processNextInMemoryJob() {
  if (inMemoryQueue.length === 0) {
    isProcessingInMemory = false;
    return;
  }

  isProcessingInMemory = true;
  const item = inMemoryQueue.shift();

  try {
    const { executionId, userId, workflowSnapshot, inputs, resolve, reject } = item;
    
    let result;
    if (typeof executionProcessor === 'function') {
      result = await executionProcessor(executionId, userId, workflowSnapshot, inputs);
    } else {
      const execService = require('../services/executionService');
      result = await execService.runExecutionLifecycle(executionId, userId, workflowSnapshot, inputs);
    }

    inMemoryStats.totalProcessed++;
    if (typeof resolve === 'function') resolve(result);
  } catch (err) {
    inMemoryStats.totalFailed++;
    console.error(`[InMemoryQueue] Error processing execution ${item.executionId}:`, err);
    if (typeof item.reject === 'function') item.reject(err);
  } finally {
    // Schedule next job
    setImmediate(processNextInMemoryJob);
  }
}

/**
 * Adds an execution run to the queue
 * 
 * @param {Object} jobData - { executionId, userId, workflowSnapshot, inputs }
 * @param {Object} [options] - { delay, attempts, backoff }
 * @returns {Promise<Object>} { jobId, mode, queued: true }
 */
async function addExecutionJob(jobData, options = {}) {
  const { executionId, userId, workflowSnapshot, inputs } = jobData;

  if (queueMode === 'BULLMQ_REDIS' && bullQueue) {
    const job = await bullQueue.add(
      `exec-${executionId}`,
      { executionId, userId, workflowSnapshot, inputs },
      {
        jobId: `exec_${executionId}_${Date.now()}`,
        delay: options.delay || 0,
        attempts: options.attempts || 3,
        backoff: options.backoff || { type: 'exponential', delay: 1000 },
      }
    );
    return {
      jobId: job.id,
      mode: 'BULLMQ_REDIS',
      queued: true,
    };
  }

  // In-Memory Queue Flow
  inMemoryStats.totalEnqueued++;

  if (options.delay && options.delay > 0) {
    setTimeout(() => {
      inMemoryQueue.push({ executionId, userId, workflowSnapshot, inputs });
      if (!isProcessingInMemory) {
        processNextInMemoryJob();
      }
    }, options.delay);
  } else {
    inMemoryQueue.push({ executionId, userId, workflowSnapshot, inputs });
    if (!isProcessingInMemory) {
      setImmediate(processNextInMemoryJob);
    }
  }

  return {
    jobId: `mem_${executionId}_${Date.now()}`,
    mode: 'IN_MEMORY',
    queued: true,
    queueLength: inMemoryQueue.length,
  };
}

/**
 * Returns queue health and metrics
 */
async function getQueueStatus() {
  let waitingCount = inMemoryQueue.length;
  let activeCount = isProcessingInMemory ? 1 : 0;
  let completedCount = inMemoryStats.totalProcessed;
  let failedCount = inMemoryStats.totalFailed;

  if (queueMode === 'BULLMQ_REDIS' && bullQueue) {
    try {
      const [waiting, active, completed, failed] = await Promise.all([
        bullQueue.getWaitingCount(),
        bullQueue.getActiveCount(),
        bullQueue.getCompletedCount(),
        bullQueue.getFailedCount(),
      ]);
      waitingCount = waiting;
      activeCount = active;
      completedCount = completed;
      failedCount = failed;
    } catch (e) {
      // Ignored
    }
  }

  return {
    mode: queueMode,
    isConnected,
    waitingCount,
    activeCount,
    completedCount,
    failedCount,
    inMemoryStats: queueMode === 'IN_MEMORY' ? inMemoryStats : undefined,
  };
}

/**
 * Graceful shutdown
 */
async function closeQueue() {
  if (bullWorker) {
    await bullWorker.close();
    bullWorker = null;
  }
  if (bullQueue) {
    await bullQueue.close();
    bullQueue = null;
  }
  if (redisConnection) {
    redisConnection.disconnect();
    redisConnection = null;
  }
  isConnected = false;
}

module.exports = {
  initExecutionQueue,
  addExecutionJob,
  getQueueStatus,
  registerExecutionProcessor,
  closeQueue,
};
