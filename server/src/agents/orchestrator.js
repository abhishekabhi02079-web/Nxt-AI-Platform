/**
 * Multi-Agent Orchestrator (Pure Module)
 * 
 * Orchestrates the fixed multi-agent execution chain for visual workflow graphs:
 *   PLANNER -> EXECUTION -> VALIDATION -> RECOVERY (if failure) -> MONITORING
 * 
 * Dynamically checks for LangGraph availability and reports `langGraph: 'available' | 'not-installed'`.
 * 
 * Does NOT contain HTTP/Express knowledge.
 */

const plannerAgent = require('./plannerAgent');
const executionAgent = require('./executionAgent');
const validationAgent = require('./validationAgent');
const recoveryAgent = require('./recoveryAgent');
const monitoringAgent = require('./monitoringAgent');

// Check LangGraph availability per spec.md
let langGraphStatus = 'not-installed';
try {
  require('@langchain/langgraph');
  langGraphStatus = 'available';
} catch (e1) {
  try {
    require('langgraph');
    langGraphStatus = 'available';
  } catch (e2) {
    langGraphStatus = 'not-installed';
  }
}

/**
 * Gets the current LangGraph status ('available' | 'not-installed')
 */
function getLangGraphStatus() {
  return langGraphStatus;
}

/**
 * Orchestrates a complete workflow execution run.
 * 
 * @param {Object} params
 * @param {string} params.executionId - Execution ID
 * @param {string} params.workflowId - Workflow ID
 * @param {Object} params.workflowSnapshot - Snapshot of the workflow graph { nodes, edges, triggerConfig, name }
 * @param {Object} [params.initialInputs={}] - Trigger inputs
 * @param {Function} [params.logSink=null] - Async logger callback `(logData) => Promise<any>`
 * @param {Function} [params.onStepProgress=null] - Progress callback `(stepInfo) => Promise<void>`
 * @param {Function} [params.checkControlSignal=null] - Lifecycle control check `() => 'PAUSE' | 'CANCEL' | null`
 * @param {Object} [params.options={}] - Execution options (e.g. mockDelayMs, simulatedErrors)
 * @returns {Promise<Object>} Execution result { status, outputs, currentNode, error, duration, retryCount, langGraph }
 */
