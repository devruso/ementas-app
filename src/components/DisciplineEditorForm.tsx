import { useEffect, useState } from 'react';

import { DisciplineFormValues } from '../lib/componentDraft';
import { FormActions } from './FormActions';
import { FormField } from './FormField';
import { TextareaField } from './TextareaField';

interface DisciplineEditorFormProps {
  initialValues: DisciplineFormValues;
  saving: boolean;
  error?: string;
  onCancel: () => void;
  onSave: (values: DisciplineFormValues) => Promise<void>;
  onSaveAndPublish: (values: DisciplineFormValues) => Promise<void>;
  showPublishAction?: boolean;
}

const workloadFields: Array<keyof DisciplineFormValues['studentWorkload']> = [
  'theory',
  'practice',
  'theoryPractice',
  'internship',
  'practiceInternship',
];

const workloadLabels: Record<keyof DisciplineFormValues['studentWorkload'], string> = {
  theory: 'Teoria',
  practice: 'Pratica',
  theoryPractice: 'Teoria/Pratica',
  internship: 'Estagio',
  practiceInternship: 'Pratica/Estagio',
};

export const DisciplineEditorForm = ({
  initialValues,
  saving,
  error,
  onCancel,
  onSave,
  onSaveAndPublish,
  showPublishAction = true,
}: DisciplineEditorFormProps) => {
  const [values, setValues] = useState<DisciplineFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<{ code?: string; name?: string }>({});

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const handleChange = (field: keyof DisciplineFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const handleWorkloadChange = (
    group: 'studentWorkload' | 'teacherWorkload' | 'moduleWorkload',
    field: keyof DisciplineFormValues['studentWorkload'],
    value: number
  ) => {
    setValues((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [field]: Number.isFinite(value) ? value : 0,
      },
    }));
  };

  const validate = () => {
    const nextErrors: { code?: string; name?: string } = {};

    if (!values.code.trim()) {
      nextErrors.code = 'Informe o codigo da disciplina.';
    }

    if (!values.name.trim()) {
      nextErrors.name = 'Informe o nome da disciplina.';
    }

    setFieldErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const submitSave = async () => {
    if (!validate()) {
      return;
    }

    await onSave(values);
  };

  const submitSaveAndPublish = async () => {
    if (!validate()) {
      return;
    }

    await onSaveAndPublish(values);
  };

  const workloadCards: Array<{
    key: 'studentWorkload' | 'teacherWorkload' | 'moduleWorkload';
    title: string;
  }> = [
    { key: 'studentWorkload', title: 'Estudante' },
    { key: 'teacherWorkload', title: 'Professor' },
    { key: 'moduleWorkload', title: 'Modulo' },
  ];

  return (
    <div className="space-y-6">
      <section className="panel p-5 sm:p-6">
        <div className="mb-5">
          <div className="mb-2 inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">
            Dados gerais
          </div>
          <h2 className="text-xl font-semibold text-ink">Identificacao da disciplina</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="Codigo" value={values.code} onChange={(event) => handleChange('code', event.target.value)} error={fieldErrors.code} />
          <div className="md:col-span-2">
            <FormField label="Nome" value={values.name} onChange={(event) => handleChange('name', event.target.value)} error={fieldErrors.name} />
          </div>
          <FormField label="Departamento" value={values.department} onChange={(event) => handleChange('department', event.target.value)} />
          <FormField label="Semestre vigente" value={values.semester} onChange={(event) => handleChange('semester', event.target.value)} />
          <div className="md:col-span-2 xl:col-span-4">
            <TextareaField label="Modalidade" value={values.modality} onChange={(event) => handleChange('modality', event.target.value)} className="min-h-[112px]" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        {workloadCards.map((card) => (
          <div key={card.key} className="panel p-5 sm:p-6">
            <h3 className="mb-4 text-lg font-semibold text-ink">Carga horaria {card.title}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {workloadFields.map((field) => (
                <FormField
                  key={`${card.key}-${field}`}
                  label={workloadLabels[field]}
                  type="number"
                  min={0}
                  value={String(values[card.key][field])}
                  onChange={(event) => handleWorkloadChange(card.key, field, Number(event.target.value))}
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="panel p-5 sm:p-6">
          <div className="space-y-5">
            <TextareaField label="Ementa" value={values.program} onChange={(event) => handleChange('program', event.target.value)} />
            <TextareaField label="Objetivos" value={values.objective} onChange={(event) => handleChange('objective', event.target.value)} />
            <TextareaField label="Conteudo programatico" value={values.syllabus} onChange={(event) => handleChange('syllabus', event.target.value)} />
            <TextareaField label="Metodologia" value={values.methodology} onChange={(event) => handleChange('methodology', event.target.value)} />
          </div>
        </div>
        <div className="panel p-5 sm:p-6">
          <div className="space-y-5">
            <TextareaField label="Avaliacao da aprendizagem" value={values.learningAssessment} onChange={(event) => handleChange('learningAssessment', event.target.value)} />
            <TextareaField label="Bibliografia" value={values.bibliography} onChange={(event) => handleChange('bibliography', event.target.value)} />
            <TextareaField
              label="Pre-requisitos"
              value={values.prerequeriments}
              onChange={(event) => handleChange('prerequeriments', event.target.value)}
              className="min-h-[128px]"
              placeholder="Use o formato curso-codigo, separados por virgula. Ex.: 01-MATA01,02-MATA02"
            />
          </div>
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-danger/20 bg-red-50 px-4 py-3 text-sm text-danger">{error}</div> : null}

      <div className="sticky bottom-0 z-10 -mx-1 rounded-3xl border border-line bg-white/95 p-4 shadow-panel backdrop-blur">
        <FormActions>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-2xl border border-line px-5 py-3 font-semibold text-ink transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={submitSave}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-2xl bg-primary-500 px-5 py-3 font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          {showPublishAction ? (
            <button
              type="button"
              onClick={submitSaveAndPublish}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-2xl bg-secondary-500 px-5 py-3 font-semibold text-secondary-700 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Salvar e publicar
            </button>
          ) : null}
        </FormActions>
      </div>
    </div>
  );
};