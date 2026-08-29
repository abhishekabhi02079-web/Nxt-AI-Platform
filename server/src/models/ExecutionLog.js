const mongoose = require('mongoose');

const executionLogSchema = new mongoose.Schema(
  {
    executionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Execution',
      required: [true, 'Execution ID is required'],
      index: true,
    },
    workflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workflow',
      required: [true, 'Workflow ID is required'],
      index: true,
    },
    nodeId: {
      type: String,
      default: null,
      index: true,
    },
    agent: {
      type: String,
      enum: ['planner', 'execution', 'validation', 'recovery', 'monitoring'],
      required: [true, 'Agent type is required'],
      index: true,
    },
    level: {
      type: String,
      enum: ['info', 'warning', 'error', 'success'],
      default: 'info',
      index: true,
    },
    message: {
      type: String,
      required: [true, 'Log message is required'],
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for timeline chronological retrieval and agent filtering
executionLogSchema.index({ executionId: 1, createdAt: 1 });
executionLogSchema.index({ executionId: 1, agent: 1, createdAt: 1 });
executionLogSchema.index({ workflowId: 1, createdAt: -1 });

const ExecutionLog = mongoose.model('ExecutionLog', executionLogSchema);

module.exports = ExecutionLog;
