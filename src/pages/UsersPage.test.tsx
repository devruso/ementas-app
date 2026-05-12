import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTeacherByAdmin, deleteUserById, generateInvite, getUsers, sendInviteByEmail, updateUserRole } from '../lib/api';
import { UsersPage } from './UsersPage';

const useAuthMock = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../lib/api', () => ({
  getUsers: vi.fn(),
  generateInvite: vi.fn(),
  deleteUserById: vi.fn(),
  createTeacherByAdmin: vi.fn(),
  sendInviteByEmail: vi.fn(),
  updateUserRole: vi.fn(),
}));

const mockedGetUsers = vi.mocked(getUsers);
const mockedGenerateInvite = vi.mocked(generateInvite);
const mockedDeleteUserById = vi.mocked(deleteUserById);
const mockedCreateTeacherByAdmin = vi.mocked(createTeacherByAdmin);
const mockedSendInviteByEmail = vi.mocked(sendInviteByEmail);
const mockedUpdateUserRole = vi.mocked(updateUserRole);

describe('UsersPage', () => {
  const originalConfirm = window.confirm;

  beforeEach(() => {
    useAuthMock.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { id: 'super-1', name: 'Super', email: 'super@test.com', role: 'super_admin' },
    });

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

  it('deve enviar convite por e-mail institucional', async () => {
    mockedSendInviteByEmail.mockResolvedValueOnce({
      email: 'jamilsonj@ufba.br',
      token: 'invite-token-email-1',
      inviteLink: `${window.location.origin}/cadastrar/invite-token-email-1`,
      emailDeliveryStatus: 'mock',
    });

    render(<UsersPage />);

    await screen.findByText('Professor Teste');
    await userEvent.clear(screen.getByLabelText('Enviar convite para e-mail institucional'));
    await userEvent.type(screen.getByLabelText('Enviar convite para e-mail institucional'), 'jamilsonj@ufba.br');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar convite por e-mail' }));

    await waitFor(() => {
      expect(mockedSendInviteByEmail).toHaveBeenCalledWith('jamilsonj@ufba.br', window.location.origin);
    });

    expect(await screen.findByText('Convite gerado')).toBeInTheDocument();
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

  it('deve criar professor diretamente no app', async () => {
    mockedCreateTeacherByAdmin.mockResolvedValueOnce({
      id: 'u-2',
      name: 'Novo Professor',
      email: 'novo.prof@test.com',
      temporaryPassword: 'F$vJAL5Kx!Hz',
    });

    render(<UsersPage />);

    await userEvent.type(await screen.findByLabelText('Nome do professor'), 'Novo Professor');
    await userEvent.type(screen.getByLabelText('E-mail institucional'), 'novo.prof@test.com');
    await userEvent.click(screen.getByRole('button', { name: 'Criar professor agora' }));

    await waitFor(() => {
      expect(mockedCreateTeacherByAdmin).toHaveBeenCalledWith(
        'Novo Professor',
        'novo.prof@test.com',
        true
      );
    });

    expect(await screen.findByText('Professor criado com sucesso. Guarde a senha provisória com segurança.')).toBeInTheDocument();
  });

  it('deve permitir ao super admin atualizar o perfil de usuário', async () => {
    window.confirm = vi.fn(() => true);
    mockedUpdateUserRole.mockResolvedValueOnce();

    render(<UsersPage />);

    expect(await screen.findByText('Professor Teste')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Perfil de Professor Teste'), 'admin');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }));

    await waitFor(() => {
      expect(mockedUpdateUserRole).toHaveBeenCalledWith('u-1', 'admin');
    });
  });
});
