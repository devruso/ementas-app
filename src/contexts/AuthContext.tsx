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
  refreshAuthSession,
  register as registerRequest,
  setApiAuthListeners,
  setApiSession,
  resetPassword as resetPasswordRequest,
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
const STORAGE_COOKIE_KEY = 'EMENTAS_session';
const STORAGE_SESSION_VERSION = 2;
const ACCESS_TOKEN_FALLBACK_TTL_MS = 8 * 60 * 60 * 1000;
const REFRESH_TOKEN_FALLBACK_TTL_MS = 24 * 60 * 60 * 1000;

interface StoredAuthSession {
  version: number;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
  refreshExpiresAt: number | null;
}

const decodeBase64Url = (value: string) => {
  const normalizedValue = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalizedValue.length % 4;
  const paddedValue = padding === 0 ? normalizedValue : normalizedValue.padEnd(normalizedValue.length + (4 - padding), '=');

  return atob(paddedValue);
};

const getTokenExpiry = (token: string | null | undefined) => {
  if (!token) {
    return null;
  }

  try {
    const [, payload] = token.split('.');

    if (!payload) {
      return null;
    }

    const decodedPayload = JSON.parse(decodeBase64Url(payload)) as { exp?: number };

    if (typeof decodedPayload.exp !== 'number') {
      return null;
    }

    return decodedPayload.exp * 1000;
  } catch {
    return null;
  }
};

const buildStoredSession = (accessToken: string, refreshToken: string | null = null): StoredAuthSession => ({
  version: STORAGE_SESSION_VERSION,
  accessToken,
  refreshToken,
  expiresAt: getTokenExpiry(accessToken) ?? Date.now() + ACCESS_TOKEN_FALLBACK_TTL_MS,
  refreshExpiresAt:
    refreshToken === null ? null : getTokenExpiry(refreshToken) ?? Date.now() + REFRESH_TOKEN_FALLBACK_TTL_MS,
});

const setCookieValue = (key: string, value: string, maxAgeSeconds: number) => {
  document.cookie = `${key}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax`;
};

const getCookieValue = (key: string) => {
  const cookiePrefix = `${key}=`;
  const cookies = document.cookie ? document.cookie.split('; ') : [];

  for (const cookie of cookies) {
    if (cookie.startsWith(cookiePrefix)) {
      return decodeURIComponent(cookie.substring(cookiePrefix.length));
    }
  }

  return null;
};

const clearCookieValue = (key: string) => {
  document.cookie = `${key}=; Max-Age=0; Path=/; SameSite=Lax`;
};

const safeReadLocalStorage = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeWriteLocalStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Cookie fallback keeps session alive when localStorage is unavailable.
  }
};

const safeRemoveLocalStorage = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage errors on logout/cleanup.
  }
};

const persistStoredSession = (session: StoredAuthSession) => {
  const serializedSession = JSON.stringify(session);

  safeWriteLocalStorage(STORAGE_TOKEN_KEY, serializedSession);

  const ttlMs = Math.max(session.expiresAt - Date.now(), session.refreshExpiresAt ? session.refreshExpiresAt - Date.now() : 0);
  const ttlSeconds = Math.max(60, Math.floor(ttlMs / 1000));
  setCookieValue(STORAGE_COOKIE_KEY, serializedSession, ttlSeconds);
};

const clearStoredSession = () => {
  safeRemoveLocalStorage(STORAGE_TOKEN_KEY);
  clearCookieValue(STORAGE_COOKIE_KEY);
};

const normalizeStoredSession = (session: StoredAuthSession) => {
  const now = Date.now();
  const hasValidAccess = session.expiresAt > now;
  const hasValidRefresh = Boolean(
    session.refreshToken && session.refreshExpiresAt && session.refreshExpiresAt > now
  );

  if (!hasValidAccess && !hasValidRefresh) {
    return null;
  }

  return session;
};

