const Workflow = require('../models/Workflow');
const mongoose = require('mongoose');

/**
 * List workflows for a user with search, filtering, sorting, and pagination
 */
async function listWorkflows(userId, queryParams = {}) {
  const {
    search = '',
    status = '',
    tag = '',
    page = 1,
    limit = 10,
    sortBy = 'updatedAt',
    sortOrder = 'desc',
  } = queryParams;

  const pageNumber = Math.max(1, parseInt(page, 10));
  const limitNumber = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNumber - 1) * limitNumber;

  const filter = { owner: new mongoose.Types.ObjectId(userId) };

  if (status && ['draft', 'active', 'paused', 'archived'].includes(status)) {
    filter.status = status;
  }

  if (tag && tag.trim() !== '') {
    filter.tags = tag.trim();
  }

  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { name: searchRegex },
      { description: searchRegex },
      { tags: searchRegex },
    ];
  }

  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  const sortObject = { [sortBy]: sortDirection };

  const [workflows, total] = await Promise.all([
    Workflow.find(filter)
      .sort(sortObject)
      .skip(skip)
      .limit(limitNumber)
      .lean(),
    Workflow.countDocuments(filter),
  ]);

  return {
    workflows,
    pagination: {
      total,
      page: pageNumber,
      limit: limitNumber,
      pages: Math.ceil(total / limitNumber),
    },
  };
}

/**
 * Create a new workflow manually with optional initial nodes/trigger
 */
async function createWorkflow(userId, data = {}) {
  const {
    name = 'Untitled Workflow',
    description = '',
    status = 'draft',
    triggerConfig = { type: 'manual' },
    nodes = [],
    edges = [],
    tags = [],
  } = data;

  // If no nodes provided, provide a default manual trigger node to start with
  const initialNodes = nodes.length > 0 ? nodes : [
    {
      id: 'trigger-1',
      type: 'customNode',
      position: { x: 250, y: 150 },
      data: {
        label: 'Manual Trigger',
        nodeType: 'trigger',
        category: 'trigger',
        description: 'Triggers workflow on demand',
        config: { type: 'manual' },
      },
    },
  ];

  const workflow = await Workflow.create({
    name: name.trim(),
    description: description.trim(),
    owner: userId,
    status,
    triggerConfig,
    nodes: initialNodes,
    edges,
    tags,
    version: 1,
  });

  return workflow;
}

/**
 * Fetch a single workflow by ID ensuring user ownership
 */
async function getWorkflowById(userId, workflowId) {
  if (!mongoose.Types.ObjectId.isValid(workflowId)) {
    const error = new Error('Invalid workflow ID');
    error.statusCode = 400;
    throw error;
  }

  const workflow = await Workflow.findOne({
    _id: workflowId,
    owner: userId,
  });

  if (!workflow) {
    const error = new Error('Workflow not found');
    error.statusCode = 404;
    throw error;
  }

  return workflow;
}

/**
 * Update an existing workflow structure, increments version on node/edge changes
 */
async function updateWorkflow(userId, workflowId, updateData = {}) {
  const workflow = await getWorkflowById(userId, workflowId);

  const allowedUpdates = [
    'name',
    'description',
    'status',
    'triggerConfig',
    'nodes',
    'edges',
    'tags',
  ];

  let hasGraphChanges = false;

  allowedUpdates.forEach((field) => {
    if (updateData[field] !== undefined) {
      if (field === 'nodes' || field === 'edges') {
        hasGraphChanges = true;
      }
      workflow[field] = updateData[field];
    }
  });

  if (hasGraphChanges) {
    workflow.version += 1;
  }

  await workflow.save();
  return workflow;
}

/**
 * Duplicate/Clone an existing workflow
 */
async function duplicateWorkflow(userId, workflowId) {
  const sourceWorkflow = await getWorkflowById(userId, workflowId);

  const clonedWorkflow = await Workflow.create({
    name: `${sourceWorkflow.name} (Copy)`,
    description: sourceWorkflow.description,
    owner: userId,
    status: 'draft',
    triggerConfig: sourceWorkflow.triggerConfig,
    nodes: sourceWorkflow.nodes,
    edges: sourceWorkflow.edges,
    tags: sourceWorkflow.tags,
    version: 1,
  });

  return clonedWorkflow;
}

/**
 * Delete a workflow
 */
async function deleteWorkflow(userId, workflowId) {
  const workflow = await getWorkflowById(userId, workflowId);
  await Workflow.deleteOne({ _id: workflow._id });
  return { id: workflowId, deleted: true };
}

/**
 * Get aggregated workflow stats for dashboard metrics
 */
async function getDashboardMetrics(userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const [statusCounts, totalWorkflows, recentWorkflows] = await Promise.all([
    Workflow.aggregate([
      { $match: { owner: userObjectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Workflow.countDocuments({ owner: userObjectId }),
    Workflow.find({ owner: userObjectId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean(),
  ]);

  const countsByStatus = {
    draft: 0,
    active: 0,
    paused: 0,
    archived: 0,
  };

  statusCounts.forEach((item) => {
    if (countsByStatus[item._id] !== undefined) {
      countsByStatus[item._id] = item.count;
    }
  });

  return {
    totalWorkflows,
    countsByStatus,
    recentWorkflows,
  };
}

module.exports = {
  listWorkflows,
  createWorkflow,
  getWorkflowById,
  updateWorkflow,
  duplicateWorkflow,
  deleteWorkflow,
  getDashboardMetrics,
};
