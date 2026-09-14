import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  getCurrentAdmin,
  loginAdmin,
  type AdminIdentity,
  type LoginCredentials,
} from '../api/auth';
import { AuthContext, type AuthStatus } from './auth-context';
import { clearToken, getToken, setToken } from './storage';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() =>
    getToken() ? 'loading' : 'unauthenticated',
  );

  useEffect(() => {
    let active = true;

    if (!getToken()) {
      return () => {
        active = false;
      };
    }

    void getCurrentAdmin()
      .then((currentAdmin) => {
        if (active) {
          setAdmin(currentAdmin);
          setStatus('authenticated');
        }
      })
      .catch(() => {
        if (active) {
          clearToken();
          setAdmin(null);
          setStatus('unauthenticated');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    const result = await loginAdmin(credentials);
    setToken(result.accessToken);
    setAdmin(result.admin);
    setStatus('authenticated');
  }, []);

  const logout = useCallback((): void => {
    clearToken();
    setAdmin(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo(() => ({ admin, status, login, logout }), [admin, status, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
