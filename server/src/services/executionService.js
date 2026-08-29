const mongoose = require('mongoose');
const Execution = require('../models/Execution');
const ExecutionLog = require('../models/ExecutionLog');
const Workflow = require('../models/Workflow');
const orchestrator = require('../agents/orchestrator');
const { emitExecutionEvent } = require('../config/socket');
const executionQueue = require('../queues/executionQueue');
const notificationService = require('./notificationService');

// In-memory active execution control state (for pause/resume/cancel coordination)
const activeExecutionControls = new Map();

/**
 * Triggers a new execution for a workflow.
 * 
 * @param {string} userId - Requesting user ID
 * @param {string} workflowId - Target workflow ID
 * @param {Object} inputs - Execution trigger inputs/payload
 * @param {string} [triggeredBy='manual'] - Trigger source
 * @returns {Promise<Object>} Created execution document
 */
async function triggerWorkflowExecution(userId, workflowId, inputs = {}, triggeredBy = 'manual') {
  if (!mongoose.Types.ObjectId.isValid(workflowId)) {
    const error = new Error('Invalid Workflow ID format');
    error.status = 400;
    error.statusCode = 400;
    throw error;
  }

  // Retrieve workflow and verify ownership / access
  const workflow = await Workflow.findOne({ _id: workflowId, owner: userId });
  if (!workflow) {
    const error = new Error('Workflow not found or access denied');
    error.status = 404;
    error.statusCode = 404;
    throw error;
  }

  // Create immutable runtime snapshot of workflow
  const workflowSnapshot = {
    _id: workflow._id,
    name: workflow.name,
    description: workflow.description,
    version: workflow.version,
    status: workflow.status,
    triggerConfig: workflow.triggerConfig || {},
    nodes: JSON.parse(JSON.stringify(workflow.nodes || [])),
    edges: JSON.parse(JSON.stringify(workflow.edges || [])),
    tags: workflow.tags || [],
    snapshotAt: new Date().toISOString(),
  };

  // Create Execution record in PENDING status
  const execution = await Execution.create({
    workflowId: workflow._id,
    owner: userId,
    workflowSnapshot,
    status: 'PENDING',
    currentNode: null,
    startTime: new Date(),
    inputs: inputs || {},
    outputs: {},
    error: null,
    retryCount: 0,
    langGraph: orchestrator.getLangGraphStatus(),
    triggeredBy: triggeredBy || 'manual',
  });

  // Register active execution control handle
  activeExecutionControls.set(execution._id.toString(), {
    signal: null,
    pausedOutputs: {},
    pausedStepIndex: 0,
  });

  // Enqueue execution job via BullMQ / In-Memory background queue
  await executionQueue.addExecutionJob({
    executionId: execution._id.toString(),
    userId,
    workflowSnapshot,
    inputs,
  });

  return execution;
}

/**
 * Internal background runner coordinating execution lifecycle, logs, and state updates.
 */
