import type { ComponentDraft, WorkloadEntry } from '../types';

export interface WorkloadGroupFormValue {
  theory: number;
  practice: number;
  theoryPractice: number;
  extension: number;
  internship: number;
  practiceInternship: number;
}

export interface DisciplineFormValues {
  code: string;
  name: string;
  department: string;
  semester: string;
  modality: string;
  program: string;
  objective: string;
  syllabus: string;
  methodology: string;
  learningAssessment: string;
  referencesBasic: string;
  referencesComplementary: string;
  prerequeriments: string;
  studentWorkload: WorkloadGroupFormValue;
  teacherWorkload: WorkloadGroupFormValue;
  moduleWorkload: WorkloadGroupFormValue;
}

export interface ReferenceChecklistItem {
  lineNumber: number;
  text: string;
  isWeb: boolean;
  hasYear: boolean;
  hasAccessDateTime: boolean;
  status: 'ok' | 'warning';
  message: string;
}

const emptyWorkload: WorkloadGroupFormValue = {
  theory: 0,
  practice: 0,
  theoryPractice: 0,
  extension: 0,
  internship: 0,
  practiceInternship: 0,
};

const URL_REGEX = /(https?:\/\/[^\s)]+)(?=[)\].,;!?]*\s*$|[\s])/i;
const ACCESS_REGEX = /acesso\s+em\s*:/i;
const TIME_REGEX = /\b\d{2}:\d{2}\b/;
const YEAR_REGEX = /\b(19|20)\d{2}\b/;

const ensureTrailingPeriod = (value: string) => {
  const normalized = value.trim();

  if (!normalized) {
    return normalized;
  }

  if (/[.!?]$/.test(normalized)) {
    return normalized;
  }

  return `${normalized}.`;
};

