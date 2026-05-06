import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DisciplineEditorForm } from './DisciplineEditorForm';

const baseValues = {
  code: 'IC045',
  name: 'Compiladores',
  department: 'DCC',
  semester: '2026.1',
  modality: 'Presencial',
  program: '',
  objective: '',
  syllabus: '',
  methodology: '',
  learningAssessment: '',
  referencesBasic: '',
  referencesComplementary: '',
  prerequeriments: '',
  studentWorkload: {
    theory: 0,
    practice: 0,
    theoryPractice: 0,
    extension: 0,
    internship: 0,
    practiceInternship: 0,
  },
  teacherWorkload: {
    theory: 0,
    practice: 0,
    theoryPractice: 0,
    extension: 0,
    internship: 0,
    practiceInternship: 0,
  },
  moduleWorkload: {
    theory: 0,
    practice: 0,
    theoryPractice: 0,
    extension: 0,
    internship: 0,
    practiceInternship: 0,
  },
};

describe('DisciplineEditorForm publish validation', () => {
  it('deve bloquear publicação quando campos obrigatórios do template estiverem vazios', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onSaveAndPublish = vi.fn().mockResolvedValue(undefined);

    render(
      <DisciplineEditorForm
        initialValues={baseValues}
        saving={false}
        onCancel={vi.fn()}
        onSave={onSave}
        onSaveAndPublish={onSaveAndPublish}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Salvar e publicar' }));

    expect(onSaveAndPublish).not.toHaveBeenCalled();
    expect(screen.getByText('Preencha a ementa para publicação oficial.')).toBeInTheDocument();
    expect(screen.getByText('Preencha os objetivos para publicação oficial.')).toBeInTheDocument();
    expect(screen.getByText('Preencha ao menos as referências básicas para publicação oficial.')).toBeInTheDocument();
  });
});
