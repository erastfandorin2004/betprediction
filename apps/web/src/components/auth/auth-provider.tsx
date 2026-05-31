'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { getAccessToken, storeTokens, clearTokens, type AuthUser, type AuthTokens } from '@/lib/auth';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (tokens: AuthTokens) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isLoading: true });

  useEffect(() => {
    // Restore session from localStorage on mount
    const token = getAccessToken();
    if (token) {
      try {
        const [, payload] = token.split('.');
        const decoded = JSON.parse(atob(payload!)) as {
          sub: string;
          email: string;
          role: string;
          exp: number;
        };
        if (decoded.exp * 1000 > Date.now()) {
          setState({ user: { id: decoded.sub, email: decoded.email, role: decoded.role }, isLoading: false });
          return;
        }
      } catch {
        // invalid token
      }
      clearTokens();
    }
    setState({ user: null, isLoading: false });
  }, []);

  const signIn = useCallback((tokens: AuthTokens) => {
    storeTokens(tokens);
    setState({ user: tokens.user, isLoading: false });
  }, []);

  const signOut = useCallback(() => {
    clearTokens();
    setState({ user: null, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