async function runExecutionLifecycle(executionId, userId, workflowSnapshot, inputs = {}) {
  const execRecord = await Execution.findById(executionId);
  if (!execRecord) return;

  execRecord.status = 'RUNNING';
  execRecord.startTime = execRecord.startTime || new Date();
  await execRecord.save();

  emitExecutionEvent(executionId, 'execution:status', {
    executionId,
    status: 'RUNNING',
    currentNode: null,
  });

  // Log sink callback to persist logs in MongoDB and emit via Socket.IO
  const logSink = async (logData) => {
    try {
      const logEntry = await ExecutionLog.create({
        executionId: new mongoose.Types.ObjectId(logData.executionId),
        workflowId: new mongoose.Types.ObjectId(logData.workflowId),
        nodeId: logData.nodeId || null,
        agent: logData.agent,
        level: logData.level || 'info',
        message: logData.message,
        metadata: logData.metadata || {},
      });

      emitExecutionEvent(executionId, 'execution:log', logEntry);
      return logEntry;
    } catch (err) {
      console.error('[ExecutionService] LogSink database error:', err.message);
      return null;
    }
  };

  // Progress listener updating current node in database and real-time feed
  const onStepProgress = async ({ stepIndex, totalSteps, currentNodeId, nodeLabel }) => {
    try {
      await Execution.findByIdAndUpdate(executionId, {
        currentNode: currentNodeId,
      });

      emitExecutionEvent(executionId, 'execution:progress', {
        executionId,
        stepIndex,
        totalSteps,
        currentNodeId,
        nodeLabel,
      });
    } catch (err) {
      console.error('[ExecutionService] Step progress update error:', err.message);
    }
  };

  // Node completion listener updating outputs in DB and real-time feed
  const onNodeComplete = async ({ nodeId, outputs: nodeOutputs, accumulatedOutputs }) => {
    try {
      await Execution.findByIdAndUpdate(executionId, {
        outputs: accumulatedOutputs,
      });

      emitExecutionEvent(executionId, 'execution:node_output', {
        executionId,
        nodeId,
        output: nodeOutputs,
        accumulatedOutputs,
      });
    } catch (err) {
      console.error('[ExecutionService] Node output update error:', err.message);
    }
  };

  // Control signal check (Pause / Cancel)
  const checkControlSignal = () => {
    const control = activeExecutionControls.get(executionId);
    return control ? control.signal : null;
  };

  try {
    const existingOutputs = execRecord.outputs || {};
    const result = await orchestrator.runOrchestration({
      executionId,
      workflowId: workflowSnapshot._id.toString(),
      workflowSnapshot,
      userId,
      initialInputs: inputs,
      initialOutputs: existingOutputs,
      logSink,
      onStepProgress,
      onNodeComplete,
      checkControlSignal,
      options: {
        skipCompletedNodes: Object.keys(existingOutputs).length > 0,
      },
    });

    // Update execution status in DB
    const finalUpdate = {
      status: result.status,
      outputs: result.outputs || {},
      currentNode: result.currentNode || null,
      error: result.error || null,
      duration: result.duration || 0,
      retryCount: result.retryCount || 0,
      endTime: new Date(),
      langGraph: result.langGraph,
    };

    const updatedDoc = await Execution.findByIdAndUpdate(executionId, finalUpdate, { new: true });

    // Clean up active control state
    if (result.status !== 'PAUSED') {
      activeExecutionControls.delete(executionId);
    }

    emitExecutionEvent(executionId, 'execution:status', updatedDoc);

    // Create user notification on completion or failure
    if (result.status === 'COMPLETED' || result.status === 'FAILED') {
      notificationService
        .createExecutionNotification({
          owner: execRecord.owner || userId,
          workflowId: workflowSnapshot._id,
          workflowName: workflowSnapshot.name || 'Workflow',
          executionId: updatedDoc._id,
          status: result.status,
          duration: result.duration,
          error: result.error,
          recoveryReason: result.error?.message,
        })
        .catch((e) => console.error('[ExecutionService] Notification creation error:', e.message));
    }

    return updatedDoc;
  } catch (err) {
    console.error(`[ExecutionService] Orchestrator crashed for execution ${executionId}:`, err);

    const failDoc = await Execution.findByIdAndUpdate(
      executionId,
      {
        status: 'FAILED',
        error: { message: err.message, stack: err.stack },
        endTime: new Date(),
        currentNode: null,
      },
      { new: true }
    );

    activeExecutionControls.delete(executionId);
    emitExecutionEvent(executionId, 'execution:status', failDoc);

    notificationService
      .createExecutionNotification({
        owner: execRecord.owner || userId,
        workflowId: workflowSnapshot._id,
        workflowName: workflowSnapshot.name || 'Workflow',
        executionId: failDoc._id,
        status: 'FAILED',
        duration: Date.now() - (execRecord.startTime ? new Date(execRecord.startTime).getTime() : Date.now()),
        error: { message: err.message },
      })
      .catch((e) => console.error('[ExecutionService] Notification crash error:', e.message));

    return failDoc;
  }
}

/**
 * Lists executions for user with pagination and filtering.
 */
