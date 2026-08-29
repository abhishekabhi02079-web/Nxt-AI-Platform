const workflowService = require('../services/workflowService');
const aiService = require('../services/aiService');
const executionService = require('../services/executionService');

/**
 * GET /api/workflows
 */
async function getWorkflows(req, res, next) {
  try {
    const userId = req.user.id;
    const result = await workflowService.listWorkflows(userId, req.query);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/workflows/dashboard
 */
async function getDashboard(req, res, next) {
  try {
    const userId = req.user.id;
    const metrics = await workflowService.getDashboardMetrics(userId);

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/workflows
 */
async function createWorkflow(req, res, next) {
  try {
    const userId = req.user.id;
    const workflow = await workflowService.createWorkflow(userId, req.body);

    res.status(201).json({
      success: true,
      message: 'Workflow created successfully',
      data: { workflow },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/workflows/:id
 */
async function getWorkflow(req, res, next) {
  try {
    const userId = req.user.id;
    const workflowId = req.params.id;
    const workflow = await workflowService.getWorkflowById(userId, workflowId);

    res.status(200).json({
      success: true,
      data: { workflow },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/workflows/:id
 */
async function updateWorkflow(req, res, next) {
  try {
    const userId = req.user.id;
    const workflowId = req.params.id;
    const updated = await workflowService.updateWorkflow(userId, workflowId, req.body);

    res.status(200).json({
      success: true,
      message: 'Workflow updated successfully',
      data: { workflow: updated },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/workflows/:id/duplicate
 */
async function duplicateWorkflow(req, res, next) {
  try {
    const userId = req.user.id;
    const workflowId = req.params.id;
    const cloned = await workflowService.duplicateWorkflow(userId, workflowId);

    res.status(201).json({
      success: true,
      message: 'Workflow duplicated successfully',
      data: { workflow: cloned },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/workflows/:id
 */
async function deleteWorkflow(req, res, next) {
  try {
    const userId = req.user.id;
    const workflowId = req.params.id;
    const result = await workflowService.deleteWorkflow(userId, workflowId);

    res.status(200).json({
      success: true,
      message: 'Workflow deleted successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/workflows/generate
 */
async function generateWorkflow(req, res, next) {
  try {
    const { prompt } = req.body;
    const result = await aiService.generateWorkflowFromPrompt(prompt);

    res.status(200).json({
      success: true,
      message: `Workflow graph generated successfully via ${result.mode.toUpperCase()}`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/workflows/:id/execute
 */
async function executeWorkflow(req, res, next) {
  try {
    const userId = req.user.id;
    const workflowId = req.params.id;
    const inputs = req.body || {};
    const execution = await executionService.triggerWorkflowExecution(userId, workflowId, inputs, 'manual');

    res.status(201).json({
      success: true,
      message: 'Workflow execution initiated successfully via multi-agent engine',
      data: { execution },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getWorkflows,
  getDashboard,
  createWorkflow,
  getWorkflow,
  updateWorkflow,
  duplicateWorkflow,
  deleteWorkflow,
  generateWorkflow,
  executeWorkflow,
};
