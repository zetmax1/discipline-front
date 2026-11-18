import { useState, useCallback } from 'react';
import { loginApi, registerApi, logout, isAuthenticated, getUser } from '@/lib/api';

export function useAuth() {
  const [user, setUser] = useState(getUser());
  const [loading, setLoading] = useState(false);
  // The caught error itself: the UI translates it (useI18n().errorMessage).
  const [error, setError] = useState<unknown>(null);

  const login = useCallback(async (email: string, password: string, turnstileToken?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await loginApi(email, password, turnstileToken);
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, turnstileToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await registerApi(name, email, password, turnstileToken);
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    isLoggedIn: isAuthenticated(),
    loading,
    error,
    login,
    register,
    logout,
  };
}
