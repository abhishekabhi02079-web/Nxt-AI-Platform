const env = require('../config/env');

/**
 * Deterministic Rule-Based Workflow Builder
 * Produces structured, runnable visual workflow graphs based on keyword and intent extraction.
 */
function buildDeterministicWorkflow(prompt) {
  const p = (prompt || '').toLowerCase();

  // 1. Invoice Routing Intent
  if (p.includes('invoice') || p.includes('receipt') || p.includes('bill') || p.includes('accounting') || p.includes('expense')) {
    return {
      workflow: {
        name: 'Automated Invoice Processing & Routing',
        description: `Generated from prompt: "${prompt}"\nExtracts line items, verifies amounts, alerts team on Slack, and records in Google Sheets.`,
        triggerConfig: { type: 'webhook', webhookPath: '/invoices/inbound' },
        tags: ['finance', 'invoice', 'deterministic-engine'],
        nodes: [
          {
            id: 'trigger-1',
            type: 'customNode',
            position: { x: 100, y: 220 },
            data: {
              label: 'Inbound Invoice Webhook',
              nodeType: 'webhook',
              category: 'trigger',
              description: 'Receives PDF / JSON invoice payload',
              config: { webhookPath: '/invoices/inbound', type: 'webhook' },
            },
          },
          {
            id: 'llm-1',
            type: 'customNode',
            position: { x: 420, y: 220 },
            data: {
              label: 'AI Invoice Data Extractor',
              nodeType: 'llm',
              category: 'ai',
              description: 'Parses vendor name, total amount, tax, and line items',
              config: {
                provider: 'openrouter',
                systemPrompt: 'Extract structured JSON with vendor, amount, invoiceNumber, date.',
                prompt: 'Analyze invoice payload: {{trigger-1.payload}}',
              },
            },
          },
          {
            id: 'cond-1',
            type: 'customNode',
            position: { x: 740, y: 220 },
            data: {
              label: 'High Value Threshold Check',
              nodeType: 'condition',
              category: 'logic',
              description: 'Checks if invoice total exceeds $1,000 threshold',
              config: { field: 'amount', operator: 'greater_than', value: '1000' },
            },
          },
          {
            id: 'slack-1',
            type: 'customNode',
            position: { x: 1060, y: 140 },
            data: {
              label: 'Finance Approval Alert',
              nodeType: 'slack',
              category: 'action',
              description: 'Alerts finance directors on Slack for approval',
              config: { channel: '#finance-approvals', message: '⚠️ High-value invoice received: {{llm-1.vendor}} for ${{llm-1.amount}}' },
            },
          },
          {
            id: 'sheets-1',
            type: 'customNode',
            position: { x: 1060, y: 300 },
            data: {
              label: 'Append to Accounts Ledger',
              nodeType: 'google-sheets',
              category: 'action',
              description: 'Logs invoice record into Google Sheets',
              config: { spreadsheetId: 'finance_ledger_2026', sheetName: 'Invoices', values: '{{timestamp}}, {{llm-1.vendor}}, {{llm-1.amount}}' },
            },
          },
        ],
        edges: [
          { id: 'e-1', source: 'trigger-1', target: 'llm-1', animated: true, style: { stroke: '#06b6d4', strokeWidth: 2 } },
          { id: 'e-2', source: 'llm-1', target: 'cond-1', animated: true, style: { stroke: '#06b6d4', strokeWidth: 2 } },
          { id: 'e-3', source: 'cond-1', target: 'slack-1', animated: true, style: { stroke: '#a855f7', strokeWidth: 2 }, label: 'Amount > 1000' },
          { id: 'e-4', source: 'cond-1', target: 'sheets-1', animated: true, style: { stroke: '#10b981', strokeWidth: 2 }, label: 'All Invoices' },
        ],
      },
      mode: 'deterministic',
      confidence: 0.94,
    };
  }

  // 2. Email / Gmail Outreach Intent
  if (p.includes('email') || p.includes('gmail') || p.includes('newsletter') || p.includes('outreach') || p.includes('welcome') || p.includes('mail')) {
    return {
      workflow: {
        name: 'Smart Customer Email Outreach & Follow-up',
        description: `Generated from prompt: "${prompt}"\nMonitors scheduled triggers, composes tailored emails using AI, and sends via Gmail.`,
        triggerConfig: { type: 'schedule', cron: '0 9 * * 1-5' },
        tags: ['email', 'outreach', 'gmail', 'deterministic-engine'],
        nodes: [
          {
            id: 'trigger-1',
            type: 'customNode',
            position: { x: 120, y: 200 },
            data: {
              label: 'Scheduled Morning Trigger',
              nodeType: 'schedule',
              category: 'trigger',
              description: 'Fires every weekday at 09:00 AM',
              config: { type: 'schedule', cron: '0 9 * * 1-5' },
            },
          },
          {
            id: 'llm-1',
            type: 'customNode',
            position: { x: 440, y: 200 },
            data: {
              label: 'AI Email Copywriter',
              nodeType: 'llm',
              category: 'ai',
              description: 'Generates personalized email subject and body',
              config: {
                provider: 'openrouter',
                systemPrompt: 'You write engaging, concise business communications.',
                prompt: 'Draft an email regarding: ' + prompt,
              },
            },
          },
          {
            id: 'gmail-1',
            type: 'customNode',
            position: { x: 760, y: 200 },
            data: {
              label: 'Send Outbound Gmail',
              nodeType: 'gmail',
              category: 'action',
              description: 'Dispatches message via authenticated Gmail OAuth',
              config: {
                actionType: 'send_email',
                to: 'clients@example.com',
                subject: '{{llm-1.subject}}',
                body: '{{llm-1.body}}',
              },
            },
          },
          {
            id: 'slack-1',
            type: 'customNode',
            position: { x: 1080, y: 200 },
            data: {
              label: 'Notify Growth Channel',
              nodeType: 'slack',
              category: 'action',
              description: 'Logs sent email confirmation to Slack',
              config: { channel: '#growth-outreach', message: '✉️ Email sent to {{gmail-1.recipient}}' },
            },
          },
        ],
        edges: [
          { id: 'e-1', source: 'trigger-1', target: 'llm-1', animated: true, style: { stroke: '#06b6d4', strokeWidth: 2 } },
          { id: 'e-2', source: 'llm-1', target: 'gmail-1', animated: true, style: { stroke: '#06b6d4', strokeWidth: 2 } },
          { id: 'e-3', source: 'gmail-1', target: 'slack-1', animated: true, style: { stroke: '#10b981', strokeWidth: 2 } },
        ],
      },
      mode: 'deterministic',
      confidence: 0.92,
    };
  }

  // 3. Slack / Discord Support Escalation Intent
  if (p.includes('slack') || p.includes('discord') || p.includes('support') || p.includes('ticket') || p.includes('escalat') || p.includes('alert')) {
    return {
      workflow: {
        name: 'Multi-Channel Incident & Support Escalation',
        description: `Generated from prompt: "${prompt}"\nTriages customer issues with AI reasoning and broadcasts alerts to Slack and Discord.`,
        triggerConfig: { type: 'webhook', webhookPath: '/support/tickets' },
        tags: ['support', 'incident', 'slack', 'discord', 'deterministic-engine'],
        nodes: [
          {
            id: 'trigger-1',
            type: 'customNode',
            position: { x: 100, y: 220 },
            data: {
              label: 'Support Ticket Webhook',
              nodeType: 'webhook',
              category: 'trigger',
              description: 'Receives ticket payloads from Zendesk or Intercom',
              config: { webhookPath: '/support/tickets', type: 'webhook' },
            },
          },
          {
            id: 'llm-1',
            type: 'customNode',
            position: { x: 420, y: 220 },
            data: {
              label: 'AI Severity Classifier',
              nodeType: 'llm',
              category: 'ai',
              description: 'Assesses sentiment, category, and urgency level',
              config: {
                provider: 'openrouter',
                systemPrompt: 'Classify ticket as CRITICAL, HIGH, or LOW severity and summarize root cause.',
                prompt: 'Ticket: {{trigger-1.payload}}',
              },
            },
          },
          {
            id: 'slack-1',
            type: 'customNode',
            position: { x: 760, y: 140 },
            data: {
              label: 'Post to #ops-incident-room',
              nodeType: 'slack',
              category: 'action',
              description: 'Alerts on-call engineering team on Slack',
              config: { channel: '#ops-incidents', message: '🚨 [{{llm-1.severity}}] {{llm-1.summary}}' },
            },
          },
          {
            id: 'discord-1',
            type: 'customNode',
            position: { x: 760, y: 300 },
            data: {
              label: 'Post to Discord Ops Bot',
              nodeType: 'discord',
              category: 'action',
              description: 'Sends real-time webhook embed to Discord',
              config: { channelId: '123456789', content: '📋 New Ticket Logged: {{llm-1.summary}}' },
            },
          },
        ],
        edges: [
          { id: 'e-1', source: 'trigger-1', target: 'llm-1', animated: true, style: { stroke: '#06b6d4', strokeWidth: 2 } },
          { id: 'e-2', source: 'llm-1', target: 'slack-1', animated: true, style: { stroke: '#a855f7', strokeWidth: 2 } },
          { id: 'e-3', source: 'llm-1', target: 'discord-1', animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } },
        ],
      },
      mode: 'deterministic',
      confidence: 0.95,
    };
  }

  // 4. Google Sheets & Data Logging Intent
  if (p.includes('sheet') || p.includes('spreadsheet') || p.includes('record') || p.includes('log') || p.includes('database') || p.includes('export')) {
    return {
      workflow: {
        name: 'Operational Data Sync & Sheets Logger',
        description: `Generated from prompt: "${prompt}"\nExtracts and structures incoming events and appends them to Google Sheets ledger.`,
        triggerConfig: { type: 'manual' },
        tags: ['data-sync', 'google-sheets', 'deterministic-engine'],
        nodes: [
          {
            id: 'trigger-1',
            type: 'customNode',
            position: { x: 120, y: 200 },
            data: {
              label: 'Manual Execution Trigger',
              nodeType: 'trigger',
              category: 'trigger',
              description: 'Run data ingestion on demand',
              config: { type: 'manual' },
            },
          },
          {
            id: 'transform-1',
            type: 'customNode',
            position: { x: 440, y: 200 },
            data: {
              label: 'Format & Normalize Rows',
              nodeType: 'transform',
              category: 'logic',
              description: 'Maps raw event payloads to standardized tabular columns',
              config: { outputKey: 'standardizedRow', expression: 'JSON.stringify(input)' },
            },
          },
          {
            id: 'sheets-1',
            type: 'customNode',
            position: { x: 760, y: 200 },
            data: {
              label: 'Append to Google Sheets',
              nodeType: 'google-sheets',
              category: 'action',
              description: 'Appends formatted record to target worksheet',
              config: { spreadsheetId: 'ops_sync_master_2026', sheetName: 'Raw_Logs', values: '{{timestamp}}, {{transform-1.standardizedRow}}' },
            },
          },
        ],
        edges: [
          { id: 'e-1', source: 'trigger-1', target: 'transform-1', animated: true, style: { stroke: '#06b6d4', strokeWidth: 2 } },
          { id: 'e-2', source: 'transform-1', target: 'sheets-1', animated: true, style: { stroke: '#10b981', strokeWidth: 2 } },
        ],
      },
      mode: 'deterministic',
      confidence: 0.90,
    };
  }

  // 5. Generic / Fallback Rule Builder
  const cleanTitle = prompt.length > 50 ? prompt.substring(0, 47) + '...' : prompt;
  return {
    workflow: {
      name: `AI Swarm: ${cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1)}`,
      description: `Automated agent graph generated for: "${prompt}"`,
      triggerConfig: { type: 'manual' },
      tags: ['ai-swarm', 'automation', 'deterministic-engine'],
      nodes: [
        {
          id: 'trigger-1',
          type: 'customNode',
          position: { x: 120, y: 200 },
          data: {
            label: 'Workflow Trigger',
            nodeType: 'trigger',
            category: 'trigger',
            description: 'Initiates multi-agent execution pipeline',
            config: { type: 'manual' },
          },
        },
        {
          id: 'llm-1',
          type: 'customNode',
          position: { x: 440, y: 200 },
          data: {
            label: 'AI Reasoning & Processing',
            nodeType: 'llm',
            category: 'ai',
            description: 'Executes core prompt logic and formats deliverables',
            config: {
              provider: 'openrouter',
              systemPrompt: 'You are an autonomous AI operations assistant.',
              prompt: prompt,
            },
          },
        },
        {
          id: 'slack-1',
          type: 'customNode',
          position: { x: 760, y: 200 },
          data: {
            label: 'Broadcast Deliverables to Slack',
            nodeType: 'slack',
            category: 'action',
            description: 'Posts output summary to operational team channel',
            config: { channel: '#ops-feed', message: '🤖 Workflow Output: {{llm-1.result}}' },
          },
        },
      ],
      edges: [
        { id: 'e-1', source: 'trigger-1', target: 'llm-1', animated: true, style: { stroke: '#06b6d4', strokeWidth: 2 } },
        { id: 'e-2', source: 'llm-1', target: 'slack-1', animated: true, style: { stroke: '#a855f7', strokeWidth: 2 } },
      ],
    },
    mode: 'deterministic',
    confidence: 0.88,
  };
}

