/**
 * API Configuration Utility
 * Centralized configuration for API and WebSocket URLs
 */

// Get API base URL from environment or use default
export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL || 'http://72.60.101.14:8000/api/v1';
};

// Get WebSocket base URL from environment or derive from API URL
export const getWebSocketBaseUrl = (): string => {
  const wsUrl = import.meta.env.VITE_WS_BASE_URL;
  if (wsUrl) {
    return wsUrl;
  }
  
  // Derive WebSocket URL from API URL
  const apiUrl = getApiBaseUrl();
  // Replace http:// with ws:// and remove /api/v1
  return apiUrl.replace(/^https?:\/\//, 'ws://').replace(/\/api\/v1$/, '');
};

// Get full WebSocket URL for a specific endpoint
export const getWebSocketUrl = (endpoint: string, token?: string): string => {
  const baseUrl = getWebSocketBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  return token ? `${url}?token=${token}` : url;
};

// Get full API URL for a specific endpoint
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();
  // Ensure endpoint starts with /
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${path}`;
};

