import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getComponentDraftByCode,
  getComponentDrafts,
  getComponents,
  updateComponentDraft,
} from '../lib/api';
import { DisciplineEditPage } from './DisciplineEditPage';

const navigateMock = vi.fn();

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
    getComponentDraftByCode: vi.fn(),
    getComponents: vi.fn(),
    getComponentDrafts: vi.fn(),
    updateComponentDraft: vi.fn(),
    approveComponentDraft: vi.fn(),
  };
});

const mockedGetComponentDraftByCode = vi.mocked(getComponentDraftByCode);
const mockedGetComponents = vi.mocked(getComponents);
const mockedGetComponentDrafts = vi.mocked(getComponentDrafts);
const mockedUpdateComponentDraft = vi.mocked(updateComponentDraft);

describe('DisciplineEditPage autosave', () => {
  beforeEach(() => {
    mockedGetComponentDraftByCode.mockResolvedValue({
      id: 'draft-1',
      code: 'IC045',
      name: 'Compiladores',
      department: 'DCC',
      semester: '2026.1',
      modality: 'Presencial',
      program: 'Programa inicial',
      objective: 'Objetivo inicial',
      syllabus: 'Ementa inicial',
      methodology: 'Metodologia inicial',
      learningAssessment: 'Avaliacao inicial',
      bibliography: 'Bibliografia inicial',
      referencesBasic: 'SILVA, 2020.',
      referencesComplementary: 'SOUZA, 2018.',
      prerequeriments: 'MATA50',
      workload: {
        studentTheory: 0,
        studentPractice: 0,
        studentTheoryPractice: 0,
        studentPracticeInternship: 0,
        studentExtension: 0,
        studentInternship: 0,
        teacherTheory: 0,
        teacherPractice: 0,
        teacherTheoryPractice: 0,
        teacherPracticeInternship: 0,
        teacherExtension: 0,
        teacherInternship: 0,
        moduleTheory: 0,
        modulePractice: 0,
        moduleTheoryPractice: 0,
        modulePracticeInternship: 0,
        moduleExtension: 0,
        moduleInternship: 0,
      },
    });

    mockedGetComponents.mockResolvedValue({
      total: 1,
      results: [
        {
          id: 'component-1',
          code: 'IC045',
          name: 'Compiladores',
          userId: 'u1',
          logs: [{ id: 'log-1', type: 'approval', createdAt: new Date().toISOString() }],
        } as never,
      ],
    });

    mockedGetComponentDrafts.mockResolvedValue({
      total: 1,
      results: [{ id: 'draft-1', code: 'IC045', name: 'Compiladores' } as never],
    });

    mockedUpdateComponentDraft.mockImplementation(async (_id, payload) => ({
      id: 'draft-1',
      code: 'IC045',
      name: String(payload.name || 'Compiladores'),
      department: String(payload.department || 'DCC'),
      semester: String(payload.semester || '2026.1'),
      modality: String(payload.modality || 'Presencial'),
      program: String(payload.program || ''),
      objective: String(payload.objective || ''),
      syllabus: String(payload.syllabus || ''),
      methodology: String(payload.methodology || ''),
      learningAssessment: String(payload.learningAssessment || ''),
      bibliography: String(payload.bibliography || ''),
      referencesBasic: String(payload.referencesBasic || ''),
      referencesComplementary: String(payload.referencesComplementary || ''),
      prerequeriments: String(payload.prerequeriments || ''),
      workload: payload.workload,
    } as never));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('deve salvar automaticamente alterações de formulário no backend', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DisciplineEditPage />
      </MemoryRouter>
    );

    const methodologyInput = await screen.findByLabelText('Metodologia');
    await user.clear(methodologyInput);
    await user.type(methodologyInput, 'Metodologia atualizada por autosave');

    await waitFor(() => {
      expect(mockedUpdateComponentDraft).toHaveBeenCalled();
    }, { timeout: 4000 });

    expect(await screen.findByText('Rascunho sincronizado automaticamente.')).toBeInTheDocument();
  });
});
