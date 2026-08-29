const mongoose = require('mongoose');

const workflowSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workflow name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Workflow owner is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'archived'],
      default: 'draft',
      index: true,
    },
    triggerConfig: {
      type: {
        type: String,
        enum: ['manual', 'webhook', 'schedule', 'event'],
        default: 'manual',
      },
      cron: { type: String, default: '' },
      webhookPath: { type: String, default: '' },
      eventSource: { type: String, default: '' },
      settings: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    nodes: {
      type: [
        {
          id: { type: String, required: true },
          type: { type: String, default: 'customNode' },
          position: {
            x: { type: Number, default: 0 },
            y: { type: Number, default: 0 },
          },
          data: {
            label: { type: String, default: 'New Node' },
            nodeType: { type: String, required: true }, // 'trigger' | 'gmail' | 'slack' | 'discord' | 'google-sheets' | 'llm' | 'condition'
            category: { type: String, default: 'action' }, // 'trigger' | 'action' | 'ai' | 'logic'
            config: { type: mongoose.Schema.Types.Mixed, default: {} },
            inputs: { type: Array, default: [] },
            outputs: { type: Array, default: [] },
            description: { type: String, default: '' },
          },
        },
      ],
      default: [],
    },
    edges: {
      type: [
        {
          id: { type: String, required: true },
          source: { type: String, required: true },
          target: { type: String, required: true },
          sourceHandle: { type: String, default: null },
          targetHandle: { type: String, default: null },
          animated: { type: Boolean, default: true },
          style: { type: mongoose.Schema.Types.Mixed, default: {} },
          label: { type: String, default: '' },
        },
      ],
      default: [],
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user workflows search & filter
workflowSchema.index({ owner: 1, status: 1, updatedAt: -1 });
workflowSchema.index({ owner: 1, name: 'text', description: 'text', tags: 'text' });

const Workflow = mongoose.model('Workflow', workflowSchema);

module.exports = Workflow;