async function runOrchestration({
  executionId,
  workflowId,
  workflowSnapshot,
  userId = null,
  initialInputs = {},
  initialOutputs = {},
  logSink = null,
  onStepProgress = null,
  onNodeComplete = null,
  checkControlSignal = null,
  options = {},
}) {
  const startTime = Date.now();
  const accumulatedOutputs = { ...(initialOutputs || {}) };
  let totalRetries = 0;
  let currentNodeId = null;

  try {
    // ==========================================
    // 1. MONITORING: Lifecycle Start Event
    // ==========================================
    await monitoringAgent.logMonitoringEvent(logSink, {
      executionId,
      workflowId,
      level: 'info',
      message: `Multi-agent orchestration started (LangGraph Substrate: ${langGraphStatus.toUpperCase()})`,
      metadata: {
        langGraph: langGraphStatus,
        startedAt: new Date().toISOString(),
        nodeCount: workflowSnapshot?.nodes?.length || 0,
      },
    });

    // ==========================================
    // 2. PLANNER AGENT: Graph Analysis & Ordering
    // ==========================================
    const planResult = plannerAgent.createExecutionPlan(workflowSnapshot);

    await monitoringAgent.logPlannerEvent(logSink, {
      executionId,
      workflowId,
      level: planResult.confidenceScore < 0.8 ? 'warning' : 'success',
      message: `Planner Agent computed DAG topological execution sequence with ${Math.round(planResult.confidenceScore * 100)}% confidence score`,
      metadata: {
        confidenceScore: planResult.confidenceScore,
        orderedNodeIds: planResult.orderedNodeIds,
        totalSteps: planResult.executionPlan.length,
        diagnostics: planResult.diagnostics,
      },
    });

    if (planResult.executionPlan.length === 0) {
      const emptyError = {
        message: 'No executable nodes found in workflow graph snapshot',
        code: 'EMPTY_GRAPH',
      };
      await monitoringAgent.logMonitoringEvent(logSink, {
        executionId,
        workflowId,
        level: 'error',
        message: emptyError.message,
        metadata: { error: emptyError },
      });

      return {
        status: 'FAILED',
        outputs: {},
        currentNode: null,
        error: emptyError,
        duration: Date.now() - startTime,
        retryCount: 0,
        langGraph: langGraphStatus,
      };
    }

    // ==========================================
    // 3. NODE EXECUTION LOOP
    // ==========================================
    for (let stepIndex = 0; stepIndex < planResult.executionPlan.length; stepIndex++) {
      const step = planResult.executionPlan[stepIndex];
      const node = planResult.nodeMap[step.nodeId];
      currentNodeId = step.nodeId;

      // If node was already completed in prior run (e.g. before pause), skip re-execution
      if (options.skipCompletedNodes && accumulatedOutputs[step.nodeId]) {
        await monitoringAgent.logMonitoringEvent(logSink, {
          executionId,
          workflowId,
          nodeId: currentNodeId,
          level: 'info',
          message: `Step ${stepIndex + 1}/${planResult.executionPlan.length}: Node [${step.label}] already completed in prior run, using cached outputs`,
          metadata: { stepIndex: stepIndex + 1, cached: true },
        });
        continue;
      }

      // Check external control signals (Pause / Cancel)
      if (typeof checkControlSignal === 'function') {
        const signal = await checkControlSignal();
        if (signal === 'PAUSE') {
          await monitoringAgent.logMonitoringEvent(logSink, {
            executionId,
            workflowId,
            nodeId: currentNodeId,
            level: 'warning',
            message: `Execution paused by operator at node: ${step.label} (${step.nodeId})`,
            metadata: { pausedAtStep: stepIndex + 1 },
          });

          return {
            status: 'PAUSED',
            outputs: accumulatedOutputs,
            currentNode: currentNodeId,
            error: null,
            duration: Date.now() - startTime,
            retryCount: totalRetries,
            langGraph: langGraphStatus,
          };
        }

        if (signal === 'CANCEL') {
          await monitoringAgent.logMonitoringEvent(logSink, {
            executionId,
            workflowId,
            nodeId: currentNodeId,
            level: 'warning',
            message: `Execution cancelled by operator at node: ${step.label} (${step.nodeId})`,
            metadata: { cancelledAtStep: stepIndex + 1 },
          });

          return {
            status: 'CANCELLED',
            outputs: accumulatedOutputs,
            currentNode: currentNodeId,
            error: { message: 'Execution cancelled by operator' },
            duration: Date.now() - startTime,
            retryCount: totalRetries,
            langGraph: langGraphStatus,
          };
        }
      }

      // Notify external progress listener
      if (typeof onStepProgress === 'function') {
        await onStepProgress({
          stepIndex: stepIndex + 1,
          totalSteps: planResult.executionPlan.length,
          currentNodeId,
          nodeLabel: step.label,
        });
      }

      await monitoringAgent.logMonitoringEvent(logSink, {
        executionId,
        workflowId,
        nodeId: currentNodeId,
        level: 'info',
        message: `Step ${stepIndex + 1}/${planResult.executionPlan.length}: Invoking [${step.label}] (${step.nodeType})`,
        metadata: {
          stepIndex: stepIndex + 1,
          totalSteps: planResult.executionPlan.length,
          nodeType: step.nodeType,
          category: step.category,
        },
      });

      // Prepare inputs for this step (merge initial inputs + upstream outputs)
      const stepInputs = {
        ...initialInputs,
        ...step.config,
      };
      
      // Inject outputs from dependent upstream nodes
      if (step.dependencies && step.dependencies.length > 0) {
        stepInputs._upstream = {};
        step.dependencies.forEach((depId) => {
          if (accumulatedOutputs[depId]) {
            stepInputs._upstream[depId] = accumulatedOutputs[depId];
          }
        });
      }

      // Node Execution & Recovery Loop (with exponential backoff)
      let nodeSucceeded = false;
      let nodeRetryCount = 0;
      let lastNodeOutputs = null;
      let lastNodeError = null;

      while (!nodeSucceeded) {
        // --- AGENT: EXECUTION ---
        const execResult = await executionAgent.executeNode({
          node,
          inputs: stepInputs,
          context: { outputs: accumulatedOutputs },
          userId,
          options,
        });

        if (execResult.success) {
          await monitoringAgent.logExecutionEvent(logSink, {
            executionId,
            workflowId,
            nodeId: currentNodeId,
            level: 'info',
            message: `Execution Agent completed node [${step.label}] in ${execResult.executionTimeMs}ms`,
            metadata: {
              executionTimeMs: execResult.executionTimeMs,
              action: execResult.outputs?.action || step.nodeType,
              status: execResult.outputs?.status || 'success',
            },
          });

          // --- AGENT: VALIDATION ---
          const valResult = validationAgent.validateNodeOutput({
            node,
            outputs: execResult.outputs,
          });

          if (valResult.isValid) {
            await monitoringAgent.logValidationEvent(logSink, {
              executionId,
              workflowId,
              nodeId: currentNodeId,
              level: 'success',
              message: `Validation Agent confirmed required schema contract for [${step.label}]`,
              metadata: {
                nodeType: valResult.nodeType,
                verifiedFields: Object.keys(valResult.validatedOutputs),
              },
            });

            nodeSucceeded = true;
            lastNodeOutputs = valResult.validatedOutputs;
          } else {
            // Validation Failed
            await monitoringAgent.logValidationEvent(logSink, {
              executionId,
              workflowId,
              nodeId: currentNodeId,
              level: 'error',
              message: `Validation Agent rejected output for [${step.label}]: ${valResult.errors.join('; ')}`,
              metadata: {
                missingFields: valResult.missingFields,
                errors: valResult.errors,
              },
            });

            lastNodeError = {
              code: 'VALIDATION_FAILED',
              missingFields: valResult.missingFields,
              message: valResult.errors.join('; '),
            };
          }
        } else {
          // Execution Failed
          lastNodeError = execResult.error;
          await monitoringAgent.logExecutionEvent(logSink, {
            executionId,
            workflowId,
            nodeId: currentNodeId,
            level: 'error',
            message: `Execution Agent encountered error on [${step.label}]: ${lastNodeError.message}`,
            metadata: { error: lastNodeError },
          });
        }

        // --- AGENT: RECOVERY (if failure occurred) ---
        if (!nodeSucceeded) {
          const recoveryPlan = recoveryAgent.analyzeFailure({
            error: lastNodeError,
            retryCount: nodeRetryCount,
          });

          await monitoringAgent.logRecoveryEvent(logSink, {
            executionId,
            workflowId,
            nodeId: currentNodeId,
            level: recoveryPlan.decision === 'retry_with_backoff' ? 'warning' : 'error',
            message: `Recovery Agent classified failure as [${recoveryPlan.failureType}]: ${recoveryPlan.reason}`,
            metadata: recoveryPlan,
          });

          if (recoveryPlan.decision === 'retry_with_backoff') {
            nodeRetryCount++;
            totalRetries++;
            // Apply exponential backoff delay
            await new Promise((resolve) => setTimeout(resolve, recoveryPlan.backoffMs));
          } else {
            // Escalate failure and halt run
            const finalDuration = Date.now() - startTime;
            await monitoringAgent.logMonitoringEvent(logSink, {
              executionId,
              workflowId,
              nodeId: currentNodeId,
              level: 'error',
              message: `Workflow execution FAILED at node [${step.label}]. Recovery escalated error.`,
              metadata: {
                failedNode: currentNodeId,
                error: lastNodeError,
                durationMs: finalDuration,
              },
            });

            return {
              status: 'FAILED',
              outputs: accumulatedOutputs,
              currentNode: currentNodeId,
              error: lastNodeError,
              duration: finalDuration,
              retryCount: totalRetries,
              langGraph: langGraphStatus,
            };
          }
        }
      }

      // Store node output in accumulated context
      accumulatedOutputs[step.nodeId] = lastNodeOutputs;

      if (typeof onNodeComplete === 'function') {
        await onNodeComplete({
          nodeId: step.nodeId,
          outputs: lastNodeOutputs,
          accumulatedOutputs,
        });
      }
    }

    // ==========================================
    // 4. MONITORING: Workflow Success Completion
    // ==========================================
    const totalDuration = Date.now() - startTime;
    await monitoringAgent.logMonitoringEvent(logSink, {
      executionId,
      workflowId,
      nodeId: null,
      level: 'success',
      message: `Workflow orchestration COMPLETED successfully in ${totalDuration}ms across ${planResult.executionPlan.length} steps`,
      metadata: {
        totalSteps: planResult.executionPlan.length,
        durationMs: totalDuration,
        totalRetries,
        completedAt: new Date().toISOString(),
      },
    });

    return {
      status: 'COMPLETED',
      outputs: accumulatedOutputs,
      currentNode: null,
      error: null,
      duration: totalDuration,
      retryCount: totalRetries,
      langGraph: langGraphStatus,
    };
  } catch (unhandledErr) {
    const totalDuration = Date.now() - startTime;
    console.error('[Orchestrator] Unhandled exception:', unhandledErr);

    await monitoringAgent.logMonitoringEvent(logSink, {
      executionId,
      workflowId,
      nodeId: currentNodeId,
      level: 'error',
      message: `Orchestrator unhandled crash: ${unhandledErr.message}`,
      metadata: {
        error: { message: unhandledErr.message, stack: unhandledErr.stack },
      },
    });

    return {
      status: 'FAILED',
      outputs: accumulatedOutputs,
      currentNode: currentNodeId,
      error: { message: unhandledErr.message },
      duration: totalDuration,
      retryCount: totalRetries,
      langGraph: langGraphStatus,
    };
  }
}

module.exports = {
  runOrchestration,
  getLangGraphStatus,
};
