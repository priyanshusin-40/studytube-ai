import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setAuthRequiredHandler } from '../lib/api';
import type { User } from '../types';

interface AuthValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setAuthRequiredHandler(() => {
      if (active) setUser(null);
    });
    void api.me()
      .then(({ user: current }) => { if (active) setUser(current); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
      setAuthRequiredHandler(undefined);
    };
  }, []);

  const confirmSession = async () => {
    const { user: current } = await api.me();
    if (!current) {
      setUser(null);
      throw new Error('Sign-in succeeded, but the browser did not establish a session. Please enable cookies and try again.');
    }
    setUser(current);
  };

  const value = useMemo<AuthValue>(() => ({
    user,
    loading,
    login: async (email, password) => { await api.login(email, password); await confirmSession(); },
    register: async (name, email, password) => { await api.register(name, email, password); await confirmSession(); },
    logout: async () => { await api.logout(); setUser(null); },
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}

