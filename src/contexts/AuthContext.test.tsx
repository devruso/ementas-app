import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { AuthProvider, useAuth } from './AuthContext';

const getCurrentUserMock = vi.fn();
const loginMock = vi.fn();
const refreshAuthSessionMock = vi.fn();
const registerMock = vi.fn();
const resetPasswordMock = vi.fn();
const setApiSessionMock = vi.fn();
const setApiAuthListenersMock = vi.fn();

vi.mock('../lib/api', () => ({
  getCurrentUser: (...args: unknown[]) => getCurrentUserMock(...args),
  login: (...args: unknown[]) => loginMock(...args),
  refreshAuthSession: (...args: unknown[]) => refreshAuthSessionMock(...args),
  register: (...args: unknown[]) => registerMock(...args),
  resetPassword: (...args: unknown[]) => resetPasswordMock(...args),
  setApiSession: (...args: unknown[]) => setApiSessionMock(...args),
  setApiAuthListeners: (...args: unknown[]) => setApiAuthListenersMock(...args),
}));

const STORAGE_TOKEN_KEY = 'EMENTAS/token';

const toBase64Url = (value: string) => btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const createToken = (expiresAtSeconds: number) => {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = toBase64Url(JSON.stringify({ exp: expiresAtSeconds }));

  return `${header}.${payload}.signature`;
};

const AuthProbe = () => {
  const auth = useAuth();

  return (
    <div>
      <span data-testid="loading">{String(auth.isLoading)}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="user">{auth.user?.name ?? 'none'}</span>
    </div>
  );
};

describe('AuthContext persisted session', () => {
  beforeEach(() => {
    window.localStorage.clear();
    getCurrentUserMock.mockReset();
    loginMock.mockReset();
    refreshAuthSessionMock.mockReset();
    registerMock.mockReset();
    resetPasswordMock.mockReset();
    setApiSessionMock.mockReset();
    setApiAuthListenersMock.mockReset();
  });

  it('rehydrates a legacy stored token and migrates it to the session envelope', async () => {
    const token = createToken(Math.floor(Date.now() / 1000) + 60 * 60);

    window.localStorage.setItem(STORAGE_TOKEN_KEY, token);
    getCurrentUserMock.mockResolvedValueOnce({
      id: 'user-1',
      name: 'Professor UFBA',
      email: 'professor@ufba.br',
      role: 'teacher',
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Professor UFBA');
    });

    expect(setApiSessionMock).toHaveBeenCalledWith({ accessToken: token, refreshToken: null });

    const storedSession = window.localStorage.getItem(STORAGE_TOKEN_KEY);

    expect(storedSession).toContain('"accessToken"');
    expect(storedSession).toContain('"expiresAt"');
  });

  it('cleans up an expired stored session before trying to load the current user', async () => {
    const expiredTimestamp = Date.now() - 5 * 60 * 1000;

    window.localStorage.setItem(
      STORAGE_TOKEN_KEY,
      JSON.stringify({
        version: 1,
        token: createToken(Math.floor(expiredTimestamp / 1000)),
        expiresAt: expiredTimestamp,
      })
    );

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(getCurrentUserMock).not.toHaveBeenCalled();
    expect(setApiSessionMock).toHaveBeenCalledWith(null);
    expect(window.localStorage.getItem(STORAGE_TOKEN_KEY)).toBeNull();
  });

  it('updates persisted session when api layer reports token rotation', async () => {
    const currentUser = {
      id: 'user-2',
      name: 'Coordenadora',
      email: 'coord@ufba.br',
      role: 'admin',
    };
    const nextAccessToken = createToken(Math.floor(Date.now() / 1000) + 30 * 60);
    const nextRefreshToken = createToken(Math.floor(Date.now() / 1000) + 12 * 60 * 60);

    getCurrentUserMock.mockResolvedValue(currentUser);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    const listenerRegistration = setApiAuthListenersMock.mock.calls[0]?.[0] as
      | { onSessionUpdate?: (session: { accessToken: string; refreshToken: string }) => void }
      | undefined;

    expect(listenerRegistration?.onSessionUpdate).toBeTypeOf('function');

    await act(async () => {
      listenerRegistration?.onSessionUpdate?.({
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Coordenadora');
    });

    const storedSession = window.localStorage.getItem(STORAGE_TOKEN_KEY);

    expect(storedSession).toContain(nextAccessToken);
    expect(storedSession).toContain(nextRefreshToken);
  });

  it('refreshes bootstrap session when access token is expired but refresh token is valid', async () => {
    const expiredAccessToken = createToken(Math.floor(Date.now() / 1000) - 60);
    const validRefreshToken = createToken(Math.floor(Date.now() / 1000) + 60 * 60);
    const renewedAccessToken = createToken(Math.floor(Date.now() / 1000) + 30 * 60);
    const renewedRefreshToken = createToken(Math.floor(Date.now() / 1000) + 12 * 60 * 60);

    window.localStorage.setItem(
      STORAGE_TOKEN_KEY,
      JSON.stringify({
        version: 2,
        accessToken: expiredAccessToken,
        refreshToken: validRefreshToken,
        expiresAt: Date.now() - 1000,
        refreshExpiresAt: Date.now() + 60 * 60 * 1000,
      })
    );

    refreshAuthSessionMock.mockResolvedValueOnce({
      token: renewedAccessToken,
      accessToken: renewedAccessToken,
      refreshToken: renewedRefreshToken,
      expiresIn: 1800,
      refreshExpiresIn: 43200,
    });

    getCurrentUserMock.mockResolvedValueOnce({
      id: 'user-3',
      name: 'Docente Renovado',
      email: 'docente@ufba.br',
      role: 'teacher',
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(refreshAuthSessionMock).toHaveBeenCalledWith(validRefreshToken);
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Docente Renovado');
    });

    const updatedSession = window.localStorage.getItem(STORAGE_TOKEN_KEY);

    expect(updatedSession).toContain(renewedAccessToken);
    expect(updatedSession).toContain(renewedRefreshToken);
  });

  it('upgrades legacy bootstrap session without refresh token when access token is still valid', async () => {
    const currentAccessToken = createToken(Math.floor(Date.now() / 1000) + 20 * 60);
    const upgradedAccessToken = createToken(Math.floor(Date.now() / 1000) + 30 * 60);
    const upgradedRefreshToken = createToken(Math.floor(Date.now() / 1000) + 12 * 60 * 60);

    window.localStorage.setItem(
      STORAGE_TOKEN_KEY,
      JSON.stringify({
        version: 1,
        token: currentAccessToken,
        expiresAt: Date.now() + 20 * 60 * 1000,
      })
    );

    refreshAuthSessionMock.mockResolvedValueOnce({
      token: upgradedAccessToken,
      accessToken: upgradedAccessToken,
      refreshToken: upgradedRefreshToken,
      expiresIn: 1800,
      refreshExpiresIn: 43200,
    });

    getCurrentUserMock.mockResolvedValueOnce({
      id: 'user-4',
      name: 'Docente Migrado',
      email: 'migrado@ufba.br',
      role: 'teacher',
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(refreshAuthSessionMock).toHaveBeenCalledWith(currentAccessToken);
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Docente Migrado');
    });

    const upgradedSession = window.localStorage.getItem(STORAGE_TOKEN_KEY);

    expect(upgradedSession).toContain(upgradedAccessToken);
    expect(upgradedSession).toContain(upgradedRefreshToken);
  });
});