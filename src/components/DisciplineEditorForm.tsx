import { useEffect, useState } from 'react';
import { focusDisciplineField } from '../lib/pendingFields';

import {
  buildReferenceChecklist,
  DisciplineFormValues,
  DisciplineFormField,
  DisciplineValidationErrors,
  validateDisciplinePublication,
  validateDisciplineSave,
} from '../lib/componentDraft';
import type { AcademicLevel, AcademicLevelOption, CourseCatalogOption, DomainOption } from '../types';
import { FormActions } from './FormActions';
import { FormField } from './FormField';
import { SelectField } from './SelectField';
import { TextareaField } from './TextareaField';

interface DisciplineEditorFormProps {
  initialValues: DisciplineFormValues;
  saving: boolean;
  error?: string;
  onCancel: () => void;
  onSave: (values: DisciplineFormValues) => Promise<void>;
  onSaveAndPublish: (values: DisciplineFormValues) => Promise<void>;
  onValuesChange?: (values: DisciplineFormValues) => void;
  showPublishAction?: boolean;
  modalityOptions?: DomainOption[];
  academicLevelOptions?: AcademicLevelOption[];
  courseOptions?: CourseCatalogOption[];
}

const workloadFields: Array<keyof DisciplineFormValues['studentWorkload']> = [
  'theory',
  'practice',
  'theoryPractice',
  'extension',
  'internship',
  'practiceInternship',
];

const workloadLabels: Record<keyof DisciplineFormValues['studentWorkload'], string> = {
  theory: 'Teoria',
  practice: 'Prática',
  theoryPractice: 'Teoria/Prática',
  extension: 'Extensão',
  internship: 'Estágio',
  practiceInternship: 'Prática/Estágio',
};

const fallbackAcademicLevelOptions: AcademicLevelOption[] = [
  { value: 'graduacao', label: 'Graduação', sigaaSourceId: '' },
  { value: 'pos_graduacao', label: 'Pós-Graduação', sigaaSourceId: '' },
];

