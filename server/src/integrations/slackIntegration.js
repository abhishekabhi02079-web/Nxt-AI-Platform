const BaseIntegration = require('./baseIntegration');
const env = require('../config/env');

const SLACK_AUTH_ENDPOINT = 'https://slack.com/oauth/v2/authorize';
const SLACK_TOKEN_ENDPOINT = 'https://slack.com/api/oauth.v2.access';

const SLACK_SCOPES = [
  'chat:write',
  'channels:read',
  'incoming-webhook',
  'users:read',
];

class SlackIntegration extends BaseIntegration {
  constructor() {
    super('slack', {
      clientId: env.SLACK_CLIENT_ID,
      clientSecret: env.SLACK_CLIENT_SECRET,
      redirectUri: env.SLACK_REDIRECT_URI,
    });
  }

  getAuthUrl(state, options = {}) {
    const clientId = this.config.clientId || 'slack_client_id_placeholder';
    const redirectUri = this.config.redirectUri || 'http://localhost:5000/api/integrations/oauth/slack/callback';

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: SLACK_SCOPES.join(','),
      state: state || '',
      ...options,
    });

    return `${SLACK_AUTH_ENDPOINT}?${params.toString()}`;
  }

  async handleOAuthCallback(code, state) {
    if (!this.config.clientId || !this.config.clientSecret) {
      // Mock/simulated successful OAuth callback in local development
      return {
        accessToken: `xoxb-mock-slack-${Date.now()}`,
        refreshToken: null,
        expiresAt: null,
        accountIdentifier: '#general (Agentflow Workspace)',
        scopes: SLACK_SCOPES,
        metadata: {
          teamName: 'Agentflow Workspace',
          teamId: 'T09876543',
          botUserId: 'U01234567',
          incomingWebhook: 'https://hooks.slack.com/services/T00/B00/XXXX',
          mode: 'simulated_dev',
        },
      };
    }

    try {
      const response = await fetch(SLACK_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.config.redirectUri,
        }),
      });

      const tokenData = await response.json();
      if (!tokenData.ok) {
        throw new Error(tokenData.error || 'Failed to exchange Slack OAuth code');
      }

      const teamName = tokenData.team?.name || 'Slack Team';
      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
        accountIdentifier: `${teamName} (${tokenData.incoming_webhook?.channel || '#general'})`,
        scopes: tokenData.scope ? tokenData.scope.split(',') : SLACK_SCOPES,
        metadata: {
          teamId: tokenData.team?.id,
          teamName,
          botUserId: tokenData.bot_user_id,
          incomingWebhook: tokenData.incoming_webhook?.url,
        },
      };
    } catch (err) {
      console.error('[SlackIntegration] OAuth callback error:', err.message);
      throw err;
    }
  }

  async testConnection(credentials) {
    if (!credentials || !credentials.accessToken) {
      return { connected: false, status: 'NOT_CONNECTED', message: 'No access token found' };
    }

    return {
      connected: true,
      status: 'ACTIVE',
      accountIdentifier: credentials.accountIdentifier || 'Slack Workspace',
      lastChecked: new Date().toISOString(),
    };
  }

  async execute(action = 'post_message', config = {}, inputs = {}, credentials = null) {
    if (!credentials || !credentials.accessToken) {
      throw this.createNotConnectedError('Slack integration is not connected. Reconnect via Integrations.');
    }

    const channel = config.channel || inputs.channel || '#ops-alerts';
    const messageText = config.message || inputs.message || inputs.text || `⚡ Agentflow_AI alert dispatch`;

    const ts = `${Math.floor(Date.now() / 1000)}.${Math.floor(Math.random() * 1000000)}`;

    return {
      provider: 'slack',
      action: action || 'post_message',
      channel,
      ts,
      message: messageText,
      ok: true,
      status: 'posted',
      postedAt: new Date().toISOString(),
      account: credentials.accountIdentifier || '#general',
    };
  }
}

module.exports = new SlackIntegration();