const readStoredSession = () => {
  const storedValue = safeReadLocalStorage(STORAGE_TOKEN_KEY) || getCookieValue(STORAGE_COOKIE_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(storedValue) as Partial<StoredAuthSession>;
    const parsedAccessToken =
      typeof parsedValue.accessToken === 'string'
        ? parsedValue.accessToken
        : typeof (parsedValue as { token?: string }).token === 'string'
          ? (parsedValue as { token: string }).token
          : null;

    if (!parsedAccessToken) {
      clearStoredSession();
      return null;
    }

    const session = {
      version: typeof parsedValue.version === 'number' ? parsedValue.version : STORAGE_SESSION_VERSION,
      accessToken: parsedAccessToken,
      refreshToken: typeof parsedValue.refreshToken === 'string' ? parsedValue.refreshToken : null,
      expiresAt:
        typeof parsedValue.expiresAt === 'number'
          ? parsedValue.expiresAt
          : getTokenExpiry(parsedAccessToken) ?? Date.now() + ACCESS_TOKEN_FALLBACK_TTL_MS,
      refreshExpiresAt:
        typeof parsedValue.refreshExpiresAt === 'number'
          ? parsedValue.refreshExpiresAt
          : typeof parsedValue.refreshToken === 'string'
            ? getTokenExpiry(parsedValue.refreshToken) ?? Date.now() + REFRESH_TOKEN_FALLBACK_TTL_MS
            : null,
    } satisfies StoredAuthSession;

    const normalizedSession = normalizeStoredSession(session);

    if (!normalizedSession) {
      clearStoredSession();
      return null;
    }

    return normalizedSession;
  } catch {
    const legacySession = buildStoredSession(storedValue, null);
    const normalizedLegacySession = normalizeStoredSession(legacySession);

    if (!normalizedLegacySession) {
      clearStoredSession();
      return null;
    }

    persistStoredSession(normalizedLegacySession);

    return normalizedLegacySession;
  }
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<StoredAuthSession | null>(null);
  const [user, setUser] = useState<User>();

  const token = session?.accessToken || null;

  const logout = () => {
    setSession(null);
    setUser(undefined);
    setApiSession(null);
    clearStoredSession();
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
    const updatedSession = buildStoredSession(response.accessToken || response.token, response.refreshToken);

    setSession(updatedSession);
    setApiSession({ accessToken: updatedSession.accessToken, refreshToken: updatedSession.refreshToken });
    persistStoredSession(updatedSession);
  };

  const register = async (inviteToken: string, name: string, email: string, password: string) => {
    await registerRequest(inviteToken, name, email, password);
  };

  const resetPassword = async (email: string) => {
    await resetPasswordRequest(email);
  };

  useEffect(() => {
    setApiAuthListeners({
      onSessionUpdate: (updatedTokens) => {
        const updatedSession = buildStoredSession(updatedTokens.accessToken, updatedTokens.refreshToken);
        setSession(updatedSession);
        persistStoredSession(updatedSession);
      },
      onSessionClear: () => {
        setSession(null);
        setUser(undefined);
        clearStoredSession();
      },
    });

    return () => {
      setApiAuthListeners({ onSessionUpdate: undefined, onSessionClear: undefined });
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initializeSession = async () => {
      const storedSession = readStoredSession();

      if (!storedSession) {
        setApiSession(null);

        if (!cancelled) {
          setIsLoading(false);
        }

        return;
      }

      try {
        let activeSession = storedSession;
        const hasValidAccessToken = storedSession.expiresAt > Date.now();

        if (storedSession.expiresAt <= Date.now() && storedSession.refreshToken) {
          const refreshedSession = await refreshAuthSession(storedSession.refreshToken);

          activeSession = buildStoredSession(
            refreshedSession.accessToken || refreshedSession.token,
            refreshedSession.refreshToken
          );
        } else if (!storedSession.refreshToken && hasValidAccessToken) {
          try {
            const upgradedSession = await refreshAuthSession(storedSession.accessToken);

            activeSession = buildStoredSession(
              upgradedSession.accessToken || upgradedSession.token,
              upgradedSession.refreshToken
            );
          } catch {
            activeSession = storedSession;
          }
        }

        if (cancelled) {
          return;
        }

        setSession(activeSession);
        setApiSession({ accessToken: activeSession.accessToken, refreshToken: activeSession.refreshToken });
        persistStoredSession(activeSession);
      } catch {
        if (cancelled) {
          return;
        }

        setSession(null);
        setUser(undefined);
        setApiSession(null);
        clearStoredSession();
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void initializeSession();

    return () => {
      cancelled = true;
    };
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
      isAuthenticated: Boolean(session),
      user,
      login,
      register,
      resetPassword,
      logout,
      refreshUser,
    }),
    [isLoading, session, user]
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