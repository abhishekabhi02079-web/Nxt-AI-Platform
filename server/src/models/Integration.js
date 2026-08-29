const mongoose = require('mongoose');

const integrationSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Integration owner is required'],
      index: true,
    },
    provider: {
      type: String,
      enum: ['gmail', 'slack', 'google-sheets', 'discord', 'openrouter', 'gemini'],
      required: [true, 'Integration provider is required'],
      index: true,
    },
    isConnected: {
      type: Boolean,
      default: false,
      index: true,
    },
    scopes: {
      type: [String],
      default: [],
    },
    // Encrypted token payloads stored as ciphertext (AES-256-GCM)
    encryptedAccessToken: {
      type: String,
      default: null,
      select: false, // Never return tokens in standard queries
    },
    encryptedRefreshToken: {
      type: String,
      default: null,
      select: false,
    },
    encryptedApiKey: {
      type: String,
      default: null,
      select: false,
    },
    encryptedBotToken: {
      type: String,
      default: null,
      select: false,
    },
    iv: {
      type: String,
      default: null,
      select: false,
    },
    authTag: {
      type: String,
      default: null,
      select: false,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    accountIdentifier: {
      type: String,
      default: null, // e.g. operator@agentflow.ai, #ops-team, Discord Bot #123
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    lastTestedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one provider record per user
integrationSchema.index({ owner: 1, provider: 1 }, { unique: true });
integrationSchema.index({ owner: 1, isConnected: 1 });

const Integration = mongoose.model('Integration', integrationSchema);

module.exports = Integration;
