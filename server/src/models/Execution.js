const mongoose = require('mongoose');

const executionSchema = new mongoose.Schema(
  {
    workflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workflow',
      required: [true, 'Workflow ID is required'],
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    workflowSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Workflow snapshot is required for audit and deterministic replay'],
      default: {},
    },
    status: {
      type: String,
      enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'RETRYING', 'PAUSED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    currentNode: {
      type: String,
      default: null,
    },
    startTime: {
      type: Date,
      default: null,
    },
    endTime: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number,
      default: 0, // duration in milliseconds
    },
    inputs: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    outputs: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    error: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    langGraph: {
      type: String,
      enum: ['available', 'not-installed'],
      default: 'not-installed',
    },
    triggeredBy: {
      type: String,
      enum: ['manual', 'webhook', 'schedule', 'api'],
      default: 'manual',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast querying of execution history and status filters
executionSchema.index({ workflowId: 1, status: 1, createdAt: -1 });
executionSchema.index({ owner: 1, createdAt: -1 });
executionSchema.index({ status: 1, createdAt: -1 });

const Execution = mongoose.model('Execution', executionSchema);

module.exports = Execution;
