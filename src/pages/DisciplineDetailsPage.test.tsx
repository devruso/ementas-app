import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import {
  approveComponentDraft,
  createPublicShare,
  exportComponentDocx,
  exportComponentPdf,
  getActivePublicShares,
  getComponentByCode,
  getComponentDrafts,
  getComponents,
  getComponentLogs,
  revokeAllPublicShares,
  revokePublicShare,
} from '../lib/api';
import { DisciplineDetailsPage } from './DisciplineDetailsPage';

const navigateMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ componentCode: 'ic045' }),
  };
});

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api');

  return {
    ...actual,
    getComponentByCode: vi.fn(),
    getComponents: vi.fn(),
    getComponentDrafts: vi.fn(),
    getComponentLogs: vi.fn(),
    getActivePublicShares: vi.fn(),
    exportComponentPdf: vi.fn(),
    exportComponentDocx: vi.fn(),
    approveComponentDraft: vi.fn(),
    createPublicShare: vi.fn(),
    revokePublicShare: vi.fn(),
    revokeAllPublicShares: vi.fn(),
  };
});

const mockedGetComponentByCode = vi.mocked(getComponentByCode);
const mockedGetComponents = vi.mocked(getComponents);
const mockedGetComponentDrafts = vi.mocked(getComponentDrafts);
const mockedGetComponentLogs = vi.mocked(getComponentLogs);
const mockedGetActivePublicShares = vi.mocked(getActivePublicShares);
const mockedExportComponentPdf = vi.mocked(exportComponentPdf);
const mockedExportComponentDocx = vi.mocked(exportComponentDocx);
const mockedApproveComponentDraft = vi.mocked(approveComponentDraft);
const mockedCreatePublicShare = vi.mocked(createPublicShare);
const mockedRevokePublicShare = vi.mocked(revokePublicShare);
const mockedRevokeAllPublicShares = vi.mocked(revokeAllPublicShares);

