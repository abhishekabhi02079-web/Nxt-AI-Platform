/**
 * Validation Agent (Pure Module)
 * 
 * Verifies that node outputs meet expected schema contracts and required
 * fields per node type before passing execution state downstream.
 * 
 * Does NOT contain HTTP/Express or database logic.
 */

// Required output field contracts per node type
const REQUIRED_OUTPUT_SCHEMAS = {
  trigger: ['status', 'event'],
  gmail: ['messageId', 'status', 'recipient'],
  slack: ['channel', 'ts', 'ok'],
  discord: ['messageId', 'status'],
  'google-sheets': ['spreadsheetId', 'status'],
  googlesheets: ['spreadsheetId', 'status'],
  llm: ['status', 'model'],
  ai: ['status', 'model'],
  condition: ['result', 'branch'],
  logic: ['result', 'branch'],
};

/**
 * Validates the output payload produced by a node execution.
 * 
 * @param {Object} params
 * @param {Object} params.node - The executed graph node { id, data: { nodeType, label } }
 * @param {Object} params.outputs - Output object produced by executionAgent
 * @returns {Object} { isValid: boolean, missingFields: string[], errors: string[], validatedOutputs: Object }
 */
function validateNodeOutput({ node, outputs }) {
  const nodeType = (node.data?.nodeType || node.type || 'action').toLowerCase();
  const label = node.data?.label || node.id;
  const missingFields = [];
  const errors = [];

  if (!outputs || typeof outputs !== 'object') {
    return {
      isValid: false,
      missingFields: ['*'],
      errors: [`Node ${label} produced empty or non-object output payload`],
      nodeType,
      nodeId: node.id,
      validatedOutputs: {},
    };
  }

  // Check required fields for known node types
  const requiredFields = REQUIRED_OUTPUT_SCHEMAS[nodeType] || ['status'];

  for (const field of requiredFields) {
    if (outputs[field] === undefined || outputs[field] === null) {
      missingFields.push(field);
    }
  }

  // Additional type-specific checks
  if (nodeType === 'slack' && outputs.ok !== true) {
    errors.push(`Slack output ok flag was not true`);
  }

  if (nodeType === 'condition' && typeof outputs.result !== 'boolean') {
    errors.push(`Condition output result must be boolean`);
  }

  if (missingFields.length > 0) {
    errors.push(
      `Node ${label} missing required output field(s): ${missingFields.join(', ')}`
    );
  }

  const isValid = missingFields.length === 0 && errors.length === 0;

  return {
    isValid,
    missingFields,
    errors,
    nodeType,
    nodeId: node.id,
    validatedOutputs: outputs,
  };
}

module.exports = {
  validateNodeOutput,
  REQUIRED_OUTPUT_SCHEMAS,
};