export const DisciplineEditorForm = ({
  initialValues,
  saving,
  error,
  onCancel,
  onSave,
  onSaveAndPublish,
  onValuesChange,
  showPublishAction = true,
  modalityOptions = [],
  academicLevelOptions = [],
  courseOptions = [],
}: DisciplineEditorFormProps) => {
  const [values, setValues] = useState<DisciplineFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<DisciplineValidationErrors>({});

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  useEffect(() => {
    onValuesChange?.(values);
  }, [onValuesChange, values]);

  const handleChange = (field: keyof DisciplineFormValues, value: string) => {
    const updateValue = (nextValue: string) => {
      const nextValues = { ...values, [field]: nextValue };
      const saveErrors = validateDisciplineSave(nextValues);
      const publicationErrors = validateDisciplinePublication(nextValues);

      setValues(nextValues);
      setFieldErrors((currentErrors) => {
        const validationField = field as DisciplineFormField;
        const { [validationField]: _resolvedError, ...remainingErrors } = currentErrors;
        const nextError = publicationErrors[validationField]
          || saveErrors[validationField];

        return nextError ? { ...remainingErrors, [field]: nextError } : remainingErrors;
      });
    };

    if (field === 'code') {
      const normalizedCode = value.replace(/\s+/g, '').toUpperCase();
      updateValue(normalizedCode);
      return;
    }

    if (field === 'academicLevel') {
      setValues((current) => ({ ...current, academicLevel: value as AcademicLevel }));
      return;
    }

    updateValue(value);
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

  const resolvedAcademicLevelOptions = academicLevelOptions.length > 0
    ? academicLevelOptions
    : fallbackAcademicLevelOptions;

  const complementaryReferencesChecklist = buildReferenceChecklist(values.referencesComplementary);


  const validate = (forPublication = false) => {
    const nextErrors = forPublication
      ? validateDisciplinePublication(values)
      : validateDisciplineSave(values);
    setFieldErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const submitSave = async () => {
    if (!validate(true)) {
      return;
    }

    await onSave(values);
  };

  const submitSaveAndPublish = async () => {
    if (!validate(true)) {
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
    { key: 'moduleWorkload', title: 'Módulo' },
  ];

  return (
    <div className="space-y-6 motion-fade">
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" aria-label="Voltar pelo topo" onClick={onCancel} disabled={saving} className="rounded-2xl border border-line px-5 py-3 font-semibold text-ink transition hover:bg-slate-50 disabled:opacity-60">
          Voltar
        </button>
        <button type="button" aria-label="Salvar pelo topo" onClick={submitSave} disabled={saving} className="rounded-2xl bg-primary-500 px-5 py-3 font-semibold text-white transition hover:bg-primary-600 disabled:opacity-60">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
        {showPublishAction ? (
          <button type="button" aria-label="Salvar e publicar pelo topo" onClick={submitSaveAndPublish} disabled={saving} className="rounded-2xl bg-secondary-500 px-5 py-3 font-semibold text-secondary-700 transition hover:brightness-95 disabled:opacity-60">
            Salvar e publicar
          </button>
        ) : null}
      </div>
      <section className="panel interactive-lift min-w-0 p-5 sm:p-6">
        <div className="mb-5">
          <div className="mb-2 inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">
            Dados gerais
          </div>
          <h2 className="text-xl font-semibold text-ink">Identificação da disciplina</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField id="discipline-code" label="Código" required value={values.code} onChange={(event) => handleChange('code', event.target.value)} error={fieldErrors.code} />
          <div className="md:col-span-2">
            <FormField id="discipline-name" label="Nome" required value={values.name} onChange={(event) => handleChange('name', event.target.value)} error={fieldErrors.name} />
          </div>
          <SelectField id="discipline-department" label="Curso" required value={values.department} error={fieldErrors.department} onChange={(event) => handleChange('department', event.target.value)}>
            <option value="">Selecione um curso</option>
            {values.department && !courseOptions.some((option) => option.value === values.department) ? (
              <option value={values.department}>{values.department}</option>
            ) : null}
            {courseOptions.map((option) => (
              <option key={option.key} value={option.value}>{option.label}</option>
            ))}
          </SelectField>
          <FormField id="discipline-semester" label="Semestre vigente" required value={values.semester} onChange={(event) => handleChange('semester', event.target.value)} error={fieldErrors.semester} />
          <SelectField id="discipline-academicLevel"
            label="Nível acadêmico"
            value={values.academicLevel}
            onChange={(event) => handleChange('academicLevel', event.target.value)}
          >
            {resolvedAcademicLevelOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </SelectField>
          <div className="md:col-span-2">
            <SelectField id="discipline-modality" label="Modalidade" required value={values.modality} error={fieldErrors.modality} onChange={(event) => handleChange('modality', event.target.value)}>
              {!modalityOptions.some((option) => option.value === values.modality) && values.modality && values.modality !== 'MODULO' ? (
                <option value={values.modality}>{values.modality}</option>
              ) : null}
              {modalityOptions.filter((option) => option.value !== 'MODULO').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectField>
          </div>
        </div>
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-3">
        {workloadCards.map((card) => (
          <div key={card.key} className="panel interactive-lift min-w-0 p-5 sm:p-6">
            <h3 className="mb-4 text-base font-semibold leading-tight text-ink xl:whitespace-nowrap">Carga horária {card.title}</h3>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
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

      <section className="grid min-w-0 gap-6">
        <div className="panel interactive-lift min-w-0 p-5 sm:p-6">
          <div className="space-y-5">
            <TextareaField id="discipline-syllabus" className="min-h-[280px]" label="Ementa" required value={values.syllabus} onChange={(event) => handleChange('syllabus', event.target.value)} error={fieldErrors.syllabus} />
            <TextareaField id="discipline-objective"
              label="Objetivos"
              required
              value={values.objective}
              onChange={(event) => handleChange('objective', event.target.value)}
              error={fieldErrors.objective}
              className="min-h-[320px]"
              placeholder="Use um objetivo por linha para facilitar a organização dos parágrafos no documento oficial."
            />
            <TextareaField id="discipline-program" className="min-h-[480px]" label="Conteúdo programático" required value={values.program} onChange={(event) => handleChange('program', event.target.value)} error={fieldErrors.program} />
            <TextareaField id="discipline-methodology" className="min-h-[360px]" label="Metodologia" required value={values.methodology} onChange={(event) => handleChange('methodology', event.target.value)} error={fieldErrors.methodology} />
          </div>
        </div>
        <div className="panel interactive-lift min-w-0 p-5 sm:p-6">
          <div className="space-y-5">
            <TextareaField id="discipline-learningAssessment" className="min-h-[360px]" label="Avaliação da aprendizagem" required value={values.learningAssessment} onChange={(event) => handleChange('learningAssessment', event.target.value)} error={fieldErrors.learningAssessment} />
            <TextareaField id="discipline-referencesBasic"
              label="Referências básicas"
              required
              value={values.referencesBasic}
              onChange={(event) => handleChange('referencesBasic', event.target.value)}
              error={fieldErrors.referencesBasic}
              className="min-h-[320px]"
              placeholder="Liste autores, títulos e dados editoriais essenciais."
            />
            <TextareaField id="discipline-referencesComplementary"
              label="Referências complementares"
              value={values.referencesComplementary}
              onChange={(event) => handleChange('referencesComplementary', event.target.value)}
              error={fieldErrors.referencesComplementary}
              className="min-h-[320px]"
              placeholder="Liste materiais adicionais recomendados."
            />
            {complementaryReferencesChecklist.some((item) => item.status === 'warning') ? (
              <p className="text-xs leading-5 text-muted">
                Referências complementares são opcionais e não impedem a publicação; revise os dados para melhorar o documento oficial.
              </p>
            ) : null}
            <TextareaField id="discipline-prerequeriments"
              label="Pré-requisitos"
              value={values.prerequeriments}
              onChange={(event) => handleChange('prerequeriments', event.target.value)}
              error={fieldErrors.prerequeriments}
              className="min-h-[128px]"
              placeholder="Use códigos de disciplinas separados por vírgula, ou NAO_SE_APLICA"
            />


          </div>
        </div>
      </section>

      {Object.keys(fieldErrors).length > 0 ? (
        <div className="rounded-2xl border border-danger/20 bg-red-50 px-4 py-3 text-sm text-danger" role="alert">
          Não foi possível salvar enquanto houver campos obrigatórios ou pré-requisitos inválidos. Revise os campos destacados.
          <button type="button" className="ml-2 font-semibold underline" onClick={() => focusDisciplineField(Object.keys(fieldErrors)[0])}>Visualizar campos pendentes</button>
        </div>
      ) : null}
      {error ? <div className="rounded-2xl border border-danger/20 bg-red-50 px-4 py-3 text-sm text-danger">{error}</div> : null}

      <div className="sticky bottom-2 z-10 rounded-3xl border border-line bg-white/95 p-4 shadow-panel backdrop-blur sm:-mx-1">
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
