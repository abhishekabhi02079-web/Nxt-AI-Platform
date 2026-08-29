import { create } from 'zustand';
import api from '../services/api';
import { subscribeToExecution, getSocket } from '../services/socket';

export const useExecutionStore = create((set, get) => ({
  executions: [],
  activeExecution: null,
  timelineLogs: [],
  isSocketConnected: false,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  },
  filters: {
    status: '',
    workflowId: '',
    agent: '',
    level: '',
  },
  isLoading: false,
  isActionLoading: false,
  error: null,

  // Set filter criteria
  setFilters: (newFilters = {}) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  // Clear errors
  clearError: () => set({ error: null }),

  // Fetch paginated executions list with filters
  fetchExecutions: async (customParams = {}) => {
    const { filters, pagination } = get();
    const params = {
      page: customParams.page || pagination.page || 1,
      limit: customParams.limit || pagination.limit || 20,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.workflowId ? { workflowId: filters.workflowId } : {}),
      ...customParams,
    };

    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/executions', { params });
      const { executions, pagination: newPagination } = res.data.data;
      set({
        executions: executions || [],
        pagination: newPagination || pagination,
        isLoading: false,
      });
      return executions;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to fetch executions';
      set({ isLoading: false, error: message });
      return [];
    }
  },

  // Fetch single execution details & snapshot
  fetchExecutionById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get(`/executions/${id}`);
      const { execution } = res.data.data;
      set({
        activeExecution: execution,
        isLoading: false,
      });
      return execution;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to load execution';
      set({ isLoading: false, error: message });
      return null;
    }
  },

  // Fetch timeline logs for active execution
  fetchTimelineLogs: async (id, customQuery = {}) => {
    try {
      const res = await api.get(`/executions/${id}/timeline`, { params: customQuery });
      const { execution, logs } = res.data.data;
      set({
        activeExecution: execution || get().activeExecution,
        timelineLogs: logs || [],
      });
      return logs;
    } catch (err) {
      console.error('Failed to fetch timeline logs:', err);
      return [];
    }
  },

  // Subscribe to live Socket.IO events for active execution
  subscribeToLiveExecution: (executionId) => {
    if (!executionId) return () => {};

    const socket = getSocket();
    if (socket) {
      set({ isSocketConnected: socket.connected });
      socket.on('connect', () => set({ isSocketConnected: true }));
      socket.on('disconnect', () => set({ isSocketConnected: false }));
    }

    const unsubscribe = subscribeToExecution(executionId, {
      onLog: (newLog) => {
        set((state) => {
          // Deduplicate by _id
          const exists = state.timelineLogs.some(
            (l) => l._id && newLog._id && l._id.toString() === newLog._id.toString()
          );
          if (exists) return state;
          return {
            timelineLogs: [...state.timelineLogs, newLog],
          };
        });
      },

      onProgress: (progress) => {
        set((state) => {
          if (!state.activeExecution) return state;
          return {
            activeExecution: {
              ...state.activeExecution,
              currentNode: progress.currentNodeId,
              status: 'RUNNING',
            },
          };
        });
      },

      onNodeOutput: (outputData) => {
        set((state) => {
          if (!state.activeExecution) return state;
          const currentOutputs = state.activeExecution.outputs || {};
          return {
            activeExecution: {
              ...state.activeExecution,
              outputs: {
                ...currentOutputs,
                ...(outputData.accumulatedOutputs || { [outputData.nodeId]: outputData.output }),
              },
            },
          };
        });
      },

      onStatus: (statusDoc) => {
        set((state) => {
          const updatedActive = state.activeExecution
            ? { ...state.activeExecution, ...statusDoc }
            : statusDoc;

          const updatedExecutions = state.executions.map((e) =>
            e._id === statusDoc._id ? { ...e, ...statusDoc } : e
          );

          return {
            activeExecution: updatedActive,
            executions: updatedExecutions,
          };
        });
      },
    });

    return unsubscribe;
  },

  // Trigger new workflow execution
  triggerExecution: async (workflowId, inputs = {}) => {
    set({ isActionLoading: true, error: null });
    try {
      const res = await api.post(`/workflows/${workflowId}/execute`, inputs);
      const { execution } = res.data.data;
      set((state) => ({
        executions: [execution, ...state.executions],
        activeExecution: execution,
        isActionLoading: false,
      }));
      return execution;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to trigger execution';
      set({ isActionLoading: false, error: message });
      throw new Error(message);
    }
  },

  // Pause active execution
  pauseExecution: async (id) => {
    set({ isActionLoading: true, error: null });
    try {
      const res = await api.post(`/executions/${id}/pause`);
      const { execution } = res.data.data;
      set((state) => ({
        activeExecution: execution,
        executions: state.executions.map((e) => (e._id === id ? { ...e, status: 'PAUSED' } : e)),
        isActionLoading: false,
      }));
      return execution;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to pause execution';
      set({ isActionLoading: false, error: message });
      throw new Error(message);
    }
  },

  // Resume paused execution
  resumeExecution: async (id) => {
    set({ isActionLoading: true, error: null });
    try {
      const res = await api.post(`/executions/${id}/resume`);
      const { execution } = res.data.data;
      set((state) => ({
        activeExecution: execution,
        executions: state.executions.map((e) => (e._id === id ? { ...e, status: 'RUNNING' } : e)),
        isActionLoading: false,
      }));
      return execution;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to resume execution';
      set({ isActionLoading: false, error: message });
      throw new Error(message);
    }
  },

  // Cancel execution
  cancelExecution: async (id) => {
    set({ isActionLoading: true, error: null });
    try {
      const res = await api.post(`/executions/${id}/cancel`);
      const { execution } = res.data.data;
      set((state) => ({
        activeExecution: execution,
        executions: state.executions.map((e) => (e._id === id ? { ...e, status: 'CANCELLED' } : e)),
        isActionLoading: false,
      }));
      return execution;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to cancel execution';
      set({ isActionLoading: false, error: message });
      throw new Error(message);
    }
  },

  // Clear active execution
  clearActiveExecution: () => {
    set({ activeExecution: null, timelineLogs: [] });
  },
}));

export default useExecutionStore;
