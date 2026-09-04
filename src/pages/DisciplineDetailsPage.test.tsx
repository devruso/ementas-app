import { render, screen, waitFor, within } from '@testing-library/react';
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
  getDraftPublicationContext,
} from '../lib/api';
import { AppError } from '../lib/errors';
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
    getDraftPublicationContext: vi.fn(),
    getActivePublicShares: vi.fn(),
    exportComponentPdf: vi.fn(),
    exportComponentDocx: vi.fn(),
    approveComponentDraft: vi.fn(),
    createPublicShare: vi.fn(),
  };
});

const mockedGetComponentByCode = vi.mocked(getComponentByCode);
const mockedGetComponents = vi.mocked(getComponents);
const mockedGetComponentDrafts = vi.mocked(getComponentDrafts);
const mockedGetComponentLogs = vi.mocked(getComponentLogs);
const mockedGetDraftPublicationContext = vi.mocked(getDraftPublicationContext);
const mockedGetActivePublicShares = vi.mocked(getActivePublicShares);
const mockedExportComponentPdf = vi.mocked(exportComponentPdf);
const mockedExportComponentDocx = vi.mocked(exportComponentDocx);
const mockedApproveComponentDraft = vi.mocked(approveComponentDraft);
const mockedCreatePublicShare = vi.mocked(createPublicShare);
const writeTextMock = vi.fn();

