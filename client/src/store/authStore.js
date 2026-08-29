import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isHydrated: false,

      // Mark hydration complete
      setHydrated: () => set({ isHydrated: true }),

      // Clear any authentication error message
      clearError: () => set({ error: null }),

      // Register new user
      register: async (name, email, password, role = 'operator') => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post('/auth/register', { name, email, password, role });
          const { user, token } = res.data.data;
          
          if (typeof window !== 'undefined') {
            localStorage.setItem('agentflow_token', token);
          }

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return { success: true, user };
        } catch (err) {
          const message = err.response?.data?.message || err.message || 'Registration failed';
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      // Log in existing user
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post('/auth/login', { email, password });
          const { user, token } = res.data.data;

          if (typeof window !== 'undefined') {
            localStorage.setItem('agentflow_token', token);
          }

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return { success: true, user };
        } catch (err) {
          const message = err.response?.data?.message || err.message || 'Login failed';
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      // Log out user
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('agentflow_token');
          localStorage.removeItem('agentflow_auth_storage');
        }
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      // Refresh / Validate current user profile
      fetchMe: async () => {
        const { token } = get();
        if (!token) return null;

        try {
          const res = await api.get('/auth/me');
          const { user } = res.data.data;
          set({ user, isAuthenticated: true });
          return user;
        } catch (err) {
          // Token is invalid or expired
          get().logout();
          return null;
        }
      },
    }),
    {
      name: 'agentflow_auth_storage',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : null)),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated();
          if (state.token) {
            localStorage.setItem('agentflow_token', state.token);
          }
        }
      },
    }
  )
);

export default useAuthStore;
