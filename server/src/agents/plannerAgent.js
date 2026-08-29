/**
 * Planner Agent (Pure Module)
 * 
 * Analyzes workflow graph nodes and edges, performs topological sorting
 * to determine deterministic execution ordering, detects graph dependencies,
 * validates connectivity, and emits a confidence score for the plan.
 * 
 * Does NOT contain HTTP/Express or database logic.
 */

/**
 * Creates an execution plan from a workflow's nodes and edges.
 * 
 * @param {Object} graph - { nodes: Array, edges: Array, triggerConfig: Object }
 * @returns {Object} { executionPlan: Array, confidenceScore: number, entryNodeId: string, nodeMap: Object, diagnostics: Array }
 */
function createExecutionPlan(graph = {}) {
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  const diagnostics = [];

  if (nodes.length === 0) {
    return {
      executionPlan: [],
      orderedNodeIds: [],
      confidenceScore: 0.0,
      entryNodeId: null,
      nodeMap: {},
      totalNodes: 0,
      diagnostics: ['Graph has no nodes to execute'],
    };
  }

  // Map nodes by id for quick lookup
  const nodeMap = {};
  const inDegree = {};
  const adjacencyList = {};

  nodes.forEach((node) => {
    nodeMap[node.id] = node;
    inDegree[node.id] = 0;
    adjacencyList[node.id] = [];
  });

  // Calculate in-degree and build adjacency list from directed edges
  edges.forEach((edge) => {
    if (nodeMap[edge.source] && nodeMap[edge.target]) {
      adjacencyList[edge.source].push(edge.target);
      inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
    } else {
      diagnostics.push(`Dangling edge detected: ${edge.source} -> ${edge.target}`);
    }
  });

  // Identify entry nodes (in-degree === 0, or nodeType === 'trigger')
  const queue = [];
  
  // Prioritize trigger nodes first
  nodes.forEach((node) => {
    const isTrigger = (node.data?.nodeType === 'trigger') || (node.type === 'triggerNode');
    if (inDegree[node.id] === 0) {
      if (isTrigger) {
        queue.unshift(node.id); // Triggers go to the front
      } else {
        queue.push(node.id);
      }
    }
  });

  // If no zero-in-degree node exists (e.g. cycle), pick the first node as fallback
  if (queue.length === 0 && nodes.length > 0) {
    diagnostics.push('No root entry node with 0 in-degree found (potential graph cycle)');
    queue.push(nodes[0].id);
  }

  const orderedNodeIds = [];
  const visited = new Set();
  const currentInDegree = { ...inDegree };

  // Topological sorting (Kahn's Algorithm with cycle fallback)
  while (queue.length > 0) {
    const currentNodeId = queue.shift();
    if (visited.has(currentNodeId)) continue;

    visited.add(currentNodeId);
    orderedNodeIds.push(currentNodeId);

    const neighbors = adjacencyList[currentNodeId] || [];
    for (const neighborId of neighbors) {
      currentInDegree[neighborId] = (currentInDegree[neighborId] || 1) - 1;
      if (currentInDegree[neighborId] <= 0 && !visited.has(neighborId)) {
        queue.push(neighborId);
      }
    }
  }

  // If any unvisited nodes remain (e.g. disconnected components or cycles), append them gracefully
  nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      orderedNodeIds.push(node.id);
      visited.add(node.id);
      diagnostics.push(`Appended disconnected or cyclic node: ${node.id} (${node.data?.label || 'Node'})`);
    }
  });

  // Construct structured execution plan
  const executionPlan = orderedNodeIds.map((nodeId, index) => {
    const node = nodeMap[nodeId];
    const incomingEdges = edges.filter((e) => e.target === nodeId);
    const outgoingEdges = edges.filter((e) => e.source === nodeId);

    return {
      step: index + 1,
      nodeId: node.id,
      label: node.data?.label || `Step ${index + 1}`,
      nodeType: node.data?.nodeType || node.type || 'action',
      category: node.data?.category || 'action',
      config: node.data?.config || {},
      dependencies: incomingEdges.map((e) => e.source),
      nextSteps: outgoingEdges.map((e) => e.target),
    };
  });

  // Calculate Confidence Score
  // Base 1.0, minus penalties for dangling edges, cycles, or disconnected nodes
  let confidenceScore = 1.0;
  if (diagnostics.length > 0) {
    confidenceScore = Math.max(0.4, 1.0 - diagnostics.length * 0.15);
  }
  confidenceScore = Math.round(confidenceScore * 100) / 100;

  const entryNodeId = orderedNodeIds.length > 0 ? orderedNodeIds[0] : null;

  return {
    executionPlan,
    orderedNodeIds,
    confidenceScore,
    entryNodeId,
    nodeMap,
    totalNodes: nodes.length,
    diagnostics,
    metadata: {
      hasTrigger: nodes.some((n) => n.data?.nodeType === 'trigger'),
      edgeCount: edges.length,
      nodeCount: nodes.length,
      planGeneratedAt: new Date().toISOString(),
    },
  };
}

module.exports = {
  createExecutionPlan,
};
