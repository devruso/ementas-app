import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteUserById, generateInvite, getUsers } from '../lib/api';
import { UsersPage } from './UsersPage';

vi.mock('../lib/api', () => ({
  getUsers: vi.fn(),
  generateInvite: vi.fn(),
  deleteUserById: vi.fn(),
}));

const mockedGetUsers = vi.mocked(getUsers);
const mockedGenerateInvite = vi.mocked(generateInvite);
const mockedDeleteUserById = vi.mocked(deleteUserById);

describe('UsersPage', () => {
  const originalConfirm = window.confirm;

  beforeEach(() => {
    mockedGetUsers.mockResolvedValue({
      results: [
        {
          id: 'u-1',
          name: 'Professor Teste',
          email: 'prof@test.com',
          role: 'teacher',
          createdAt: '2026-05-01T00:00:00.000Z',
        },
      ],
      total: 1,
      meta: {
        page: 0,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });
  });

  afterEach(() => {
    window.confirm = originalConfirm;
    vi.clearAllMocks();
  });

  it('deve listar usuários e gerar convite', async () => {
    mockedGenerateInvite.mockResolvedValueOnce('invite-token-123');

    render(<UsersPage />);

    expect(await screen.findByText('Professor Teste')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Gerar convite' }));

    expect(await screen.findByText('Convite gerado')).toBeInTheDocument();
    expect(screen.getByText(`${window.location.origin}/cadastrar/invite-token-123`)).toBeInTheDocument();
  });

  it('deve remover usuário após confirmação', async () => {
    window.confirm = vi.fn(() => true);
    mockedDeleteUserById.mockResolvedValueOnce();

    render(<UsersPage />);

    expect(await screen.findByText('Professor Teste')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remover' }));

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(mockedDeleteUserById).toHaveBeenCalledWith('u-1');
    });
  });
});