const toAccessStamp = (date = new Date()) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year}, ${hours}:${minutes}`;
};

export const formatAbntReferenceLine = (line: string, date = new Date()) => {
  const normalized = cleanText(line).replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return '';
  }

  const urlMatch = normalized.match(URL_REGEX);

  if (!urlMatch) {
    return normalized;
  }

  const url = (urlMatch[1] || '').trim();

  if (ACCESS_REGEX.test(normalized) && TIME_REGEX.test(normalized)) {
    return normalized;
  }

  const withoutUrl = normalized.replace(url, '').replace(/\s+/g, ' ').trim();
  const cleanedBase = withoutUrl
    .replace(/dispon[ií]vel\s+em\s*:/gi, '')
    .replace(/acesso\s+em\s*:/gi, '')
    .replace(/[;,:]+$/g, '')
    .trim();
  const descriptor = ensureTrailingPeriod(cleanedBase || 'Recurso online');

  return `${descriptor} Disponivel em: ${url}. Acesso em: ${toAccessStamp(date)}.`;
};

export const formatAbntReferenceBlock = (value?: string, date = new Date()) =>
  String(value || '')
    .split(/\r?\n/)
    .map((line) => formatAbntReferenceLine(line, date))
    .filter((line) => line.length > 0)
    .join('\n');

export const hasNonWebReferenceWithoutYear = (value?: string) => {
  const lines = String(value || '')
    .split(/\r?\n/)
    .map((line) => cleanText(line).replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);

  return lines.some((line) => !URL_REGEX.test(line) && !YEAR_REGEX.test(line));
};

export const buildReferenceChecklist = (value?: string): ReferenceChecklistItem[] => String(value || '')
  .split(/\r?\n/)
  .map((line) => cleanText(line).replace(/\s+/g, ' ').trim())
  .filter((line) => line.length > 0)
  .map((line, index) => {
    const isWeb = URL_REGEX.test(line);
    const hasYear = YEAR_REGEX.test(line);
    const hasAccessDateTime = ACCESS_REGEX.test(line) && TIME_REGEX.test(line);

    if (isWeb) {
      return {
        lineNumber: index + 1,
        text: line,
        isWeb,
        hasYear,
        hasAccessDateTime,
        status: hasAccessDateTime ? 'ok' : 'warning',
        message: hasAccessDateTime
          ? 'Referencia web com data e horario de acesso.'
          : 'Referencia web sem acesso completo (data e horario).',
      };
    }

    return {
      lineNumber: index + 1,
      text: line,
      isWeb,
      hasYear,
      hasAccessDateTime,
      status: hasYear ? 'ok' : 'warning',
      message: hasYear
        ? 'Referencia nao web com ano identificado.'
        : 'Referencia nao web sem ano de publicacao.',
    };
  });

export const extractReferenceSections = (rawBibliography?: string) => {
  const raw = cleanText(rawBibliography).trim();

  if (!raw) {
    return { basic: '', complementary: '' };
  }

  const basicMatch = raw.match(/(?:REFERENCIAS\s+BASICAS|REFERÊNCIAS\s+BÁSICAS|BASICAS|BÁSICAS)\s*:\s*([\s\S]*?)(?=(?:REFERENCIAS\s+COMPLEMENTARES|REFERÊNCIAS\s+COMPLEMENTARES|COMPLEMENTARES)\s*:|$)/i);
  const complementaryMatch = raw.match(/(?:REFERENCIAS\s+COMPLEMENTARES|REFERÊNCIAS\s+COMPLEMENTARES|COMPLEMENTARES)\s*:\s*([\s\S]*)$/i);

  if (basicMatch || complementaryMatch) {
    return {
      basic: (basicMatch?.[1] || '').trim(),
      complementary: (complementaryMatch?.[1] || '').trim(),
    };
  }

  return { basic: raw, complementary: '' };
};

export const buildBibliographyPayload = (referencesBasic: string, referencesComplementary: string) => {
  const basic = formatAbntReferenceBlock(referencesBasic).trim();
  const complementary = formatAbntReferenceBlock(referencesComplementary).trim();

  if (!basic && !complementary) {
    return '';
  }

  return [
    `REFERENCIAS BASICAS:\n${basic || 'Nao informado.'}`,
    `REFERENCIAS COMPLEMENTARES:\n${complementary || 'Nao informado.'}`,
  ].join('\n\n');
};

const cleanText = (value?: string) => {
  if (!value || value.startsWith('Nao ha') || value.startsWith('Não há')) {
    return '';
  }

  return value;
};

const toGroup = (
  workload: WorkloadEntry | undefined,
  prefix: 'student' | 'teacher' | 'module'
): WorkloadGroupFormValue => ({
  theory: workload?.[`${prefix}Theory`] || 0,
  practice: workload?.[`${prefix}Practice`] || 0,
  theoryPractice: workload?.[`${prefix}TheoryPractice`] || 0,
  extension: workload?.[`${prefix}Extension`] || 0,
  internship: workload?.[`${prefix}Internship`] || 0,
  practiceInternship: workload?.[`${prefix}PracticeInternship`] || 0,
});

export const getDisciplineFormInitialValues = (draft?: ComponentDraft): DisciplineFormValues => ({
  code: cleanText(draft?.code),
  name: cleanText(draft?.name),
  department: cleanText(draft?.department),
  semester: cleanText(draft?.semester),
  modality: cleanText(draft?.modality),
  program: cleanText(draft?.program),
  objective: cleanText(draft?.objective),
  syllabus: cleanText(draft?.syllabus),
  methodology: cleanText(draft?.methodology),
  learningAssessment: cleanText(draft?.learningAssessment),
  referencesBasic: cleanText(draft?.referencesBasic) || extractReferenceSections(draft?.bibliography).basic,
  referencesComplementary: cleanText(draft?.referencesComplementary) || extractReferenceSections(draft?.bibliography).complementary,
  prerequeriments: cleanText(draft?.prerequeriments),
  studentWorkload: draft?.workload ? toGroup(draft.workload, 'student') : emptyWorkload,
  teacherWorkload: draft?.workload ? toGroup(draft.workload, 'teacher') : emptyWorkload,
  moduleWorkload: draft?.workload ? toGroup(draft.workload, 'module') : emptyWorkload,
});

export const toDraftPayload = (values: DisciplineFormValues): Partial<ComponentDraft> => ({
  code: values.code.trim(),
  name: values.name.trim(),
  department: values.department.trim(),
  semester: values.semester.trim(),
  modality: values.modality.trim(),
  program: values.program.trim(),
  objective: values.objective.trim(),
  syllabus: values.syllabus.trim(),
  methodology: values.methodology.trim(),
  learningAssessment: values.learningAssessment.trim(),
  referencesBasic: formatAbntReferenceBlock(values.referencesBasic).trim(),
  referencesComplementary: formatAbntReferenceBlock(values.referencesComplementary).trim(),
  bibliography: buildBibliographyPayload(values.referencesBasic, values.referencesComplementary),
  prerequeriments: values.prerequeriments.trim(),
  workload: {
    studentTheory: values.studentWorkload.theory,
    studentPractice: values.studentWorkload.practice,
    studentTheoryPractice: values.studentWorkload.theoryPractice,
    studentExtension: values.studentWorkload.extension,
    studentInternship: values.studentWorkload.internship,
    studentPracticeInternship: values.studentWorkload.practiceInternship,
    teacherTheory: values.teacherWorkload.theory,
    teacherPractice: values.teacherWorkload.practice,
    teacherTheoryPractice: values.teacherWorkload.theoryPractice,
    teacherExtension: values.teacherWorkload.extension,
    teacherInternship: values.teacherWorkload.internship,
    teacherPracticeInternship: values.teacherWorkload.practiceInternship,
    moduleTheory: values.moduleWorkload.theory,
    modulePractice: values.moduleWorkload.practice,
    moduleTheoryPractice: values.moduleWorkload.theoryPractice,
    moduleExtension: values.moduleWorkload.extension,
    moduleInternship: values.moduleWorkload.internship,
    modulePracticeInternship: values.moduleWorkload.practiceInternship,
  },
});