import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  getCurrentUser,
  login as loginRequest,
  register as registerRequest,
  resetPassword as resetPasswordRequest,
  setApiToken,
} from '../lib/api';
import { AppError } from '../lib/errors';
import type { User } from '../types';

interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | undefined;
  login: (email: string, password: string) => Promise<void>;
  register: (inviteToken: string, name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const STORAGE_TOKEN_KEY = 'EMENTAS/token';

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User>();

  const logout = () => {
    setToken(null);
    setUser(undefined);
    setApiToken(null);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
  };

  const refreshUser = async () => {
    if (!token) {
      setUser(undefined);
      return;
    }

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 401) {
        logout();
        return;
      }

      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    const response = await loginRequest(email, password);

    setToken(response.token);
    setApiToken(response.token);
    localStorage.setItem(STORAGE_TOKEN_KEY, response.token);
  };

  const register = async (inviteToken: string, name: string, email: string, password: string) => {
    await registerRequest(inviteToken, name, email, password);
  };

  const resetPassword = async (email: string) => {
    await resetPasswordRequest(email);
  };

  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_TOKEN_KEY);

    if (storedToken) {
      setToken(storedToken);
      setApiToken(storedToken);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(undefined);
      return;
    }

    setIsLoading(true);
    refreshUser().finally(() => setIsLoading(false));
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated: Boolean(token),
      user,
      login,
      register,
      resetPassword,
      logout,
      refreshUser,
    }),
    [isLoading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};