describe('DisciplineDetailsPage', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: {
        id: 'u1',
        name: 'Admin',
        email: 'admin@test.com',
        role: 'admin',
        hasSignatureConfigured: true,
        hasSignatureFileConfigured: true,
      },
    });
    mockedGetDraftPublicationContext.mockResolvedValueOnce({
      agreementDate: '2026-05-01T12:00:00.000Z',
      agreementNumber: 'ATA-2026-001',
      approverName: 'Admin',
      hasVisualSignature: false,
      agreementRule: 'ATA-{ANO}-{SEQUENCIA_GLOBAL_ANUAL_COM_3_DIGITOS}',
    });

    mockedGetComponentByCode.mockResolvedValue({
      id: 'component-1',
      code: 'IC045',
      name: 'Compiladores',
      department: 'DCC',
      semester: '2026.1',
      academicLevel: 'graduacao',
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

    mockedGetDraftPublicationContext.mockResolvedValue({
      agreementDate: '2026-05-01T12:00:00.000Z',
      agreementNumber: 'ATA-2026-001',
      approverName: 'Admin',
      hasVisualSignature: true,
      agreementRule: 'ATA-{ANO}-{SEQUENCIA_GLOBAL_ANUAL_COM_3_DIGITOS}',
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

    mockedApproveComponentDraft.mockResolvedValue({
      id: 'component-1',
      code: 'IC045',
      name: 'Compiladores',
    } as never);
    mockedCreatePublicShare.mockResolvedValue({
      id: 'share-2',
      token: 'token-2',
      expiresAt: '2026-05-04T12:00:00.000Z',
      publicLink: '/publico/disciplinas/token-2',
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: writeTextMock.mockResolvedValue(undefined) },
    });

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
    expect(screen.getByText('DCC')).toBeInTheDocument();
    expect(screen.getByText('Graduação')).toBeInTheDocument();
    expect(screen.getByText('MATA50 (pendente)')).toBeInTheDocument();
    expect(screen.getAllByText('Ementa de teste')).toHaveLength(1);

    const syllabusSection = screen.getByText('Ementa').closest('section');
    const workloadRegion = screen.getByRole('region', { name: 'Carga horária' });
    expect(syllabusSection).not.toBeNull();
    expect((syllabusSection as HTMLElement).compareDocumentPosition(workloadRegion) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const publishButton = screen.getByRole('button', { name: 'Publicar' });
    expect(publishButton).not.toHaveClass('bg-primary-500');
  });

  it('deve aprovar rascunho com data e número de ata', async () => {
    render(
      <MemoryRouter>
        <DisciplineDetailsPage />
      </MemoryRouter>
    );

    await screen.findByText('Compiladores draft');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    const dialogTitle = await screen.findByRole('heading', { name: 'Publicar IC045' });
    const dialogContainer = dialogTitle.closest('div.panel');

    expect(dialogContainer).not.toBeNull();

    const dialog = within(dialogContainer as HTMLElement);
    expect(await dialog.findByText('ATA-2026-001')).toBeInTheDocument();
    expect(dialog.getByText('Admin')).toBeInTheDocument();

    await userEvent.click(dialog.getByRole('button', { name: 'Continuar' }));
    await userEvent.type(dialog.getByLabelText('Senha de login'), 'Senha123!');
    await userEvent.click(dialog.getByRole('button', { name: /Confirmar publica/ }));

    await waitFor(() => {
      expect(mockedApproveComponentDraft).toHaveBeenCalledTimes(1);
    });

    expect(mockedApproveComponentDraft).toHaveBeenCalledWith(
      'draft-1',
      { password: 'Senha123!' }
    );
  });

  it('deve exibir status das assinaturas no dialogo de publicacao', async () => {
    useAuthMock.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: {
        id: 'u1',
        name: 'Admin',
        email: 'admin@test.com',
        role: 'admin',
        hasSignatureConfigured: true,
        hasSignatureFileConfigured: false,
      },
    });

    render(
      <MemoryRouter>
        <DisciplineDetailsPage />
      </MemoryRouter>
    );

    await screen.findByText('Compiladores draft');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    const dialogTitle = await screen.findByRole('heading', { name: 'Publicar IC045' });
    const dialog = within(dialogTitle.closest('div.panel') as HTMLElement);
    expect(await dialog.findByText('Linha nominal, sem imagem')).toBeInTheDocument();
    expect(dialog.getByText(/imagem da assinatura .* opcional/i)).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Continuar' })).toBeEnabled();
  });

  it('deve manter o diálogo aberto e informar senha incorreta sem navegar', async () => {
    mockedApproveComponentDraft.mockRejectedValueOnce(new AppError(
      'Senha incorreta. A publicação não foi realizada.',
      403,
      { code: 'PUBLICATION_PASSWORD_INVALID' }
    ));

    render(
      <MemoryRouter>
        <DisciplineDetailsPage />
      </MemoryRouter>
    );

    await screen.findByText('Compiladores draft');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    const dialog = within((await screen.findByRole('heading', { name: 'Publicar IC045' })).closest('div.panel') as HTMLElement);
    await userEvent.click(dialog.getByRole('button', { name: 'Continuar' }));
    await userEvent.type(dialog.getByLabelText('Senha de login'), 'senha-errada');
    await userEvent.click(dialog.getByRole('button', { name: /Confirmar publica/ }));

    expect(await dialog.findByText('Senha incorreta. A publicação não foi realizada.')).toBeInTheDocument();
    expect(dialog.getByLabelText('Senha de login')).toHaveValue('senha-errada');
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('deve mostrar mensagem amigável quando a publicação falha por referência sem ano', async () => {
    mockedApproveComponentDraft.mockRejectedValueOnce(new AppError(
      'A publicação exige o ano nas referências não web.',
      400,
      {
        code: 'PUBLICATION_REFERENCE_YEAR_REQUIRED',
        reason: 'Uma referência complementar sem URL não informa o ano de publicação.',
        recovery: 'Informe o ano da referência e salve o rascunho antes de publicar novamente.',
      }
    ));

    render(
      <MemoryRouter>
        <DisciplineDetailsPage />
      </MemoryRouter>
    );

    await screen.findByText('Compiladores draft');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    const dialogTitle = await screen.findByRole('heading', { name: 'Publicar IC045' });
    const dialogContainer = dialogTitle.closest('div.panel');

    expect(dialogContainer).not.toBeNull();

    const dialog = within(dialogContainer as HTMLElement);
    await dialog.findByText('ATA-2026-001');
    await userEvent.click(dialog.getByRole('button', { name: 'Continuar' }));
    await userEvent.type(dialog.getByLabelText('Senha de login'), 'Senha123!');
    await userEvent.click(dialog.getByRole('button', { name: /Confirmar publica/ }));

    expect(await dialog.findByText(/exige o ano nas refer/i)).toBeInTheDocument();
    expect(dialog.getByText(/sem URL não informa o ano/i)).toBeInTheDocument();
    expect(dialog.getByText(/informe o ano da refer/i)).toBeInTheDocument();
    expect(dialog.getByText(/C.digo: PUBLICATION_REFERENCE_YEAR_REQUIRED/)).toBeInTheDocument();
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

  it('deve exibir somente o link público ativo mais recente', async () => {
    render(
      <MemoryRouter>
        <DisciplineDetailsPage />
      </MemoryRouter>
    );

    const linkInput = await screen.findByLabelText('Link público ativo');
    expect(linkInput).toHaveValue(`${window.location.origin}/publico/disciplinas/token-1`);
    expect(mockedGetActivePublicShares).toHaveBeenCalledWith('component-1', {
      page: 0,
      limit: 1,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    });
    expect(screen.queryByLabelText('Ordenar links por')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Filtrar links por criador')).not.toBeInTheDocument();
  });

  it('deve gerar um link público de 24 horas e copiá-lo', async () => {
    mockedGetActivePublicShares.mockResolvedValueOnce({ results: [], total: 0 });

    render(
      <MemoryRouter>
        <DisciplineDetailsPage />
      </MemoryRouter>
    );

    await screen.findByText('Compiladores draft');
    await userEvent.click(screen.getByRole('button', { name: 'Gerar link público' }));

    await waitFor(() => {
      expect(mockedCreatePublicShare).toHaveBeenCalledWith('component-1', 24);
    });

    const generatedLink = `${window.location.origin}/publico/disciplinas/token-2`;
    expect(screen.getByLabelText('Link público ativo')).toHaveValue(generatedLink);

    await userEvent.click(screen.getByRole('button', { name: 'Copiar link público' }));
    expect(writeTextMock).toHaveBeenCalledWith(generatedLink);
    expect(screen.getByText('Link copiado.')).toBeInTheDocument();
  });
});
