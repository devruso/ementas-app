import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { previewDraftImport } from '../lib/api';
import { AppError } from '../lib/errors';
import type { ImportDraftPreviewResponse } from '../types';
import { DocumentImportCard } from './DocumentImportCard';

vi.mock('../lib/api', () => ({
  previewDraftImport: vi.fn(),
}));

const mockedPreviewDraftImport = vi.mocked(previewDraftImport);

const previewFixture: ImportDraftPreviewResponse = {
  fileName: 'ic045.docx',
  mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  suggestedDraft: {
    code: 'IC045',
    name: 'Compiladores',
    department: 'Departamento de Ciência da Computação',
    modality: 'Presencial',
    program: 'Ementa resumida',
    semester: '2026.1',
    prerequeriments: 'MATA50',
    methodology: 'Aulas expositivas',
    objective: 'Compreender técnicas de compiladores',
    syllabus: 'Análise léxica, sintática e semântica',
    learningAssessment: 'Provas e projeto',
    bibliography: 'Livro A; Livro B',
    workload: {
      studentTheory: 68,
      studentPractice: 34,
      studentTheoryPractice: 0,
      studentInternship: 0,
      studentPracticeInternship: 0,
      teacherTheory: 68,
      teacherPractice: 34,
      teacherTheoryPractice: 0,
      teacherInternship: 0,
      teacherPracticeInternship: 0,
      moduleTheory: 68,
      modulePractice: 34,
      moduleTheoryPractice: 0,
      moduleInternship: 0,
      modulePracticeInternship: 0,
    },
  },
  warnings: ['Semestralidade não encontrada no bloco final'],
  unrecognizedSections: [],
  extractedSections: {
    ementa: 'Ementa resumida',
  },
  rawText: 'Texto bruto',
};

describe('DocumentImportCard', () => {
  it('deve processar arquivo e aplicar prévia no formulário', async () => {
    mockedPreviewDraftImport.mockResolvedValueOnce(previewFixture);
    const onApplyPreview = vi.fn();

    const { container } = render(<DocumentImportCard onApplyPreview={onApplyPreview} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(fileInput, {
      target: {
        files: [new File(['conteudo'], 'ic045.docx', { type: previewFixture.mimeType })],
      },
    });

    await screen.findByText('Aplicar prévia ao formulário');
    expect(screen.getByText('IC045')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Aplicar prévia ao formulário' }));

    await waitFor(() => expect(onApplyPreview).toHaveBeenCalledTimes(1));
    expect(onApplyPreview.mock.calls[0][0].code).toBe('IC045');
    expect(onApplyPreview.mock.calls[0][0].name).toBe('Compiladores');
    expect(screen.queryByText(/plano IC045/i)).not.toBeInTheDocument();
  });

  it('deve exibir erro quando preview falhar', async () => {
    mockedPreviewDraftImport.mockRejectedValueOnce(new AppError('Formato inválido.', 400));

    const { container } = render(<DocumentImportCard onApplyPreview={vi.fn()} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(fileInput, {
      target: {
        files: [new File(['conteudo'], 'arquivo.txt', { type: 'text/plain' })],
      },
    });

    expect(await screen.findByText('Formato inválido.')).toBeInTheDocument();
  });
});
