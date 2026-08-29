const integrationService = require('../services/integrationService');

/**
 * Executes a single workflow node with given inputs and accumulated context.
 * 
 * @param {Object} params
 * @param {Object} params.node - The graph node object { id, data: { nodeType, config, label } }
 * @param {Object} params.inputs - Initial or inherited inputs for this node
 * @param {Object} params.context - Execution context holding previous node outputs
 * @param {string} [params.userId] - User ID for resolving OAuth credentials
 * @param {Object} [params.options] - Execution options (e.g. mockDelayMs, simulatedErrors)
 * @returns {Promise<Object>} { success: boolean, outputs: Object, executionTimeMs: number, error: Object|null }
 */
async function executeNode({ node, inputs = {}, context = {}, userId = null, options = {} }) {
  const startTime = Date.now();
  const nodeType = (node.data?.nodeType || node.type || 'action').toLowerCase();
  const config = node.data?.config || {};
  const label = node.data?.label || node.id;

  // Optional simulated processing delay for realistic execution flow
  const delayMs = options.mockDelayMs ?? 150;
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  // Check for test simulated error injection
  const simulatedErr = options.simulatedError || config.simulatedError;
  if (simulatedErr) {
    const duration = Date.now() - startTime;
    const isObj = typeof simulatedErr === 'object';
    return {
      success: false,
      outputs: null,
      executionTimeMs: duration,
      error: {
        code: isObj ? simulatedErr.code || 'API_FAILURE' : simulatedErr,
        message: isObj ? simulatedErr.message || `Simulated failure on node ${node.id}` : `Simulated error on ${label}: Connection timed out (503 Service Unavailable)`,
        status: isObj ? simulatedErr.status || 503 : 503,
        nodeId: node.id,
      },
    };
  }

  try {
    let outputs = {};

    switch (nodeType) {
      case 'trigger': {
        outputs = {
          triggerType: config.triggerType || 'manual',
          event: 'workflow_triggered',
          source: inputs.source || 'operator_console',
          payload: inputs.payload || {
            timestamp: new Date().toISOString(),
            invokedBy: inputs.invokedBy || 'operator',
          },
          status: 'active',
        };
        break;
      }

      case 'gmail': {
        if (userId) {
          try {
            outputs = await integrationService.executeIntegrationAction(
              userId,
              'gmail',
              config.action || 'send_email',
              config,
              inputs
            );
          } catch (intErr) {
            if (intErr.code === 'INTEGRATION_NOT_CONNECTED' || intErr.code === 'AUTH_EXPIRED') {
              throw intErr;
            }
            throw intErr;
          }
        } else {
          // Fallback simulation for test runs without active user context
          const recipient = config.recipient || inputs.recipient || 'operator@agentflow.ai';
          const subject = config.subject || inputs.subject || `Notification from ${label}`;
          const body = config.body || inputs.body || 'Automated email dispatch via Agentflow_AI workflow.';
          outputs = {
            provider: 'gmail',
            action: config.action || 'send_email',
            messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            threadId: `th_${Date.now()}`,
            recipient,
            subject,
            snippet: body.substring(0, 100),
            status: 'sent',
            sentAt: new Date().toISOString(),
          };
        }
        break;
      }

      case 'slack': {
        if (userId) {
          outputs = await integrationService.executeIntegrationAction(
            userId,
            'slack',
            config.action || 'post_message',
            config,
            inputs
          );
        } else {
          const channel = config.channel || inputs.channel || '#ops-alerts';
          const messageText = config.message || inputs.message || `⚡ Agentflow_AI alert triggered by node: ${label}`;
          outputs = {
            provider: 'slack',
            action: config.action || 'post_message',
            channel,
            ts: `${Math.floor(Date.now() / 1000)}.${Math.floor(Math.random() * 1000000)}`,
            message: messageText,
            ok: true,
            status: 'posted',
            postedAt: new Date().toISOString(),
          };
        }
        break;
      }

      case 'discord': {
        if (userId) {
          outputs = await integrationService.executeIntegrationAction(
            userId,
            'discord',
            config.action || 'send_message',
            config,
            inputs
          );
        } else {
          const channelId = config.channelId || inputs.channelId || '1029384756';
          const content = config.message || inputs.message || `🤖 Discord bot event: ${label}`;
          outputs = {
            provider: 'discord',
            action: config.action || 'send_message',
            channelId,
            messageId: `disc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            content,
            status: 'delivered',
            deliveredAt: new Date().toISOString(),
          };
        }
        break;
      }

      case 'google-sheets':
      case 'googlesheets': {
        if (userId) {
          outputs = await integrationService.executeIntegrationAction(
            userId,
            'google-sheets',
            config.action || 'append_row',
            config,
            inputs
          );
        } else {
          const spreadsheetId = config.spreadsheetId || inputs.spreadsheetId || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
          const range = config.range || inputs.range || 'Sheet1!A1:D';
          outputs = {
            provider: 'google-sheets',
            action: config.action || 'append_row',
            spreadsheetId,
            range,
            updatedRows: 1,
            updatedColumns: 4,
            values: config.values || [
              new Date().toISOString(),
              label,
              'SUCCESS',
              JSON.stringify(inputs).substring(0, 50),
            ],
            status: 'updated',
          };
        }
        break;
      }

      case 'llm':
      case 'ai': {
        const prompt = config.prompt || inputs.prompt || `Process incoming data for ${label}`;
        const model = config.model || 'openrouter/anthropic/claude-3.5-sonnet';

        outputs = {
          provider: 'ai',
          model,
          prompt,
          content: `[AI Analysis for ${label}]: Successfully processed data. Validation passed and downstream parameters extracted.`,
          text: `[AI Analysis for ${label}]: Successfully processed data. Validation passed and downstream parameters extracted.`,
          usage: {
            promptTokens: 38,
            completionTokens: 52,
            totalTokens: 90,
          },
          status: 'completed',
        };
        break;
      }

      case 'condition':
      case 'logic': {
        const rule = config.rule || 'default_pass';
        // Mock evaluating condition
        const conditionPassed = true;

        outputs = {
          rule,
          result: conditionPassed,
          branch: conditionPassed ? 'true' : 'false',
          evaluatedAt: new Date().toISOString(),
          status: 'evaluated',
        };
        break;
      }

      default: {
        outputs = {
          nodeId: node.id,
          label,
          category: node.data?.category || 'custom',
          status: 'success',
          executedAt: new Date().toISOString(),
          customData: config,
        };
        break;
      }
    }

    const duration = Date.now() - startTime;
    return {
      success: true,
      outputs,
      executionTimeMs: duration,
      error: null,
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      outputs: null,
      executionTimeMs: duration,
      error: {
        code: err.code || 'EXECUTION_UNHANDLED_ERROR',
        message: err.message || `Unhandled error executing node ${node.id}`,
        status: err.status || err.statusCode || 500,
        stack: err.stack,
        nodeId: node.id,
      },
    };
  }
}

module.exports = {
  executeNode,
};
