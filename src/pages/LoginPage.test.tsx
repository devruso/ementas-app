import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LoginPage } from './LoginPage';

const loginMock = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: loginMock,
  }),
}));

describe('LoginPage institutional flow', () => {
  it('deve bloquear email fora do domínio UFBA no login', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText('E-mail'), 'usuario@gmail.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'Abc123!@#');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(screen.getByPlaceholderText('suaconta@ufba.br')).toBeInTheDocument();
    expect(screen.getByText('Apenas conta @ufba.br.')).toBeInTheDocument();
    expect(await screen.findByText('Use seu e-mail institucional da UFBA (@ufba.br).')).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('deve permitir login com email institucional UFBA', async () => {
    loginMock.mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText('E-mail'), 'professor@ufba.br');
    await userEvent.type(screen.getByLabelText('Senha'), 'Abc123!@#');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('professor@ufba.br', 'Abc123!@#');
    });
  });
});
