import { useEffect, useState } from 'react';
import { focusDisciplineField } from '../lib/pendingFields';

import {
  buildReferenceChecklist,
  DisciplineFormValues,
  hasNonWebReferenceWithoutYear,
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

const componentCodeRegex = /^[A-Z]{2,4}[0-9]{2,4}$/;
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
  const [fieldErrors, setFieldErrors] = useState<{
    code?: string;
    name?: string;
    department?: string;
    modality?: string;
    syllabus?: string;
    objective?: string;
    program?: string;
    methodology?: string;
    learningAssessment?: string;
    referencesBasic?: string;
    referencesComplementary?: string;
  }>({});

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  useEffect(() => {
    onValuesChange?.(values);
  }, [onValuesChange, values]);

  const handleChange = (field: keyof DisciplineFormValues, value: string) => {
    if (field === 'code') {
      const normalizedCode = value.replace(/\s+/g, '').toUpperCase();
      setValues((current) => ({ ...current, code: normalizedCode }));
      return;
    }

    if (field === 'academicLevel') {
      setValues((current) => ({ ...current, academicLevel: value as AcademicLevel }));
      return;
    }

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

  const resolvedAcademicLevelOptions = academicLevelOptions.length > 0
    ? academicLevelOptions
    : fallbackAcademicLevelOptions;

  const complementaryReferencesChecklist = buildReferenceChecklist(values.referencesComplementary);


  const validate = () => {
    const nextErrors: {
      code?: string;
      name?: string;
      department?: string;
      modality?: string;
      syllabus?: string;
      objective?: string;
      program?: string;
      methodology?: string;
      learningAssessment?: string;
      referencesBasic?: string;
      referencesComplementary?: string;
    } = {};

    if (!values.code.trim()) {
      nextErrors.code = 'Informe o código da disciplina.';
    } else if (!componentCodeRegex.test(values.code.trim())) {
      nextErrors.code = 'Código inválido. Use o formato AAA999 ou AAAA9999 (ex.: MAT245 ou IC045).';
    }

    if (!values.name.trim()) {
      nextErrors.name = 'Informe o nome da disciplina.';
    }

    if (!values.department.trim()) {
      nextErrors.department = 'Selecione o curso da disciplina.';
    }

    if (!values.modality.trim()) {
      nextErrors.modality = 'Selecione a modalidade da disciplina.';
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

    const publishErrors: typeof fieldErrors = {};

    if (!values.syllabus.trim()) {
      publishErrors.syllabus = 'Preencha a ementa para publicação oficial.';
    }
    if (!values.objective.trim()) {
      publishErrors.objective = 'Preencha os objetivos para publicação oficial.';
    }
    if (!values.program.trim()) {
      publishErrors.program = 'Preencha o conteúdo programático para publicação oficial.';
    }
    if (!values.methodology.trim()) {
      publishErrors.methodology = 'Preencha a metodologia para publicação oficial.';
    }
    if (!values.learningAssessment.trim()) {
      publishErrors.learningAssessment = 'Preencha a avaliação da aprendizagem para publicação oficial.';
    }
    if (!values.referencesBasic.trim()) {
      publishErrors.referencesBasic = 'Preencha ao menos as referências básicas para publicação oficial.';
    } else if (hasNonWebReferenceWithoutYear(values.referencesBasic)) {
      publishErrors.referencesBasic = 'As referências básicas não web devem incluir ano (ABNT).';
    }

    if (Object.keys(publishErrors).length > 0) {
      setFieldErrors((current) => ({ ...current, ...publishErrors }));
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
      <section className="panel interactive-lift min-w-0 p-5 sm:p-6">
        <div className="mb-5">
          <div className="mb-2 inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">
            Dados gerais
          </div>
          <h2 className="text-xl font-semibold text-ink">Identificação da disciplina</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField id="discipline-code" label="Código" value={values.code} onChange={(event) => handleChange('code', event.target.value)} error={fieldErrors.code} />
          <div className="md:col-span-2">
            <FormField id="discipline-name" label="Nome" value={values.name} onChange={(event) => handleChange('name', event.target.value)} error={fieldErrors.name} />
          </div>
          <SelectField id="discipline-department" label="Curso" value={values.department} error={fieldErrors.department} onChange={(event) => handleChange('department', event.target.value)}>
            <option value="">Selecione um curso</option>
            {values.department && !courseOptions.some((option) => option.value === values.department) ? (
              <option value={values.department}>{values.department}</option>
            ) : null}
            {courseOptions.map((option) => (
              <option key={option.key} value={option.value}>{option.label}</option>
            ))}
          </SelectField>
          <FormField id="discipline-semester" label="Semestre vigente" value={values.semester} onChange={(event) => handleChange('semester', event.target.value)} />
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
            <SelectField id="discipline-modality" label="Modalidade" value={values.modality} error={fieldErrors.modality} onChange={(event) => handleChange('modality', event.target.value)}>
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

      <section className="grid min-w-0 gap-6">
        <div className="panel interactive-lift min-w-0 p-5 sm:p-6">
          <div className="space-y-5">
            <TextareaField id="discipline-syllabus" className="min-h-[280px]" label="Ementa" value={values.syllabus} onChange={(event) => handleChange('syllabus', event.target.value)} error={fieldErrors.syllabus} />
            <TextareaField id="discipline-objective"
              label="Objetivos"
              value={values.objective}
              onChange={(event) => handleChange('objective', event.target.value)}
              error={fieldErrors.objective}
              className="min-h-[320px]"
              placeholder="Use um objetivo por linha para facilitar a organização dos parágrafos no documento oficial."
            />
            <TextareaField id="discipline-program" className="min-h-[480px]" label="Conteúdo programático" value={values.program} onChange={(event) => handleChange('program', event.target.value)} error={fieldErrors.program} />
            <TextareaField id="discipline-methodology" className="min-h-[360px]" label="Metodologia" value={values.methodology} onChange={(event) => handleChange('methodology', event.target.value)} error={fieldErrors.methodology} />
          </div>
        </div>
        <div className="panel interactive-lift min-w-0 p-5 sm:p-6">
          <div className="space-y-5">
            <TextareaField id="discipline-learningAssessment" className="min-h-[360px]" label="Avaliação da aprendizagem" value={values.learningAssessment} onChange={(event) => handleChange('learningAssessment', event.target.value)} error={fieldErrors.learningAssessment} />
            <TextareaField id="discipline-referencesBasic"
              label="Referências básicas"
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
              className="min-h-[128px]"
              placeholder="Use códigos de disciplinas separados por vírgula, ou NAO_SE_APLICA"
            />


          </div>
        </div>
      </section>

      {Object.keys(fieldErrors).length > 0 ? (
        <button type="button" className="font-semibold text-primary-700 underline" onClick={() => focusDisciplineField(Object.keys(fieldErrors)[0])}>Visualizar campos pendentes</button>
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
