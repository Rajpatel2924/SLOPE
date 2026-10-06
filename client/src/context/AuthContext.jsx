import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { SESSION_EXPIRED_EVENT, TOKEN_KEY } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(null);

  const refreshSession = useCallback(async (signal) => {
    setLoading(true);
    setSessionError(null);

    if (!localStorage.getItem(TOKEN_KEY)) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get('/auth/me', { signal });
      if (!signal?.aborted) setUser(data.user);
    } catch (error) {
      if (!signal?.aborted) {
        setUser(null);
        if (error.response?.status !== 401) setSessionError(error);
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refreshSession(controller.signal);
    const onExpired = () => {
      setUser(null);
      setSessionError(null);
      setLoading(false);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => {
      controller.abort();
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
    };
  }, [refreshSession]);

  async function authenticate(endpoint, credentials) {
    const { data } = await api.post(endpoint, credentials);
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    setSessionError(null);
    return data.user;
  }

  function login(credentials) {
    return authenticate('/auth/login', credentials);
  }

  function register(credentials) {
    return authenticate('/auth/register', credentials);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setSessionError(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, sessionError, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
