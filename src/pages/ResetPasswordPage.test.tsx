import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { confirmResetPassword } from '../lib/api';
import { AppError } from '../lib/errors';
import { ResetPasswordPage } from './ResetPasswordPage';

const loginMock = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ login: loginMock }),
}));

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api');

  return {
    ...actual,
    confirmResetPassword: vi.fn(),
  };
});

const mockedConfirmResetPassword = vi.mocked(confirmResetPassword);

const renderPage = () => render(
  <MemoryRouter initialEntries={['/novasenha/reset-token']}>
    <Routes>
      <Route path="/novasenha/:token" element={<ResetPasswordPage />} />
      <Route path="/disciplinas" element={<div>Área autenticada</div>} />
    </Routes>
  </MemoryRouter>
);

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve redefinir a senha, autenticar e abrir a área interna', async () => {
    mockedConfirmResetPassword.mockResolvedValueOnce({ email: 'professor@ufba.br' });
    loginMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    renderPage();

    await user.type(screen.getByLabelText('Nova senha'), 'NovaSenha123!');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'NovaSenha123!');
    await user.click(screen.getByRole('button', { name: 'Salvar nova senha' }));

    await waitFor(() => {
      expect(mockedConfirmResetPassword).toHaveBeenCalledWith('reset-token', 'NovaSenha123!');
      expect(loginMock).toHaveBeenCalledWith('professor@ufba.br', 'NovaSenha123!');
    });
    expect(await screen.findByText('Área autenticada')).toBeInTheDocument();
  });

  it('deve explicar quando o link expirou', async () => {
    mockedConfirmResetPassword.mockRejectedValueOnce(new AppError(
      'O link de redefinição é inválido ou expirou.',
      401,
      {
        code: 'AUTH_PASSWORD_RESET_LINK_INVALID',
        reason: 'O token não corresponde a uma solicitação ativa para esta conta.',
        recovery: 'Solicite um novo link na tela Esqueci minha senha.',
      }
    ));
    const user = userEvent.setup();

    renderPage();

    await user.type(screen.getByLabelText('Nova senha'), 'NovaSenha123!');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'NovaSenha123!');
    await user.click(screen.getByRole('button', { name: 'Salvar nova senha' }));

    expect(await screen.findByText(/link de redefinição é inválido/i)).toBeInTheDocument();
    expect(screen.getByText(/token não corresponde/i)).toBeInTheDocument();
    expect(screen.getByText(/solicite um novo link/i)).toBeInTheDocument();
  });
});
