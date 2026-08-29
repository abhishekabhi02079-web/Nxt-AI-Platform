/**
 * Recovery Agent (Pure Module)
 * 
 * Classifies node execution and validation failures into standard error categories:
 * - MISSING_FIELDS
 * - API_FAILURE
 * - AUTH_EXPIRED
 * - RATE_LIMIT
 * - TRANSIENT
 * 
 * Decides whether to `retry_with_backoff` or `escalate`, and calculates exponential
 * backoff delay intervals with jitter.
 * 
 * Does NOT contain HTTP/Express or database logic.
 */

const FAILURE_TYPES = {
  INTEGRATION_NOT_CONNECTED: 'INTEGRATION_NOT_CONNECTED',
  MISSING_FIELDS: 'MISSING_FIELDS',
  API_FAILURE: 'API_FAILURE',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  RATE_LIMIT: 'RATE_LIMIT',
  TRANSIENT: 'TRANSIENT',
};

const DEFAULT_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

/**
 * Classifies a failure based on error object or validation report.
 * 
 * @param {Object} error - Error or validation failure object
 * @returns {string} One of FAILURE_TYPES
 */
function classifyFailure(error = {}) {
  if (error.missingFields && error.missingFields.length > 0) {
    return FAILURE_TYPES.MISSING_FIELDS;
  }

  const code = (error.code || '').toUpperCase();
  const message = (error.message || '').toLowerCase();
  const status = error.status || error.statusCode || 0;

  // 1. Explicit Integration Not Connected check (Must NOT retry with backoff)
  if (
    code === 'INTEGRATION_NOT_CONNECTED' ||
    message.includes('not connected') ||
    message.includes('missing credential') ||
    message.includes('no access token found') ||
    message.includes('no bot token found') ||
    message.includes('connect the integration') ||
    message.includes('reconnect via integrations')
  ) {
    return FAILURE_TYPES.INTEGRATION_NOT_CONNECTED;
  }

  // 2. Expired / Revoked Auth check (Must NOT retry with backoff)
  if (
    code === 'AUTH_EXPIRED' ||
    status === 401 ||
    status === 403 ||
    message.includes('token expired') ||
    message.includes('expired') ||
    message.includes('unauthorized') ||
    message.includes('auth expired')
  ) {
    return FAILURE_TYPES.AUTH_EXPIRED;
  }

  // 3. Rate Limits (Retry with backoff)
  if (
    code === 'RATE_LIMIT' ||
    status === 429 ||
    message.includes('rate limit') ||
    message.includes('quota exceeded') ||
    message.includes('too many requests')
  ) {
    return FAILURE_TYPES.RATE_LIMIT;
  }

  // 4. Transient network errors (Retry with backoff)
  if (
    code === 'TRANSIENT' ||
    status === 503 ||
    status === 504 ||
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('network') ||
    message.includes('transient')
  ) {
    return FAILURE_TYPES.TRANSIENT;
  }

  return FAILURE_TYPES.API_FAILURE;
}

/**
 * Analyzes failure and decides recovery strategy (retry_with_backoff vs escalate).
 * 
 * @param {Object} params
 * @param {Object} params.error - Error or validation failure object
 * @param {number} [params.retryCount=0] - Current retry count for the node
 * @param {Object} [params.options] - Custom retry parameters
 * @returns {Object} { failureType, decision: 'retry_with_backoff'|'escalate', backoffMs, reason, retryCount, maxRetries }
 */
function analyzeFailure({ error = {}, retryCount = 0, options = {} }) {
  const config = { ...DEFAULT_CONFIG, ...options };
  const failureType = classifyFailure(error);
  const maxRetries = config.maxRetries;

  let decision = 'escalate';
  let reason = '';
  let backoffMs = 0;

  // Decision logic per failure type
  switch (failureType) {
    case FAILURE_TYPES.INTEGRATION_NOT_CONNECTED: {
      let rawProvider = error.provider;
      if (!rawProvider || rawProvider === 'action' || rawProvider === 'custom') {
        const msg = error.message || '';
        if (msg.toLowerCase().includes('slack')) rawProvider = 'Slack';
        else if (msg.toLowerCase().includes('gmail')) rawProvider = 'Gmail';
        else if (msg.toLowerCase().includes('discord')) rawProvider = 'Discord';
        else if (msg.toLowerCase().includes('google-sheets') || msg.toLowerCase().includes('sheets')) rawProvider = 'Google Sheets';
        else rawProvider = 'Third-Party';
      }
      const providerName = rawProvider.toUpperCase();
      decision = 'escalate';
      reason = `${providerName} integration is not connected. Please navigate to the Integrations page (/integrations) and connect your ${providerName} account before running this workflow.`;
      break;
    }

    case FAILURE_TYPES.AUTH_EXPIRED: {
      let rawProvider = error.provider;
      if (!rawProvider || rawProvider === 'action' || rawProvider === 'custom') {
        const msg = error.message || '';
        if (msg.toLowerCase().includes('slack')) rawProvider = 'Slack';
        else if (msg.toLowerCase().includes('gmail')) rawProvider = 'Gmail';
        else if (msg.toLowerCase().includes('discord')) rawProvider = 'Discord';
        else if (msg.toLowerCase().includes('google-sheets') || msg.toLowerCase().includes('sheets')) rawProvider = 'Google Sheets';
        else rawProvider = 'Third-Party';
      }
      const providerName = rawProvider.toUpperCase();
      decision = 'escalate';
      reason = `Authentication credentials for ${providerName} have expired or been revoked. Please reconnect via the Integrations page (/integrations).`;
      break;
    }

    case FAILURE_TYPES.RATE_LIMIT:
    case FAILURE_TYPES.TRANSIENT: {
      if (retryCount < maxRetries) {
        decision = 'retry_with_backoff';
        reason = `${failureType} encountered. Retry attempt ${retryCount + 1}/${maxRetries} scheduled.`;
      } else {
        decision = 'escalate';
        reason = `Max retries (${maxRetries}) exceeded for ${failureType}.`;
      }
      break;
    }

    case FAILURE_TYPES.API_FAILURE: {
      // General API failures can be retried up to 2 times
      if (retryCount < Math.min(2, maxRetries)) {
        decision = 'retry_with_backoff';
        reason = `Upstream API failure. Retrying attempt ${retryCount + 1}.`;
      } else {
        decision = 'escalate';
        reason = `API failure escalated to operator after ${retryCount} retries.`;
      }
      break;
    }

    case FAILURE_TYPES.MISSING_FIELDS: {
      decision = 'escalate';
      reason = `Validation contract failed due to missing fields: ${(error.missingFields || []).join(', ')}. Graph schema requires manual inspection.`;
      break;
    }

    default: {
      decision = 'escalate';
      reason = 'Unclassified failure requires operator escalation.';
      break;
    }
  }

  // Calculate exponential backoff with jitter if retrying
  if (decision === 'retry_with_backoff') {
    const exponential = config.baseDelayMs * Math.pow(2, retryCount);
    const jitter = Math.floor(Math.random() * 150);
    backoffMs = Math.min(config.maxDelayMs, exponential + jitter);
  }

  return {
    failureType,
    decision, // 'retry_with_backoff' | 'escalate'
    backoffMs,
    reason,
    retryCount,
    maxRetries,
    canRetry: decision === 'retry_with_backoff',
  };
}

module.exports = {
  FAILURE_TYPES,
  classifyFailure,
  analyzeFailure,
};