describe('DisciplineDetailsPage', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { id: 'u1', name: 'Admin', email: 'admin@test.com', role: 'admin' },
    });

    mockedGetComponentByCode.mockResolvedValue({
      id: 'component-1',
      code: 'IC045',
      name: 'Compiladores',
      department: 'DCC',
      semester: '2026.1',
      modality: 'Presencial',
      program: 'Conteúdo programático de teste',
      objective: 'Objetivos de teste',
      syllabus: 'Ementa de teste',
      methodology: 'Metodologia',
      learningAssessment: 'Avaliação',
      bibliography: 'Bibliografia',
      prerequeriments: 'MATA50',
      userId: 'u1',
      draft: {
        id: 'draft-1',
        code: 'IC045',
        name: 'Compiladores draft',
      },
      logs: [],
    });

    mockedGetComponentLogs.mockResolvedValue({
      results: [],
      total: 0,
    });

    mockedGetComponents.mockResolvedValue({
      results: [],
      total: 0,
    });

    mockedGetComponentDrafts.mockResolvedValue({
      results: [],
      total: 0,
    });

    mockedGetActivePublicShares.mockResolvedValue({
      results: [
        {
          id: 'share-1',
          token: 'token-1',
          expiresAt: '2026-05-03T12:00:00.000Z',
          publicLink: '/publico/disciplinas/token-1',
          createdBy: 'u1',
          createdByUser: {
            id: 'u1',
            name: 'Admin',
            email: 'admin@test.com',
          },
        },
      ],
      total: 1,
      meta: { page: 0, limit: 5, total: 1, totalPages: 1, sortBy: 'createdAt', sortOrder: 'DESC' },
    });

    mockedExportComponentPdf.mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
    mockedExportComponentDocx.mockResolvedValue(new Blob(['docx'], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }));

    mockedApproveComponentDraft.mockResolvedValue();
    mockedCreatePublicShare.mockResolvedValue({
      id: 'share-2',
      token: 'token-2',
      expiresAt: '2026-05-04T12:00:00.000Z',
      publicLink: '/publico/disciplinas/token-2',
    });
    mockedRevokePublicShare.mockResolvedValue();
    mockedRevokeAllPublicShares.mockResolvedValue({ revokedCount: 1 });

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('deve mostrar atalho de edição para usuário autenticado', async () => {
    render(
      <MemoryRouter>
        <DisciplineDetailsPage />
      </MemoryRouter>
    );

    const editLink = await screen.findByRole('link', { name: 'Editar disciplina' });
    expect(editLink).toHaveAttribute('href', '/disciplinas/ic045/editar');
  });

  it('deve aprovar rascunho com data e número de ata', async () => {
    render(
      <MemoryRouter>
        <DisciplineDetailsPage />
      </MemoryRouter>
    );

    await screen.findByText('Compiladores draft');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    await screen.findByText('Publicar IC045');

    await userEvent.type(screen.getByLabelText('Data da ATA'), '2026-05-01');
    await userEvent.type(screen.getByLabelText('Numero da ATA'), 'ATA-123');
    await userEvent.type(screen.getByLabelText('Assinatura de aprovação'), 'Assina123!');
    await userEvent.click(screen.getAllByRole('button', { name: 'Publicar' })[1]);

    await waitFor(() => {
      expect(mockedApproveComponentDraft).toHaveBeenCalledTimes(1);
    });

    const payload = mockedApproveComponentDraft.mock.calls[0][1];
    expect(mockedApproveComponentDraft).toHaveBeenCalledWith(
      'draft-1',
      expect.objectContaining({
        agreementNumber: 'ATA-123',
        signature: 'Assina123!',
      })
    );
    expect(payload.agreementDate).toContain('2026-05-01');
  });

  it('deve exportar PDF e DOCX na tela de detalhe', async () => {
    render(
      <MemoryRouter>
        <DisciplineDetailsPage />
      </MemoryRouter>
    );

    await screen.findByText('Compiladores draft');

    await userEvent.click(screen.getByRole('button', { name: 'Exportar PDF oficial' }));
    await userEvent.click(screen.getByRole('button', { name: 'Exportar DOCX' }));

    await waitFor(() => {
      expect(mockedExportComponentPdf).toHaveBeenCalledWith('component-1');
      expect(mockedExportComponentDocx).toHaveBeenCalledWith('component-1');
    });
  });

  it('deve listar links públicos ativos e revogar um link', async () => {
    mockedGetActivePublicShares
      .mockResolvedValueOnce({
        results: [
          {
            id: 'share-1',
            token: 'token-1',
            expiresAt: '2026-05-03T12:00:00.000Z',
            publicLink: '/publico/disciplinas/token-1',
            createdBy: 'u1',
            createdByUser: {
              id: 'u1',
              name: 'Admin',
              email: 'admin@test.com',
            },
          },
        ],
        total: 1,
        meta: { page: 0, limit: 5, total: 1, totalPages: 1, sortBy: 'createdAt', sortOrder: 'DESC' },
      })
      .mockResolvedValueOnce({
        results: [],
        total: 0,
        meta: { page: 0, limit: 5, total: 0, totalPages: 0, sortBy: 'createdAt', sortOrder: 'DESC' },
      });

    render(
      <MemoryRouter>
        <DisciplineDetailsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Links públicos ativos')).toBeInTheDocument();
    expect(await screen.findByText(`${window.location.origin}/publico/disciplinas/token-1`)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Revogar link' }));

    await waitFor(() => {
      expect(mockedRevokePublicShare).toHaveBeenCalledWith('share-1');
    });
  });

  it('deve revogar todos os links públicos ativos', async () => {
    window.confirm = vi.fn(() => true);

    render(
      <MemoryRouter>
        <DisciplineDetailsPage />
      </MemoryRouter>
    );

    await screen.findByText('Links públicos ativos');
    await userEvent.click(screen.getByRole('button', { name: 'Revogar todos' }));

    await waitFor(() => {
      expect(mockedRevokeAllPublicShares).toHaveBeenCalledWith('component-1');
    });
  });

  it('deve filtrar links públicos por criador', async () => {
    mockedGetActivePublicShares
      .mockResolvedValueOnce({
        results: [
          {
            id: 'share-1',
            token: 'token-1',
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
            publicLink: '/publico/disciplinas/token-1',
            createdBy: 'u1',
            createdByUser: {
              id: 'u1',
              name: 'Admin',
              email: 'admin@test.com',
            },
          },
          {
            id: 'share-2',
            token: 'token-2',
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 100).toISOString(),
            publicLink: '/publico/disciplinas/token-2',
            createdBy: 'u2',
            createdByUser: {
              id: 'u2',
              name: 'Professor B',
              email: 'profb@test.com',
            },
          },
        ],
        total: 2,
        meta: { page: 0, limit: 5, total: 2, totalPages: 1, sortBy: 'createdAt', sortOrder: 'DESC' },
      })
      .mockResolvedValueOnce({
        results: [
          {
            id: 'share-2',
            token: 'token-2',
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 100).toISOString(),
            publicLink: '/publico/disciplinas/token-2',
            createdBy: 'u2',
            createdByUser: {
              id: 'u2',
              name: 'Professor B',
              email: 'profb@test.com',
            },
          },
        ],
        total: 1,
        meta: { page: 0, limit: 5, total: 1, totalPages: 1, sortBy: 'createdAt', sortOrder: 'DESC' },
      });

    render(
      <MemoryRouter>
        <DisciplineDetailsPage />
      </MemoryRouter>
    );

    await screen.findByText('Links públicos ativos');
    expect(screen.getByText(`${window.location.origin}/publico/disciplinas/token-1`)).toBeInTheDocument();
    expect(screen.getByText(`${window.location.origin}/publico/disciplinas/token-2`)).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Filtrar links por criador'), 'u2');

    await waitFor(() => {
      expect(screen.queryByText(`${window.location.origin}/publico/disciplinas/token-1`)).not.toBeInTheDocument();
      expect(screen.getByText(`${window.location.origin}/publico/disciplinas/token-2`)).toBeInTheDocument();
    });

    expect(mockedGetActivePublicShares).toHaveBeenLastCalledWith('component-1', expect.objectContaining({
      creatorId: 'u2',
    }));
  });

  it('deve filtrar links públicos por faixa de expiração', async () => {
    mockedGetActivePublicShares.mockResolvedValueOnce({
      results: [
        {
          id: 'share-1',
          token: 'token-1',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
          publicLink: '/publico/disciplinas/token-1',
          createdBy: 'u1',
          createdByUser: {
            id: 'u1',
            name: 'Admin',
            email: 'admin@test.com',
          },
        },
        {
          id: 'share-2',
          token: 'token-2',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 80).toISOString(),
          publicLink: '/publico/disciplinas/token-2',
          createdBy: 'u2',
          createdByUser: {
            id: 'u2',
            name: 'Professor B',
            email: 'profb@test.com',
          },
        },
      ],
      total: 2,
      meta: { page: 0, limit: 5, total: 2, totalPages: 1, sortBy: 'createdAt', sortOrder: 'DESC' },
    });

    render(
      <MemoryRouter>
        <DisciplineDetailsPage />
      </MemoryRouter>
    );

    await screen.findByText('Links públicos ativos');
    await userEvent.selectOptions(screen.getByLabelText('Filtrar links por expiração'), '24h');

    await waitFor(() => {
      expect(screen.getByText(`${window.location.origin}/publico/disciplinas/token-1`)).toBeInTheDocument();
      expect(screen.queryByText(`${window.location.origin}/publico/disciplinas/token-2`)).not.toBeInTheDocument();
    });
  });

  it('deve ordenar e paginar links públicos ativos', async () => {
    mockedGetActivePublicShares.mockReset();
    mockedGetActivePublicShares.mockResolvedValue({
      results: [
        {
          id: 'share-1',
          token: 'token-1',
          expiresAt: '2026-05-05T10:00:00.000Z',
          publicLink: '/publico/disciplinas/token-1',
          createdBy: 'u1',
          createdByUser: { id: 'u1', name: 'Admin', email: 'admin@test.com' },
        },
      ],
      total: 8,
      meta: { page: 0, limit: 5, total: 8, totalPages: 2, sortBy: 'createdAt', sortOrder: 'DESC' },
    });

    render(
      <MemoryRouter>
        <DisciplineDetailsPage />
      </MemoryRouter>
    );

    await screen.findByText('Links públicos ativos');
    await userEvent.selectOptions(screen.getByLabelText('Ordenar links por'), 'expiresAt');
    await userEvent.selectOptions(screen.getByLabelText('Direção da ordenação de links'), 'ASC');

    await waitFor(() => {
      expect(mockedGetActivePublicShares).toHaveBeenCalledWith('component-1', expect.objectContaining({
        sortBy: 'expiresAt',
        sortOrder: 'ASC',
      }));
    });

    expect(await screen.findByText('Página 1 de 2')).toBeInTheDocument();
  });
});
