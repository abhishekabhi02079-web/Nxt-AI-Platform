/**
 * Monitoring Agent (Pure Module)
 * 
 * Emits and formats timeline events for each agent step in the multi-agent chain.
 * Persists log records via an injected log sink (ExecutionLog repository/model)
 * and dispatches event payloads for live telemetry.
 * 
 * Does NOT contain HTTP/Express knowledge.
 */

/**
 * Emits a structured agent event and saves to the log sink if provided.
 * 
 * @param {Function|null} logSink - Async callback/function `(logData) => Promise<any>`
 * @param {Object} logData - Log payload
 * @param {string} logData.executionId - Execution ID
 * @param {string} logData.workflowId - Workflow ID
 * @param {string|null} [logData.nodeId] - Current Node ID
 * @param {'planner'|'execution'|'validation'|'recovery'|'monitoring'} logData.agent - Agent identifier
 * @param {'info'|'warning'|'error'|'success'} [logData.level='info'] - Severity level
 * @param {string} logData.message - Human-readable log message
 * @param {Object} [logData.metadata={}] - Structured metadata
 * @returns {Promise<Object>} Formatted log entry
 */
async function emitLog(logSink, logData) {
  const entry = {
    executionId: logData.executionId,
    workflowId: logData.workflowId,
    nodeId: logData.nodeId || null,
    agent: logData.agent,
    level: logData.level || 'info',
    message: logData.message,
    metadata: logData.metadata || {},
    timestamp: new Date().toISOString(),
  };

  if (typeof logSink === 'function') {
    try {
      const persisted = await logSink(entry);
      return persisted || entry;
    } catch (err) {
      console.error('[MonitoringAgent] Error recording execution log:', err.message);
    }
  }

  return entry;
}

// Agent-specific convenience wrappers
async function logPlannerEvent(logSink, { executionId, workflowId, message, metadata = {}, level = 'info' }) {
  return emitLog(logSink, {
    executionId,
    workflowId,
    nodeId: null,
    agent: 'planner',
    level,
    message,
    metadata,
  });
}

async function logExecutionEvent(logSink, { executionId, workflowId, nodeId, message, metadata = {}, level = 'info' }) {
  return emitLog(logSink, {
    executionId,
    workflowId,
    nodeId,
    agent: 'execution',
    level,
    message,
    metadata,
  });
}

async function logValidationEvent(logSink, { executionId, workflowId, nodeId, message, metadata = {}, level = 'info' }) {
  return emitLog(logSink, {
    executionId,
    workflowId,
    nodeId,
    agent: 'validation',
    level,
    message,
    metadata,
  });
}

async function logRecoveryEvent(logSink, { executionId, workflowId, nodeId, message, metadata = {}, level = 'warning' }) {
  return emitLog(logSink, {
    executionId,
    workflowId,
    nodeId,
    agent: 'recovery',
    level,
    message,
    metadata,
  });
}

async function logMonitoringEvent(logSink, { executionId, workflowId, nodeId = null, message, metadata = {}, level = 'info' }) {
  return emitLog(logSink, {
    executionId,
    workflowId,
    nodeId,
    agent: 'monitoring',
    level,
    message,
    metadata,
  });
}

module.exports = {
  emitLog,
  logPlannerEvent,
  logExecutionEvent,
  logValidationEvent,
  logRecoveryEvent,
  logMonitoringEvent,
};
