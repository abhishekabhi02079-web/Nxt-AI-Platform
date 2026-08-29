/**
 * Base Integration Adapter (Pure Class Interface)
 * 
 * Defines the unified interface that all third-party provider integrations must implement.
 * Wraps provider-specific protocols, OAuth flows, connection health tests, and action executions.
 */

class BaseIntegration {
  constructor(providerName, config = {}) {
    this.providerName = providerName;
    this.config = config;
  }

  /**
   * Generates OAuth authorization URL
   * 
   * @param {string} state - Cryptographically signed state token
   * @param {Object} [options] - Additional query params
   * @returns {string} Provider authorization redirect URL
   */
  getAuthUrl(state, options = {}) {
    throw new Error(`getAuthUrl not implemented for provider ${this.providerName}`);
  }

  /**
   * Exchanges OAuth authorization code for tokens
   * 
   * @param {string} code - OAuth auth code
   * @param {string} [state] - State parameter
   * @returns {Promise<Object>} { accessToken, refreshToken, expiresAt, accountIdentifier, scopes, metadata }
   */
  async handleOAuthCallback(code, state) {
    throw new Error(`handleOAuthCallback not implemented for provider ${this.providerName}`);
  }

  /**
   * Tests provider connection with decrypted credentials
   * 
   * @param {Object} credentials - Decrypted credentials object
   * @returns {Promise<Object>} { connected: boolean, accountIdentifier: string, status: string }
   */
  async testConnection(credentials) {
    throw new Error(`testConnection not implemented for provider ${this.providerName}`);
  }

  /**
   * Executes a workflow node action against this integration
   * 
   * @param {string} action - Action name (e.g. 'send_email', 'post_message', 'append_row')
   * @param {Object} config - Node configuration
   * @param {Object} inputs - Step inputs
   * @param {Object} credentials - Decrypted credentials
   * @returns {Promise<Object>} Action output payload
   */
  async execute(action, config = {}, inputs = {}, credentials = null) {
    throw new Error(`execute not implemented for provider ${this.providerName}`);
  }

  /**
   * Helper to format not-connected error
   */
  createNotConnectedError(message = null) {
    const error = new Error(
      message || `Integration [${this.providerName.toUpperCase()}] is not connected or credentials are missing`
    );
    error.code = 'INTEGRATION_NOT_CONNECTED';
    error.status = 400;
    error.statusCode = 400;
    error.provider = this.providerName;
    return error;
  }

  /**
   * Helper to format expired-auth error
   */
  createAuthExpiredError(message = null) {
    const error = new Error(
      message || `Authentication for [${this.providerName.toUpperCase()}] has expired. Re-authentication required.`
    );
    error.code = 'AUTH_EXPIRED';
    error.status = 401;
    error.statusCode = 401;
    error.provider = this.providerName;
    return error;
  }
}

module.exports = BaseIntegration;
