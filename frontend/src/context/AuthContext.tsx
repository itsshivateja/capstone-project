import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: { username_or_email: string; password: string }) => Promise<void>;
  register: (data: { email: string; username: string; password: string; full_name?: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('auron_ai_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auron_ai_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('auron_ai_token');
      if (storedToken) {
        try {
          const currentUser = await authService.getMe();
          setUser(currentUser);
          localStorage.setItem('auron_ai_user', JSON.stringify(currentUser));
        } catch (err) {
          localStorage.removeItem('auron_ai_token');
          localStorage.removeItem('auron_ai_user');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: { username_or_email: string; password: string }) => {
    const data = await authService.login(credentials);
    localStorage.setItem('auron_ai_token', data.access_token);
    localStorage.setItem('auron_ai_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
  };

  const register = async (credentials: { email: string; username: string; password: string; full_name?: string }) => {
    const data = await authService.register(credentials);
    localStorage.setItem('auron_ai_token', data.access_token);
    localStorage.setItem('auron_ai_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('auron_ai_token');
    localStorage.removeItem('auron_ai_user');
    setUser(null);
    setToken(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