async function getExecutions(userId, query = {}) {
  const page = parseInt(query.page || '1', 10);
  const limit = parseInt(query.limit || '20', 10);
  const skip = (page - 1) * limit;

  const filter = { owner: userId };

  if (query.status) {
    filter.status = query.status.toUpperCase();
  }

  if (query.workflowId && mongoose.Types.ObjectId.isValid(query.workflowId)) {
    filter.workflowId = query.workflowId;
  }

  const [executions, total] = await Promise.all([
    Execution.find(filter)
      .populate('workflowId', 'name description status tags')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Execution.countDocuments(filter),
  ]);

  return {
    executions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Gets a single execution run by ID.
 */
async function getExecutionById(userId, executionId) {
  if (!mongoose.Types.ObjectId.isValid(executionId)) {
    const error = new Error('Invalid Execution ID format');
    error.status = 400;
    error.statusCode = 400;
    throw error;
  }

  const execution = await Execution.findOne({ _id: executionId, owner: userId })
    .populate('workflowId', 'name description status tags version')
    .lean();

  if (!execution) {
    const error = new Error('Execution not found or access denied');
    error.status = 404;
    error.statusCode = 404;
    throw error;
  }

  return execution;
}

/**
 * Gets timeline logs for an execution run.
 */
async function getExecutionTimeline(userId, executionId, query = {}) {
  const execution = await getExecutionById(userId, executionId);

  const logFilter = { executionId: execution._id };
  if (query.agent) {
    logFilter.agent = query.agent.toLowerCase();
  }
  if (query.level) {
    logFilter.level = query.level.toLowerCase();
  }

  const logs = await ExecutionLog.find(logFilter).sort({ createdAt: 1 }).lean();

  return {
    execution,
    logs,
  };
}

/**
 * Pauses an active execution run.
 */
async function pauseExecution(userId, executionId) {
  const execution = await Execution.findOne({ _id: executionId, owner: userId });
  if (!execution) {
    const error = new Error('Execution not found or access denied');
    error.status = 404;
    error.statusCode = 404;
    throw error;
  }

  if (execution.status !== 'RUNNING' && execution.status !== 'PENDING') {
    const error = new Error(`Cannot pause execution with status ${execution.status}`);
    error.status = 400;
    error.statusCode = 400;
    throw error;
  }

  // Signal the active runner
  const control = activeExecutionControls.get(executionId.toString());
  if (control) {
    control.signal = 'PAUSE';
  } else {
    // If not in active memory, directly update document
    execution.status = 'PAUSED';
    await execution.save();
  }

  emitExecutionEvent(executionId, 'execution:status', { executionId, status: 'PAUSED' });
  return execution;
}

/**
 * Resumes a paused execution run.
 */
async function resumeExecution(userId, executionId) {
  const execution = await Execution.findOne({ _id: executionId, owner: userId });
  if (!execution) {
    const error = new Error('Execution not found or access denied');
    error.status = 404;
    error.statusCode = 404;
    throw error;
  }

  if (execution.status !== 'PAUSED') {
    const error = new Error(`Cannot resume execution with status ${execution.status}`);
    error.status = 400;
    error.statusCode = 400;
    throw error;
  }

  // Clear pause signal and restart lifecycle
  activeExecutionControls.set(execution._id.toString(), { signal: null });

  execution.status = 'RUNNING';
  await execution.save();

  await executionQueue.addExecutionJob({
    executionId: execution._id.toString(),
    userId,
    workflowSnapshot: execution.workflowSnapshot,
    inputs: execution.inputs,
  });

  emitExecutionEvent(executionId, 'execution:status', { executionId, status: 'RUNNING' });
  return execution;
}

/**
 * Cancels an execution run.
 */
async function cancelExecution(userId, executionId) {
  const execution = await Execution.findOne({ _id: executionId, owner: userId });
  if (!execution) {
    const error = new Error('Execution not found or access denied');
    error.status = 404;
    error.statusCode = 404;
    throw error;
  }

  if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(execution.status)) {
    const error = new Error(`Cannot cancel already finished execution (${execution.status})`);
    error.status = 400;
    error.statusCode = 400;
    throw error;
  }

  // Send cancel signal to runner
  const control = activeExecutionControls.get(executionId.toString());
  if (control) {
    control.signal = 'CANCEL';
  }

  execution.status = 'CANCELLED';
  execution.endTime = new Date();
  execution.error = { message: 'Execution cancelled by operator' };
  await execution.save();

  activeExecutionControls.delete(executionId.toString());
  emitExecutionEvent(executionId, 'execution:status', execution);

  return execution;
}

module.exports = {
  triggerWorkflowExecution,
  runExecutionLifecycle,
  getExecutions,
  getExecutionById,
  getExecutionTimeline,
  pauseExecution,
  resumeExecution,
  cancelExecution,
};

// Register execution processor with queue
executionQueue.registerExecutionProcessor(runExecutionLifecycle);
