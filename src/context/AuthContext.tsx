import React, { createContext, useContext, useEffect, useState } from 'react';
import { firebaseService } from '../services/firebaseService';
import { UserSession } from '../types';

interface AuthContextType {
  user: UserSession;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession>({ role: 'GUEST' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firebaseService.observeAuthState((session) => {
      if (session) {
        setUser(session);
      } else {
        setUser({ role: 'GUEST' });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await firebaseService.logout();
    setUser({ role: 'GUEST' });
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};