import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { watchAuth, type AuthUser } from '../firebase/auth';
import { isFirebaseConfigured } from '../firebase/config';

interface AuthContextValue {
  user: AuthUser | null;
  /** True until Firebase has told us whether anyone is signed in. */
  isLoading: boolean;
  isConfigured: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setIsLoading(false);
      return;
    }
    return watchAuth((next) => {
      setUser(next);
      setIsLoading(false);
    });
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, isConfigured: isFirebaseConfigured }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
