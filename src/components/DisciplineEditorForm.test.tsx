import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DisciplineEditorForm } from './DisciplineEditorForm';

const baseValues = {
  code: 'IC045',
  name: 'Compiladores',
  department: 'DCC',
  semester: '2026.1',
  academicLevel: 'graduacao' as const,
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
        academicLevelOptions={[
          { value: 'graduacao', label: 'Graduação', sigaaSourceId: '' },
          { value: 'pos_graduacao', label: 'Pós-Graduação', sigaaSourceId: '' },
        ]}
        courseOptions={[{
          key: 'course-1',
          value: 'Bacharelado em Ciência da Computação',
          label: 'Bacharelado em Ciência da Computação',
          aliases: [],
        }]}
        onCancel={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onSaveAndPublish={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const modality = screen.getByRole('combobox', { name: 'Modalidade' });
    expect(modality).toHaveValue('Presencial');
    expect(screen.getByRole('option', { name: 'Disciplina' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Atividade' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Módulo' })).not.toBeInTheDocument();

    await userEvent.selectOptions(modality, 'ATIVIDADE');
    expect(modality).toHaveValue('ATIVIDADE');

    const academicLevel = screen.getByRole('combobox', { name: 'Nível acadêmico' });
    await userEvent.selectOptions(academicLevel, 'pos_graduacao');
    expect(academicLevel).toHaveValue('pos_graduacao');
    expect(screen.queryByRole('option', { name: 'Mestrado' })).not.toBeInTheDocument();
  });

  it('deve oferecer áreas amplas para revisar todo o conteúdo do template', () => {
    render(
      <DisciplineEditorForm
        initialValues={baseValues}
        saving={false}
        onCancel={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onSaveAndPublish={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByLabelText('Ementa')).toHaveClass('min-h-[280px]');
    expect(screen.getByLabelText('Objetivos')).toHaveClass('min-h-[320px]');
    expect(screen.getByLabelText('Conteúdo programático')).toHaveClass('min-h-[480px]');
    expect(screen.getByLabelText('Avaliação da aprendizagem')).toHaveClass('min-h-[360px]');
    expect(screen.queryByText('Pronto para publicar?')).not.toBeInTheDocument();
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
    expect(onSave).not.toHaveBeenCalled();
  });

  it('deve bloquear o salvamento comum e explicar quais campos precisam ser corrigidos', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <DisciplineEditorForm
        initialValues={baseValues}
        saving={false}
        onCancel={vi.fn()}
        onSave={onSave}
        onSaveAndPublish={vi.fn().mockResolvedValue(undefined)}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/Não foi possível salvar enquanto houver campos obrigatórios/i)).toBeInTheDocument();
    expect(screen.getAllByText('Preencha o conteúdo programático para publicação oficial.').length).toBeGreaterThan(0);
  });

  it('impede que a disciplina seja cadastrada como pré-requisito de si mesma', async () => {
    render(
      <DisciplineEditorForm
        initialValues={{ ...baseValues, prerequeriments: 'IC045' }}
        saving={false}
        onCancel={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onSaveAndPublish={vi.fn().mockResolvedValue(undefined)}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getAllByText('Uma disciplina não pode ser pré-requisito de si mesma.').length).toBeGreaterThan(0);
  });

  it('identifica visualmente os campos obrigatórios e valida conteúdo programático antes de publicar', async () => {
    render(
      <DisciplineEditorForm
        initialValues={baseValues}
        saving={false}
        onCancel={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onSaveAndPublish={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByLabelText('Conteúdo programático')).toBeRequired();
    expect(screen.getByLabelText('Referências básicas')).toBeRequired();

    await userEvent.click(screen.getByRole('button', { name: 'Salvar e publicar' }));
    expect(screen.getAllByText('Preencha o conteúdo programático para publicação oficial.').length).toBeGreaterThan(0);
  });

  it('mostra a validação de conteúdo programático durante a edição', async () => {
    render(
      <DisciplineEditorForm
        initialValues={{ ...baseValues, program: 'Unidade I' }}
        saving={false}
        onCancel={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onSaveAndPublish={vi.fn().mockResolvedValue(undefined)}
      />
    );

    await userEvent.clear(screen.getByLabelText('Conteúdo programático'));
    expect(screen.getByText('Preencha o conteúdo programático para publicação oficial.')).toBeInTheDocument();
  });

  it('não deve bloquear publicação por referência complementar incompleta', async () => {
    const onSaveAndPublish = vi.fn().mockResolvedValue(undefined);
    render(
      <DisciplineEditorForm
        initialValues={{
          ...baseValues,
          syllabus: 'Ementa',
          objective: 'Objetivo',
          program: 'Conteúdo',
          methodology: 'Metodologia',
          learningAssessment: 'Avaliação',
          referencesBasic: [
            'AUTOR, A. Livro um. 2020.',
            'AUTOR, B. Livro dois. 2021.',
            'AUTOR, C. Livro três. 2022.',
          ].join('\n'),
          referencesComplementary: 'Referência complementar ainda sem ano',
        }}
        saving={false}
        onCancel={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onSaveAndPublish={onSaveAndPublish}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Salvar e publicar' }));
    expect(onSaveAndPublish).toHaveBeenCalledTimes(1);
  });
});
