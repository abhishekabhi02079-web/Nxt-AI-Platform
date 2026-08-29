const executionService = require('../services/executionService');

/**
 * Execution Controller (Thin Controller)
 * 
 * Handles request parsing and response shaping for execution lifecycle endpoints.
 * Never interacts directly with database models.
 */

/**
 * GET /api/executions
 * Query params: page, limit, status, workflowId
 */
async function getExecutions(req, res, next) {
  try {
    const userId = req.user.id;
    const result = await executionService.getExecutions(userId, req.query);

    res.status(200).json({
      success: true,
      message: 'Executions retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/executions/:id
 */
async function getExecution(req, res, next) {
  try {
    const userId = req.user.id;
    const executionId = req.params.id;
    const execution = await executionService.getExecutionById(userId, executionId);

    res.status(200).json({
      success: true,
      message: 'Execution details retrieved successfully',
      data: { execution },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/executions/:id/timeline
 * Query params: agent, level
 */
async function getExecutionTimeline(req, res, next) {
  try {
    const userId = req.user.id;
    const executionId = req.params.id;
    const result = await executionService.getExecutionTimeline(userId, executionId, req.query);

    res.status(200).json({
      success: true,
      message: 'Execution timeline logs retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/executions/:id/pause
 */
async function pauseExecution(req, res, next) {
  try {
    const userId = req.user.id;
    const executionId = req.params.id;
    const execution = await executionService.pauseExecution(userId, executionId);

    res.status(200).json({
      success: true,
      message: 'Execution pause signal sent successfully',
      data: { execution },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/executions/:id/resume
 */
async function resumeExecution(req, res, next) {
  try {
    const userId = req.user.id;
    const executionId = req.params.id;
    const execution = await executionService.resumeExecution(userId, executionId);

    res.status(200).json({
      success: true,
      message: 'Execution resumed successfully',
      data: { execution },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/executions/:id/cancel
 */
async function cancelExecution(req, res, next) {
  try {
    const userId = req.user.id;
    const executionId = req.params.id;
    const execution = await executionService.cancelExecution(userId, executionId);

    res.status(200).json({
      success: true,
      message: 'Execution cancelled successfully',
      data: { execution },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getExecutions,
  getExecution,
  getExecutionTimeline,
  pauseExecution,
  resumeExecution,
  cancelExecution,
};
