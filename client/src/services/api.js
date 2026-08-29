import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      let token = localStorage.getItem('agentflow_token');
      if (!token) {
        // Check Zustand persisted storage fallback
        const persisted = localStorage.getItem('agentflow_auth_storage');
        if (persisted) {
          try {
            const parsed = JSON.parse(persisted);
            token = parsed.state?.token;
          } catch (e) {
            // ignore JSON parse error
          }
        }
      }

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        const isAuthEndpoint = error.config.url.includes('/auth/login') || error.config.url.includes('/auth/register');
        if (!isAuthEndpoint && window.location.pathname !== '/login') {
          // Token expired or invalid
          localStorage.removeItem('agentflow_token');
          localStorage.removeItem('agentflow_auth_storage');
          window.location.href = '/login?expired=1';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