/**
 * Generate complete visual workflow from natural-language prompt
 * Hierarchical execution: OpenRouter -> Google Gemini -> Deterministic Engine
 */
async function generateWorkflowFromPrompt(prompt) {
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    const error = new Error('Prompt is required for workflow generation');
    error.statusCode = 400;
    throw error;
  }

  const cleanPrompt = prompt.trim();

  // Tier 1: Try OpenRouter if API Key configured
  if (env.OPENROUTER_API_KEY && env.OPENROUTER_API_KEY.trim() !== '') {
    try {
      console.log('[AI Service] Attempting workflow generation via OpenRouter API...');
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': env.CLIENT_URL,
          'X-Title': 'Agentflow_AI',
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-instruct',
          messages: [
            {
              role: 'system',
              content: `You are an expert AI Operations Workflow Architect. Generate a complete, valid visual workflow graph in JSON based on the user prompt.
Output JSON ONLY matching this schema:
{
  "name": "string (concise title)",
  "description": "string",
  "triggerConfig": { "type": "manual|webhook|schedule" },
  "tags": ["string"],
  "nodes": [
    {
      "id": "trigger-1|llm-1|gmail-1|slack-1|sheets-1|cond-1",
      "type": "customNode",
      "position": { "x": number, "y": number },
      "data": {
        "label": "string",
        "nodeType": "trigger|webhook|schedule|gmail|slack|discord|google-sheets|llm|condition|transform",
        "category": "trigger|action|ai|logic",
        "description": "string",
        "config": { ... }
      }
    }
  ],
  "edges": [
    {
      "id": "e-1",
      "source": "node-id-1",
      "target": "node-id-2",
      "animated": true,
      "style": { "stroke": "#06b6d4", "strokeWidth": 2 }
    }
  ]
}
Ensure nodes have horizontal spacing (x: 100, x: 420, x: 740, etc.) with y: 200.`,
            },
            {
              role: 'user',
              content: `Generate a workflow for: ${cleanPrompt}`,
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed.nodes && parsed.nodes.length > 0) {
            console.log('[AI Service] Successfully generated workflow via OpenRouter.');
            return {
              workflow: parsed,
              mode: 'openrouter',
              confidence: 0.98,
            };
          }
        }
      }
    } catch (err) {
      console.warn('[AI Service] OpenRouter generation failed, falling back:', err.message);
    }
  }

  // Tier 2: Try Google Gemini if API Key configured
  if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== '') {
    try {
      console.log('[AI Service] Attempting workflow generation via Google Gemini SDK...');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Generate a visual workflow JSON object for: "${cleanPrompt}". Return valid JSON matching: { "name": string, "description": string, "triggerConfig": object, "tags": array, "nodes": array, "edges": array } with nodeTypes (trigger, llm, gmail, slack, discord, google-sheets, condition).`,
                },
              ],
            },
          ],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed.nodes && parsed.nodes.length > 0) {
            console.log('[AI Service] Successfully generated workflow via Google Gemini.');
            return {
              workflow: parsed,
              mode: 'gemini',
              confidence: 0.96,
            };
          }
        }
      }
    } catch (err) {
      console.warn('[AI Service] Gemini generation failed, falling back:', err.message);
    }
  }

  // Tier 3: Deterministic Rule-Based Builder Fallback
  console.log('[AI Service] Generating workflow via Deterministic Rule Engine...');
  return buildDeterministicWorkflow(cleanPrompt);
}

module.exports = {
  generateWorkflowFromPrompt,
  buildDeterministicWorkflow,
};
