import { useEffect, useState } from 'react';

import {
  buildReferenceChecklist,
  DisciplineFormValues,
  hasNonWebReferenceWithoutYear,
} from '../lib/componentDraft';
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
  onValuesChange?: (values: DisciplineFormValues) => void;
  showPublishAction?: boolean;
  availablePrerequisites?: Array<{ code: string; name: string }>;
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
  practice: 'Pratica',
  theoryPractice: 'Teoria/Pratica',
  extension: 'Extensao',
  internship: 'Estagio',
  practiceInternship: 'Pratica/Estagio',
};

const componentCodeRegex = /^[A-Z]{2,4}[0-9]{2,4}$/;
const prerequerimentCodeRegex = /\b[A-Z]{2,4}[0-9]{2,4}\b/g;
const notApplicableToken = 'NAO_SE_APLICA';

export const DisciplineEditorForm = ({
  initialValues,
  saving,
  error,
  onCancel,
  onSave,
  onSaveAndPublish,
  onValuesChange,
  showPublishAction = true,
  availablePrerequisites = [],
}: DisciplineEditorFormProps) => {
  const [values, setValues] = useState<DisciplineFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<{
    code?: string;
    name?: string;
    syllabus?: string;
    objective?: string;
    program?: string;
    methodology?: string;
    learningAssessment?: string;
    referencesBasic?: string;
    referencesComplementary?: string;
  }>({});
  const [prereqSearch, setPrereqSearch] = useState('');
  const [pendingCodeInput, setPendingCodeInput] = useState('');

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

  const extractPrerequerimentCodes = (value: string) =>
    Array.from(new Set(value.toUpperCase().match(prerequerimentCodeRegex) ?? []));

  const selectedPrerequeriments = extractPrerequerimentCodes(values.prerequeriments);
  const isNotApplicable = values.prerequeriments.trim().toUpperCase() === notApplicableToken;
  const availableCodes = new Set(availablePrerequisites.map((item) => item.code.toUpperCase()));

  const selectedPrerequerimentBadges = selectedPrerequeriments.map((code) => ({
    code,
    status: availableCodes.has(code) ? 'existing' : 'pending',
  }));

  const suggestedPrerequeriments = availablePrerequisites
    .filter((option) => {
      if (option.code === values.code) {
        return false;
      }

      if (selectedPrerequeriments.includes(option.code)) {
        return false;
      }

      if (!prereqSearch.trim()) {
        return true;
      }

      const query = prereqSearch.trim().toLowerCase();
      return option.code.toLowerCase().includes(query) || option.name.toLowerCase().includes(query);
    })
    .slice(0, 8);

  const basicReferencesChecklist = buildReferenceChecklist(values.referencesBasic);
  const complementaryReferencesChecklist = buildReferenceChecklist(values.referencesComplementary);

  const handleAddPrerequeriment = (code: string) => {
    const nextCodes = Array.from(new Set([...selectedPrerequeriments, code]));

    setValues((current) => ({
      ...current,
      prerequeriments: nextCodes.join(', '),
    }));

    setPrereqSearch('');
  };

  const handleAddPendingCode = () => {
    const normalizedCode = pendingCodeInput.replace(/\s+/g, '').toUpperCase();

    if (!normalizedCode) {
      return;
    }

    if (!componentCodeRegex.test(normalizedCode)) {
      return;
    }

    if (normalizedCode === values.code) {
      return;
    }

    handleAddPrerequeriment(normalizedCode);
    setPendingCodeInput('');
  };

  const handleRemovePrerequeriment = (code: string) => {
    const nextCodes = selectedPrerequeriments.filter((item) => item !== code);

    setValues((current) => ({
      ...current,
      prerequeriments: nextCodes.join(', '),
    }));
  };

  const handleSetNotApplicable = () => {
    setValues((current) => ({
      ...current,
      prerequeriments: notApplicableToken,
    }));

    setPrereqSearch('');
    setPendingCodeInput('');
  };

  const handleUnsetNotApplicable = () => {
    setValues((current) => ({
      ...current,
      prerequeriments: '',
    }));
  };

  const validate = () => {
    const nextErrors: {
      code?: string;
      name?: string;
      syllabus?: string;
      objective?: string;
      program?: string;
      methodology?: string;
      learningAssessment?: string;
      referencesBasic?: string;
      referencesComplementary?: string;
    } = {};

    if (!values.code.trim()) {
      nextErrors.code = 'Informe o codigo da disciplina.';
    } else if (!componentCodeRegex.test(values.code.trim())) {
      nextErrors.code = 'Código inválido. Use o formato AAA999 ou AAAA9999 (ex.: MAT245 ou IC045).';
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
    } else if (values.referencesComplementary.trim() && hasNonWebReferenceWithoutYear(values.referencesComplementary)) {
      publishErrors.referencesComplementary = 'As referências complementares não web devem incluir ano (ABNT).';
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
    { key: 'moduleWorkload', title: 'Modulo' },
  ];

  return (
    <div className="space-y-6 motion-fade">
      <section className="panel interactive-lift min-w-0 p-5 sm:p-6">
        <div className="mb-4 rounded-2xl border border-primary-100 bg-primary-50/70 px-4 py-3 text-sm text-primary-900">
          Este editor segue o template oficial do Word. Para publicação, preencha: Ementa, Objetivos, Conteúdo programático,
          Metodologia, Avaliação da aprendizagem e Referências básicas.
        </div>
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

      <section className="grid min-w-0 gap-6 xl:grid-cols-3">
        {workloadCards.map((card) => (
          <div key={card.key} className="panel interactive-lift min-w-0 p-5 sm:p-6">
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

      <section className="grid min-w-0 gap-6 xl:grid-cols-2">
        <div className="panel interactive-lift min-w-0 p-5 sm:p-6">
          <div className="space-y-5">
            <TextareaField label="Ementa" value={values.syllabus} onChange={(event) => handleChange('syllabus', event.target.value)} error={fieldErrors.syllabus} />
            <TextareaField
              label="Objetivos"
              value={values.objective}
              onChange={(event) => handleChange('objective', event.target.value)}
              error={fieldErrors.objective}
              placeholder="Use um objetivo por linha para facilitar a organização dos parágrafos no documento oficial."
            />
            <TextareaField label="Conteudo programatico" value={values.program} onChange={(event) => handleChange('program', event.target.value)} error={fieldErrors.program} />
            <TextareaField label="Metodologia" value={values.methodology} onChange={(event) => handleChange('methodology', event.target.value)} error={fieldErrors.methodology} />
          </div>
        </div>
        <div className="panel interactive-lift min-w-0 p-5 sm:p-6">
          <div className="space-y-5">
            <TextareaField label="Avaliacao da aprendizagem" value={values.learningAssessment} onChange={(event) => handleChange('learningAssessment', event.target.value)} error={fieldErrors.learningAssessment} />
            <TextareaField
              label="Referencias basicas"
              value={values.referencesBasic}
              onChange={(event) => handleChange('referencesBasic', event.target.value)}
              error={fieldErrors.referencesBasic}
              placeholder="Liste autores, títulos e dados editoriais essenciais."
            />
            {basicReferencesChecklist.length > 0 ? (
              <div className="rounded-2xl border border-line bg-background px-4 py-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink/70">Checklist ABNT - Referencias basicas</div>
                <div className="space-y-2 text-xs text-ink/80">
                  {basicReferencesChecklist.map((item) => (
                    <div key={`basic-reference-${item.lineNumber}`} className="rounded-xl border border-line/70 bg-white px-3 py-2">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-semibold">Linha {item.lineNumber}</span>
                        <span className={item.status === 'ok' ? 'rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700' : 'rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700'}>
                          {item.status === 'ok' ? 'OK' : 'Ajustar'}
                        </span>
                      </div>
                      <div className="mb-1 text-ink/90">{item.message}</div>
                      <div className="truncate text-ink/70">{item.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <TextareaField
              label="Referencias complementares"
              value={values.referencesComplementary}
              onChange={(event) => handleChange('referencesComplementary', event.target.value)}
              error={fieldErrors.referencesComplementary}
              placeholder="Liste materiais adicionais recomendados."
            />
            {complementaryReferencesChecklist.length > 0 ? (
              <div className="rounded-2xl border border-line bg-background px-4 py-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink/70">Checklist ABNT - Referencias complementares</div>
                <div className="space-y-2 text-xs text-ink/80">
                  {complementaryReferencesChecklist.map((item) => (
                    <div key={`complementary-reference-${item.lineNumber}`} className="rounded-xl border border-line/70 bg-white px-3 py-2">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-semibold">Linha {item.lineNumber}</span>
                        <span className={item.status === 'ok' ? 'rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700' : 'rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700'}>
                          {item.status === 'ok' ? 'OK' : 'Ajustar'}
                        </span>
                      </div>
                      <div className="mb-1 text-ink/90">{item.message}</div>
                      <div className="truncate text-ink/70">{item.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <TextareaField
              label="Pre-requisitos"
              value={values.prerequeriments}
              onChange={(event) => handleChange('prerequeriments', event.target.value)}
              className="min-h-[128px]"
              placeholder="Use codigos de disciplinas separados por virgula, ou NAO_SE_APLICA"
            />

            <div className="rounded-2xl border border-line bg-background p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                <span>Classificacao de pre-requisitos</span>
                {isNotApplicable ? (
                  <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">Nao se aplica</span>
                ) : null}
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                {!isNotApplicable ? (
                  <button
                    type="button"
                    onClick={handleSetNotApplicable}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Marcar como nao se aplica
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleUnsetNotApplicable}
                    className="rounded-full border border-primary-200 bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-600 transition hover:bg-primary-200"
                  >
                    Remover nao se aplica
                  </button>
                )}
              </div>

              <div className={isNotApplicable ? 'pointer-events-none opacity-60' : ''}>
              <FormField
                label="Buscar disciplina por código ou nome"
                value={prereqSearch}
                onChange={(event) => setPrereqSearch(event.target.value)}
                placeholder="Ex.: IC045 ou Compiladores"
              />

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <FormField
                  label="Adicionar codigo pendente"
                  value={pendingCodeInput}
                  onChange={(event) => setPendingCodeInput(event.target.value.toUpperCase())}
                  placeholder="Ex.: MAT999"
                />
                <button
                  type="button"
                  onClick={handleAddPendingCode}
                  className="mt-7 h-11 rounded-2xl border border-amber-300 bg-amber-100 px-4 text-xs font-semibold text-amber-700 transition hover:bg-amber-200"
                >
                  Adicionar pendente
                </button>
              </div>

              {selectedPrerequeriments.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedPrerequerimentBadges.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => handleRemovePrerequeriment(item.code)}
                      className={
                        item.status === 'existing'
                          ? 'rounded-full border border-primary-200 bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-600 transition hover:bg-primary-200'
                          : 'rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-200'
                      }
                    >
                      {item.code} {item.status === 'existing' ? '(existente)' : '(pendente)'} x
                    </button>
                  ))}
                </div>
              ) : null}

              {suggestedPrerequeriments.length > 0 ? (
                <div className="mt-3 max-h-44 space-y-2 overflow-auto rounded-xl border border-line bg-white p-2">
                  {suggestedPrerequeriments.map((option) => (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => handleAddPrerequeriment(option.code)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-primary-100/40"
                    >
                      <span className="font-semibold text-primary-600">{option.code}</span>
                      <span className="ml-3 truncate text-ink/80">{option.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted">
                  Nenhuma disciplina encontrada para referência com esse filtro.
                </p>
              )}
              </div>
            </div>
          </div>
        </div>
      </section>

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