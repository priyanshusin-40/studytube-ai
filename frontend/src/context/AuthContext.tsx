import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
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
    void api.me().then(({ user: current }) => setUser(current)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthValue>(() => ({
    user,
    loading,
    login: async (email, password) => setUser((await api.login(email, password)).user),
    register: async (name, email, password) => setUser((await api.register(name, email, password)).user),
    logout: async () => { await api.logout(); setUser(null); },
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
