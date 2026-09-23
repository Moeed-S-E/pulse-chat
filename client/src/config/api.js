export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_SERVER_URL ||
  ''
).replace(/\/$/, '');

export const SOCKET_URL =
  import.meta.env.VITE_SERVER_URL ||
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '');

export const getApiUrl = (endpoint) => {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${path}`;
};

export const apiFetch = (endpoint, options) => {
  return fetch(getApiUrl(endpoint), options);
};

// Immediate background server warmup for Render cold starts
export const warmupServer = () => {
  try {
    const url = getApiUrl('/api/health');
    fetch(url, { method: 'GET', cache: 'no-store' }).catch(() => {});
  } catch (e) {
    // Ignore initial background warmup errors
  }
};

// Trigger server warmup immediately when JS bundle loads in browser
if (typeof window !== 'undefined') {
  warmupServer();
}
