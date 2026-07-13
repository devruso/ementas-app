import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ForgotPasswordPage } from './ForgotPasswordPage';

const resetPasswordMock = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    resetPassword: resetPasswordMock,
  }),
}));

describe('ForgotPasswordPage', () => {
  it('deve validar domínio institucional e exibir placeholder esperado', async () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText('suaconta@ufba.br')).toBeInTheDocument();
    expect(screen.getByText('Apenas conta @ufba.br.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('E-mail'), 'pessoa@gmail.com');
    await userEvent.click(screen.getByRole('button', { name: 'Solicitar nova senha' }));

    expect(await screen.findByText('Use seu e-mail institucional da UFBA (@ufba.br).')).toBeInTheDocument();
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it('deve exibir mensagem de sucesso atualizada', async () => {
    resetPasswordMock.mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText('E-mail'), 'professor@ufba.br');
    await userEvent.click(screen.getByRole('button', { name: 'Solicitar nova senha' }));

    await waitFor(() => {
      expect(resetPasswordMock).toHaveBeenCalledWith('professor@ufba.br');
    });

    expect(screen.getByText('Se sua conta existir, você receberá uma nova senha no e-mail informado.')).toBeInTheDocument();
  });
});
