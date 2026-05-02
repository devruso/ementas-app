import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import {
  approveComponentDraft,
  exportComponentDocx,
  exportComponentPdf,
  getComponentByCode,
  getComponentLogs,
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
    getComponentLogs: vi.fn(),
    exportComponentPdf: vi.fn(),
    exportComponentDocx: vi.fn(),
    approveComponentDraft: vi.fn(),
  };
});

const mockedGetComponentByCode = vi.mocked(getComponentByCode);
const mockedGetComponentLogs = vi.mocked(getComponentLogs);
const mockedExportComponentPdf = vi.mocked(exportComponentPdf);
const mockedExportComponentDocx = vi.mocked(exportComponentDocx);
const mockedApproveComponentDraft = vi.mocked(approveComponentDraft);

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

    mockedExportComponentPdf.mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
    mockedExportComponentDocx.mockResolvedValue(new Blob(['docx'], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }));

    mockedApproveComponentDraft.mockResolvedValue();

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

    await userEvent.type(screen.getByLabelText('Data da ATA'), '2026-05-01T10:30');
    await userEvent.type(screen.getByLabelText('Numero da ATA'), 'ATA-123');
    await userEvent.click(screen.getAllByRole('button', { name: 'Publicar' })[1]);

    await waitFor(() => {
      expect(mockedApproveComponentDraft).toHaveBeenCalledTimes(1);
    });

    const payload = mockedApproveComponentDraft.mock.calls[0][1];
    expect(mockedApproveComponentDraft).toHaveBeenCalledWith(
      'draft-1',
      expect.objectContaining({
        agreementNumber: 'ATA-123',
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

    await userEvent.click(screen.getByRole('button', { name: 'Exportar PDF' }));
    await userEvent.click(screen.getByRole('button', { name: 'Exportar DOCX' }));

    await waitFor(() => {
      expect(mockedExportComponentPdf).toHaveBeenCalledWith('component-1');
      expect(mockedExportComponentDocx).toHaveBeenCalledWith('component-1');
    });
  });
});
