import { create } from 'zustand';
import api from '../services/api';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';

export const useWorkflowStore = create((set, get) => ({
  workflows: [],
  activeWorkflow: null,
  nodes: [],
  edges: [],
  selectedNode: null,
  isDirty: false,
  isLoading: false,
  error: null,
  pagination: { total: 0, page: 1, limit: 10, pages: 1 },
  metrics: {
    totalWorkflows: 0,
    countsByStatus: { draft: 0, active: 0, paused: 0, archived: 0 },
    recentWorkflows: [],
  },

  // Clear errors
  clearError: () => set({ error: null }),

  // Fetch list of workflows with search/filter
  fetchWorkflows: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/workflows', { params });
      const { workflows, pagination } = res.data.data;
      set({
        workflows,
        pagination,
        isLoading: false,
      });
      return workflows;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to fetch workflows';
      set({ isLoading: false, error: message });
      return [];
    }
  },

  // Fetch dashboard summary metrics
  fetchDashboardMetrics: async () => {
    try {
      const res = await api.get('/workflows/dashboard');
      const metrics = res.data.data;
      set({ metrics });
      return metrics;
    } catch (err) {
      console.error('Failed to fetch workflow metrics:', err);
      return null;
    }
  },

  // Fetch single workflow for visual editor canvas
  fetchWorkflowById: async (id) => {
    set({ isLoading: true, error: null, activeWorkflow: null, nodes: [], edges: [], selectedNode: null, isDirty: false });
    try {
      const res = await api.get(`/workflows/${id}`);
      const { workflow } = res.data.data;

      set({
        activeWorkflow: workflow,
        nodes: workflow.nodes || [],
        edges: workflow.edges || [],
        selectedNode: null,
        isDirty: false,
        isLoading: false,
      });
      return workflow;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to load workflow';
      set({ isLoading: false, error: message });
      return null;
    }
  },

  // Create new workflow manually
  createWorkflow: async (data = {}) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/workflows', data);
      const { workflow } = res.data.data;
      set((state) => ({
        workflows: [workflow, ...state.workflows],
        isLoading: false,
      }));
      return workflow;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to create workflow';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  // Update active workflow metadata (name, description, status, tags)
  updateActiveWorkflowMeta: (updates = {}) => {
    set((state) => {
      if (!state.activeWorkflow) return state;
      return {
        activeWorkflow: { ...state.activeWorkflow, ...updates },
        isDirty: true,
      };
    });
  },

  // Save active workflow graph & details to backend
  saveActiveWorkflow: async () => {
    const { activeWorkflow, nodes, edges } = get();
    if (!activeWorkflow) return null;

    set({ isLoading: true, error: null });
    try {
      const payload = {
        name: activeWorkflow.name,
        description: activeWorkflow.description,
        status: activeWorkflow.status,
        triggerConfig: activeWorkflow.triggerConfig,
        tags: activeWorkflow.tags,
        nodes,
        edges,
      };

      const res = await api.put(`/workflows/${activeWorkflow._id}`, payload);
      const { workflow } = res.data.data;

      set({
        activeWorkflow: workflow,
        nodes: workflow.nodes || [],
        edges: workflow.edges || [],
        isDirty: false,
        isLoading: false,
      });

      return workflow;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to save workflow';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  // Duplicate workflow
  duplicateWorkflow: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post(`/workflows/${id}/duplicate`);
      const { workflow } = res.data.data;
      set((state) => ({
        workflows: [workflow, ...state.workflows],
        isLoading: false,
      }));
      return workflow;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to duplicate workflow';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  // Delete workflow
  deleteWorkflow: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/workflows/${id}`);
      set((state) => ({
        workflows: state.workflows.filter((w) => w._id !== id),
        activeWorkflow: state.activeWorkflow?._id === id ? null : state.activeWorkflow,
        isLoading: false,
      }));
      return true;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to delete workflow';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  // React Flow Handlers
  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
      isDirty: true,
    }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
      isDirty: true,
    }));
  },

  onConnect: (connection) => {
    set((state) => {
      const edge = {
        ...connection,
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        animated: true,
        style: { stroke: '#06b6d4', strokeWidth: 2 },
      };
      return {
        edges: addEdge(edge, state.edges),
        isDirty: true,
      };
    });
  },

  // Add new node from palette
  addNode: (nodeType, category = 'action', position = { x: 300, y: 200 }) => {
    const timestamp = Date.now();
    const nodeId = `${nodeType}-${timestamp.toString().slice(-4)}`;

    const nodeLabels = {
      trigger: 'Manual Trigger',
      webhook: 'Webhook Listener',
      schedule: 'Cron Schedule',
      gmail: 'Gmail Action',
      slack: 'Slack Notification',
      discord: 'Discord Bot Post',
      'google-sheets': 'Google Sheets Append',
      llm: 'AI Prompt Step',
      condition: 'Condition Router',
      transform: 'Data Transformation',
    };

    const newNode = {
      id: nodeId,
      type: 'customNode',
      position,
      data: {
        label: nodeLabels[nodeType] || `${nodeType.toUpperCase()} Node`,
        nodeType,
        category,
        description: `Configured ${nodeType} integration node`,
        config: {},
        inputs: [],
        outputs: [],
      },
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
      selectedNode: newNode,
      isDirty: true,
    }));

    return newNode;
  },

  // Select node for side panel
  selectNode: (nodeId) => {
    const { nodes } = get();
    const found = nodes.find((n) => n.id === nodeId);
    set({ selectedNode: found || null });
  },

  clearSelectedNode: () => set({ selectedNode: null }),

  // Update node configuration from side panel
  updateNodeConfig: (nodeId, updates = {}) => {
    set((state) => {
      const updatedNodes = state.nodes.map((node) => {
        if (node.id === nodeId) {
          const updatedData = {
            ...node.data,
            ...updates,
            config: {
              ...node.data.config,
              ...(updates.config || {}),
            },
          };
          const updatedNode = { ...node, data: updatedData };
          return updatedNode;
        }
        return node;
      });

      const updatedSelected = updatedNodes.find((n) => n.id === nodeId) || null;

      return {
        nodes: updatedNodes,
        selectedNode: updatedSelected,
        isDirty: true,
      };
    });
  },

  // Delete node and its connected edges
  deleteNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNode: state.selectedNode?.id === nodeId ? null : state.selectedNode,
      isDirty: true,
    }));
  },
}));

export default useWorkflowStore;
