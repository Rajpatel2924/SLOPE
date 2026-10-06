import axios from 'axios';

export const TOKEN_KEY = 'slope_token';
export const SESSION_EXPIRED_EVENT = 'slope:session-expired';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const apiBaseUrl = configuredApiUrl || (import.meta.env.DEV ? 'http://localhost:5000/api' : '');

if (!apiBaseUrl) {
  throw new Error('VITE_API_URL is required outside local development.');
}

const api = axios.create({
  baseURL: apiBaseUrl.replace(/\/+$/, ''),
  // Roadmap generation can take two 30-second Gemini attempts.
  timeout: 75000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = String(error.config?.url || '');
    const isCredentialRequest = /\/auth\/(login|register)(?:\?|$)/.test(url);

    if (error.response?.status === 401 && !isCredentialRequest) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      if (!['/login', '/register'].includes(window.location.pathname)) {
        window.location.replace('/login');
      }
    }

    return Promise.reject(error);
  },
);

export function getErrorMessage(error) {
  if (typeof error === 'string') return error;
  if (error?.response?.data?.error?.message) return error.response.data.error.message;
  if (error?.code === 'ERR_NETWORK') {
    return 'We could not reach the API. Check your connection and that the server is running.';
  }
  if (error?.code === 'ECONNABORTED') return 'The request took too long. Please try again.';
  return error?.message || 'Something went wrong. Please try again.';
}

export async function getPostAuthPath() {
  try {
    await api.get('/roadmap');
    return '/dashboard';
  } catch (error) {
    if (error.response?.status === 404) return '/onboarding';
    throw error;
  }
}

export default api;
