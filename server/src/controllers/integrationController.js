const integrationService = require('../services/integrationService');
const env = require('../config/env');

/**
 * Integration Controller (Thin Controller)
 * 
 * Handles request parsing and response shaping for OAuth flows and integration settings.
 * Never touches the database directly or exposes unencrypted credentials.
 */

/**
 * GET /api/integrations
 * Lists all integration connections for the authenticated user
 */
async function getIntegrations(req, res, next) {
  try {
    const userId = req.user.id;
    const integrations = await integrationService.getUserIntegrations(userId);

    res.status(200).json({
      success: true,
      message: 'Integrations retrieved successfully',
      data: { integrations },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/integrations/status
 * Health check & token validity for all configured providers
 */
async function getIntegrationsStatus(req, res, next) {
  try {
    const userId = req.user.id;
    const health = await integrationService.getIntegrationsHealth(userId);

    res.status(200).json({
      success: true,
      message: 'Integration status report generated successfully',
      data: { status: health },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/integrations/oauth/:provider/start
 * Initiates OAuth authorization flow
 */
async function startOAuth(req, res, next) {
  try {
    const userId = req.user.id;
    const provider = req.params.provider;
    const result = await integrationService.startOAuth(userId, provider);

    res.status(200).json({
      success: true,
      message: `OAuth redirect URL generated for ${provider}`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/integrations/oauth/:provider/callback
 * Handles OAuth callback from third-party provider
 */
async function handleOAuthCallback(req, res, next) {
  try {
    const provider = req.params.provider;
    const { code, state, error, error_description } = req.query;

    if (error) {
      const redirectUrl = `${env.CLIENT_URL}/integrations?oauth_error=${encodeURIComponent(error_description || error)}`;
      return res.redirect(redirectUrl);
    }

    if (!code || !state) {
      const redirectUrl = `${env.CLIENT_URL}/integrations?oauth_error=Missing+code+or+state`;
      return res.redirect(redirectUrl);
    }

    const result = await integrationService.handleOAuthCallback(provider, code, state);

    // If request explicitly wants HTML (direct browser navigation), redirect to client UI
    const prefersJson = req.headers.accept && req.headers.accept.includes('application/json');
    if (!prefersJson && req.headers.accept && req.headers.accept.includes('text/html')) {
      const successUrl = `${env.CLIENT_URL}/integrations?connected=${encodeURIComponent(provider)}`;
      return res.redirect(successUrl);
    }

    res.status(200).json({
      success: true,
      message: `Successfully connected ${provider} integration`,
      data: result,
    });
  } catch (err) {
    const prefersJson = req.headers.accept && req.headers.accept.includes('application/json');
    if (!prefersJson && req.headers.accept && req.headers.accept.includes('text/html')) {
      const errorUrl = `${env.CLIENT_URL}/integrations?oauth_error=${encodeURIComponent(err.message)}`;
      return res.redirect(errorUrl);
    }
    next(err);
  }
}

/**
 * GET /api/integrations/oauth/error
 * Explicit error landing endpoint
 */
async function getOAuthError(req, res, next) {
  const { error = 'OAuth authorization failed' } = req.query;
  res.status(400).json({
    success: false,
    message: 'OAuth authorization error',
    error,
  });
}

/**
 * POST /api/integrations
 * Manual credential setup (e.g. API keys, Bot tokens)
 */
async function saveCredentials(req, res, next) {
  try {
    const userId = req.user.id;
    const { provider, ...credentialsData } = req.body;

    if (!provider) {
      return res.status(400).json({
        success: false,
        message: 'Provider is required',
      });
    }

    const result = await integrationService.saveManualCredentials(userId, provider, credentialsData);

    res.status(200).json({
      success: true,
      message: `Credentials saved successfully for ${provider}`,
      data: { integration: result },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/integrations/:provider
 * Disconnects provider integration
 */
async function disconnectIntegration(req, res, next) {
  try {
    const userId = req.user.id;
    const provider = req.params.provider;

    const result = await integrationService.disconnectIntegration(userId, provider);

    res.status(200).json({
      success: true,
      message: `Successfully disconnected ${provider} integration`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getIntegrations,
  getIntegrationsStatus,
  startOAuth,
  handleOAuthCallback,
  getOAuthError,
  saveCredentials,
  disconnectIntegration,
};
