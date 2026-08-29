const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Integration = require('../models/Integration');
const { encrypt, decrypt } = require('../utils/crypto');
const env = require('../config/env');

const gmailIntegration = require('../integrations/gmailIntegration');
const slackIntegration = require('../integrations/slackIntegration');
const discordIntegration = require('../integrations/discordIntegration');
const googleSheetsIntegration = require('../integrations/googleSheetsIntegration');

const PROVIDERS = {
  gmail: gmailIntegration,
  slack: slackIntegration,
  discord: discordIntegration,
  'google-sheets': googleSheetsIntegration,
  googlesheets: googleSheetsIntegration,
};

const ALL_SUPPORTED_PROVIDERS = [
  'gmail',
  'slack',
  'google-sheets',
  'discord',
  'openrouter',
  'gemini',
];

/**
 * Generates signed state token for OAuth flows to prevent CSRF and retain user session
 */
function generateOAuthState(userId, provider) {
  return jwt.sign(
    {
      userId: userId.toString(),
      provider,
      nonce: Math.random().toString(36).substring(2, 10),
      createdAt: Date.now(),
    },
    env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

/**
 * Verifies signed state token
 */
function verifyOAuthState(state) {
  try {
    return jwt.verify(state, env.JWT_SECRET);
  } catch (err) {
    const error = new Error('Invalid or expired OAuth state parameter');
    error.status = 400;
    error.statusCode = 400;
    throw error;
  }
}

/**
 * Lists all integrations for user (merges stored records with full provider catalog)
 */
async function getUserIntegrations(userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const storedIntegrations = await Integration.find({ owner: userObjectId }).lean();

  const storedMap = {};
  storedIntegrations.forEach((item) => {
    storedMap[item.provider] = item;
  });

  // Return full list including unconfigured providers
  return ALL_SUPPORTED_PROVIDERS.map((provider) => {
    const stored = storedMap[provider];
    const isAiProvider = provider === 'openrouter' || provider === 'gemini';

    let isConfiguredFromEnv = false;
    if (provider === 'openrouter' && env.OPENROUTER_API_KEY) isConfiguredFromEnv = true;
    if (provider === 'gemini' && env.GEMINI_API_KEY) isConfiguredFromEnv = true;

    return {
      provider,
      isConnected: stored?.isConnected || isConfiguredFromEnv || false,
      accountIdentifier: stored?.accountIdentifier || (isConfiguredFromEnv ? 'Configured via Environment' : null),
      scopes: stored?.scopes || [],
      expiresAt: stored?.expiresAt || null,
      lastTestedAt: stored?.lastTestedAt || null,
      metadata: stored?.metadata || {},
      category: isAiProvider ? 'ai' : 'tool',
      authType: isAiProvider ? 'api_key' : 'oauth',
    };
  });
}

/**
 * Checks connectivity and health for all user integrations
 */
async function getIntegrationsHealth(userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const storedIntegrations = await Integration.find({ owner: userObjectId })
    .select('+encryptedAccessToken +encryptedApiKey +encryptedBotToken +iv +authTag')
    .lean();

  const results = {};

  for (const stored of storedIntegrations) {
    const adapter = PROVIDERS[stored.provider];
    if (adapter && stored.isConnected) {
      const credentials = {
        accessToken: decrypt({ ciphertext: stored.encryptedAccessToken, iv: stored.iv, tag: stored.authTag }),
        apiKey: decrypt({ ciphertext: stored.encryptedApiKey, iv: stored.iv, tag: stored.authTag }),
        botToken: decrypt({ ciphertext: stored.encryptedBotToken, iv: stored.iv, tag: stored.authTag }),
        expiresAt: stored.expiresAt,
        accountIdentifier: stored.accountIdentifier,
      };

      try {
        const testResult = await adapter.testConnection(credentials);
        results[stored.provider] = {
          connected: testResult.connected,
          status: testResult.status,
          account: testResult.accountIdentifier,
          lastTestedAt: new Date().toISOString(),
        };

        // Update last tested in background
        Integration.findByIdAndUpdate(stored._id, { lastTestedAt: new Date() }).exec();
      } catch (err) {
        results[stored.provider] = {
          connected: false,
          status: 'ERROR',
          message: err.message,
        };
      }
    } else {
      results[stored.provider] = {
        connected: stored.isConnected,
        status: stored.isConnected ? 'ACTIVE' : 'DISCONNECTED',
      };
    }
  }

  return results;
}

/**
 * Initiates OAuth flow by creating signed state and returning authorization redirect URL
 */
async function startOAuth(userId, provider) {
  const normalizedProvider = provider.toLowerCase();
  const adapter = PROVIDERS[normalizedProvider];

  if (!adapter) {
    const error = new Error(`Provider [${provider}] does not support OAuth authentication`);
    error.status = 400;
    error.statusCode = 400;
    throw error;
  }

  const hasValidClientId =
    adapter.config.clientId &&
    adapter.config.clientId !== 'google_client_id_placeholder' &&
    adapter.config.clientId !== 'slack_client_id_placeholder' &&
    adapter.config.clientId !== 'discord_client_id_placeholder' &&
    !adapter.config.clientId.includes('placeholder');

  if (!hasValidClientId) {
    const requiredEnv =
      normalizedProvider === 'gmail' || normalizedProvider === 'google-sheets'
        ? 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET'
        : `${normalizedProvider.toUpperCase()}_CLIENT_ID and ${normalizedProvider.toUpperCase()}_CLIENT_SECRET`;
    const error = new Error(
      `OAuth client credentials for ${normalizedProvider.toUpperCase()} are not configured on the server. Please define ${requiredEnv} in server/.env to enable live OAuth.`
    );
    error.code = 'OAUTH_NOT_CONFIGURED';
    error.status = 400;
    error.statusCode = 400;
    error.provider = normalizedProvider;
    error.requiredEnv = requiredEnv;
    throw error;
  }

  const state = generateOAuthState(userId, normalizedProvider);
  const authUrl = adapter.getAuthUrl(state);

  return {
    authUrl,
    state,
    provider: normalizedProvider,
  };
}

/**
 * Handles OAuth callback, exchanges code for tokens, encrypts credentials and persists Integration record
 */
async function handleOAuthCallback(provider, code, state) {
  const decodedState = verifyOAuthState(state);
  const userId = decodedState.userId;
  const normalizedProvider = (decodedState.provider || provider).toLowerCase();

  const adapter = PROVIDERS[normalizedProvider];
  if (!adapter) {
    const error = new Error(`Unsupported provider: ${normalizedProvider}`);
    error.status = 400;
    error.statusCode = 400;
    throw error;
  }

  // Exchange code via provider adapter
  const tokenData = await adapter.handleOAuthCallback(code, state);

  // Encrypt tokens using AES-256-GCM
  const encryptedAccess = encrypt(tokenData.accessToken);
  const encryptedRefresh = encrypt(tokenData.refreshToken);

  const updatePayload = {
    isConnected: true,
    scopes: tokenData.scopes || [],
    encryptedAccessToken: encryptedAccess?.ciphertext || null,
    encryptedRefreshToken: encryptedRefresh?.ciphertext || null,
    iv: encryptedAccess?.iv || null,
    authTag: encryptedAccess?.tag || null,
    expiresAt: tokenData.expiresAt || null,
    accountIdentifier: tokenData.accountIdentifier || 'Connected Account',
    metadata: tokenData.metadata || {},
    lastTestedAt: new Date(),
  };

  const integration = await Integration.findOneAndUpdate(
    { owner: new mongoose.Types.ObjectId(userId), provider: normalizedProvider },
    { $set: updatePayload },
    { new: true, upsert: true }
  );

  return {
    success: true,
    provider: normalizedProvider,
    accountIdentifier: integration.accountIdentifier,
    isConnected: true,
    expiresAt: integration.expiresAt,
  };
}

/**
 * Saves manual credentials (e.g. API keys, Bot tokens)
 */
async function saveManualCredentials(userId, provider, data = {}) {
  const normalizedProvider = provider.toLowerCase();

  const { apiKey, botToken, accessToken, accountIdentifier, metadata = {} } = data;

  const rawToken = apiKey || botToken || accessToken || `manual_token_${Date.now()}`;
  const encrypted = encrypt(rawToken);

  const updatePayload = {
    isConnected: true,
    scopes: data.scopes || [],
    encryptedAccessToken: encrypted?.ciphertext || null,
    encryptedApiKey: apiKey ? encrypted?.ciphertext : null,
    encryptedBotToken: botToken ? encrypted?.ciphertext : null,
    iv: encrypted?.iv || null,
    authTag: encrypted?.tag || null,
    expiresAt: data.expiresAt || null,
    accountIdentifier: accountIdentifier || `${normalizedProvider.toUpperCase()} Account`,
    metadata: { ...metadata, configuredVia: 'manual' },
    lastTestedAt: new Date(),
  };

  const integration = await Integration.findOneAndUpdate(
    { owner: new mongoose.Types.ObjectId(userId), provider: normalizedProvider },
    { $set: updatePayload },
    { new: true, upsert: true }
  );

  return {
    provider: normalizedProvider,
    isConnected: true,
    accountIdentifier: integration.accountIdentifier,
    lastTestedAt: integration.lastTestedAt,
  };
}

/**
 * Disconnects an integration and clears encrypted credentials
 */
async function disconnectIntegration(userId, provider) {
  const normalizedProvider = provider.toLowerCase();

  const integration = await Integration.findOneAndUpdate(
    { owner: new mongoose.Types.ObjectId(userId), provider: normalizedProvider },
    {
      $set: {
        isConnected: false,
        encryptedAccessToken: null,
        encryptedRefreshToken: null,
        encryptedApiKey: null,
        encryptedBotToken: null,
        iv: null,
        authTag: null,
        accountIdentifier: null,
        expiresAt: null,
      },
    },
    { new: true }
  );

  return {
    provider: normalizedProvider,
    isConnected: false,
  };
}

/**
 * Internal helper to retrieve decrypted credentials for execution agent
 */
async function getDecryptedCredentials(userId, provider) {
  const normalizedProvider = provider.toLowerCase();

  const integration = await Integration.findOne({
    owner: new mongoose.Types.ObjectId(userId),
    provider: normalizedProvider,
  }).select('+encryptedAccessToken +encryptedRefreshToken +encryptedApiKey +encryptedBotToken +iv +authTag');

  if (!integration || !integration.isConnected) {
    return null;
  }

  return {
    accessToken: decrypt({ ciphertext: integration.encryptedAccessToken, iv: integration.iv, tag: integration.authTag }),
    refreshToken: decrypt({ ciphertext: integration.encryptedRefreshToken, iv: integration.iv, tag: integration.authTag }),
    apiKey: decrypt({ ciphertext: integration.encryptedApiKey, iv: integration.iv, tag: integration.authTag }),
    botToken: decrypt({ ciphertext: integration.encryptedBotToken, iv: integration.iv, tag: integration.authTag }),
    expiresAt: integration.expiresAt,
    accountIdentifier: integration.accountIdentifier,
  };
}

/**
 * Executes an action on a third-party integration
 */
async function executeIntegrationAction(userId, provider, action, config = {}, inputs = {}) {
  const normalizedProvider = provider.toLowerCase();
  const adapter = PROVIDERS[normalizedProvider];

  if (!adapter) {
    throw new Error(`Provider [${provider}] is not supported`);
  }

  const credentials = await getDecryptedCredentials(userId, normalizedProvider);
  return await adapter.execute(action, config, inputs, credentials);
}

module.exports = {
  getUserIntegrations,
  getIntegrationsHealth,
  startOAuth,
  handleOAuthCallback,
  saveManualCredentials,
  disconnectIntegration,
  getDecryptedCredentials,
  executeIntegrationAction,
  generateOAuthState,
  verifyOAuthState,
};
