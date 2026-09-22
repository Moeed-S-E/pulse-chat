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
