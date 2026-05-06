import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  createComponentDraft,
  getComponentDrafts,
  getComponents,
  importComponentsFromSiac,
  importComponentsFromSigaaPublic,
} from '../lib/api';
import { DisciplineCreatePage } from './DisciplineCreatePage';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api');

  return {
    ...actual,
    createComponentDraft: vi.fn(),
    getComponents: vi.fn(),
    getComponentDrafts: vi.fn(),
    importComponentsFromSiac: vi.fn(),
    importComponentsFromSigaaPublic: vi.fn(),
  };
});

const mockedCreateComponentDraft = vi.mocked(createComponentDraft);
const mockedGetComponents = vi.mocked(getComponents);
const mockedGetComponentDrafts = vi.mocked(getComponentDrafts);
const mockedImportComponentsFromSiac = vi.mocked(importComponentsFromSiac);
const mockedImportComponentsFromSigaaPublic = vi.mocked(importComponentsFromSigaaPublic);

describe('DisciplineCreatePage', () => {
  it('deve criar disciplina e navegar para edição do rascunho', async () => {
    mockedGetComponents.mockResolvedValueOnce({
      total: 0,
      results: [],
    });
    mockedGetComponentDrafts.mockResolvedValueOnce({
      total: 0,
      results: [],
    });

    mockedCreateComponentDraft.mockResolvedValueOnce({
      id: 'draft-1',
      code: 'IC045',
      name: 'Compiladores',
    });

    render(<DisciplineCreatePage />);

    await userEvent.type(screen.getByLabelText('Codigo'), 'IC045');
    await userEvent.type(screen.getByLabelText('Nome'), 'Compiladores');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(mockedCreateComponentDraft).toHaveBeenCalledTimes(1);
    });

    expect(mockedCreateComponentDraft.mock.calls[0][0]).toMatchObject({
      code: 'IC045',
      name: 'Compiladores',
    });

    expect(navigateMock).toHaveBeenCalledWith('/disciplinas/ic045/editar', { replace: true });
  });

  it('deve importar SIAC e SIGAA e exibir resumo operacional na interface', async () => {
    mockedGetComponents.mockResolvedValueOnce({
      total: 0,
      results: [],
    });
    mockedGetComponentDrafts.mockResolvedValueOnce({
      total: 0,
      results: [],
    });

    mockedImportComponentsFromSiac.mockResolvedValueOnce({
      source: 'siac',
      requested: 10,
      created: 7,
      skippedExisting: 2,
      failed: 1,
      failures: ['MATA01: Unexpected error.'],
      failureCategories: { unexpected_error: 1 },
    });

    mockedImportComponentsFromSigaaPublic.mockResolvedValueOnce({
      source: 'sigaa-public',
      requested: 6,
      created: 4,
      skippedExisting: 1,
      failed: 1,
      failures: ['SIGAA_SOURCE timeout'],
      failureCategories: { source_timeout: 1 },
    });

    render(<DisciplineCreatePage />);

    await userEvent.type(screen.getByLabelText('Código do curso'), '112140');
    await userEvent.type(screen.getByPlaceholderText('Ex: 20261'), '20261');
    await userEvent.click(screen.getByRole('button', { name: 'Importar do SIAC' }));

    await waitFor(() => {
      expect(mockedImportComponentsFromSiac).toHaveBeenCalledWith(112140, 20261);
    });

    expect(await screen.findByText('Resumo da importacao SIAC')).toBeInTheDocument();
    expect(screen.getByText(/unexpected_error \(1\)/i)).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Tipo de fonte'), 'program');
    await userEvent.type(screen.getByLabelText('ID da fonte'), '1820');
    await userEvent.selectOptions(screen.getByLabelText('Nível acadêmico'), 'mestrado');
    await userEvent.click(screen.getByRole('button', { name: 'Importar do SIGAA público' }));

    await waitFor(() => {
      expect(mockedImportComponentsFromSigaaPublic).toHaveBeenCalledWith('program', '1820', 'mestrado', undefined);
    });

    expect(await screen.findByText('Resumo da importacao SIGAA público')).toBeInTheDocument();
    expect(screen.getByText(/source_timeout \(1\)/i)).toBeInTheDocument();
  });
});
