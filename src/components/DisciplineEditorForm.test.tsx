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
  it('deve usar opções acadêmicas para modalidade sem descartar valores legados', async () => {
    render(
      <DisciplineEditorForm
        initialValues={{ ...baseValues, modality: 'Presencial' }}
        saving={false}
        modalityOptions={[
          { value: 'DISCIPLINA', label: 'Disciplina' },
          { value: 'ATIVIDADE', label: 'Atividade' },
          { value: 'MODULO', label: 'Módulo' },
        ]}
        onCancel={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onSaveAndPublish={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const modality = screen.getByRole('combobox', { name: 'Modalidade' });
    expect(modality).toHaveValue('Presencial');
    expect(screen.getByRole('option', { name: 'Disciplina' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Atividade' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Módulo' })).toBeInTheDocument();

    await userEvent.selectOptions(modality, 'ATIVIDADE');
    expect(modality).toHaveValue('ATIVIDADE');
  });

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
    expect(screen.getAllByText('Preencha a ementa para publicação oficial.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Preencha os objetivos para publicação oficial.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Preencha ao menos as referências básicas para publicação oficial.').length).toBeGreaterThan(0);
  });
});
