import { useAuthStore } from '../store/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: any;
}

async function apiCall(endpoint: string, options: ApiOptions = {}) {
  const { token } = useAuthStore.getState();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  // Anomalies
  getAnomalies: (params: { limit?: number; offset?: number; type?: string; flagged?: boolean }) =>
    apiCall(`/anomalies?${new URLSearchParams(params as any).toString()}`),

  getAnomaly: (id: string) => apiCall(`/anomalies/${id}`),

  updateAnomaly: (id: string, data: { flagged?: boolean; feedback?: string }) =>
    apiCall(`/anomalies/${id}`, { method: 'PATCH', body: data }),

  // Statistics
  getStats: () => apiCall('/stats/anomalies'),

  // Patterns
  getPatterns: (channel: string) => apiCall(`/patterns/${channel}`),

  // Channels
  getChannelStats: () => apiCall('/channels/stats'),

  // Health
  health: () => apiCall('/health'),
};
