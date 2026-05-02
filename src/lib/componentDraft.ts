import type { ComponentDraft, WorkloadEntry } from '../types';

export interface WorkloadGroupFormValue {
  theory: number;
  practice: number;
  theoryPractice: number;
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
  bibliography: string;
  prerequeriments: string;
  studentWorkload: WorkloadGroupFormValue;
  teacherWorkload: WorkloadGroupFormValue;
  moduleWorkload: WorkloadGroupFormValue;
}

const emptyWorkload: WorkloadGroupFormValue = {
  theory: 0,
  practice: 0,
  theoryPractice: 0,
  internship: 0,
  practiceInternship: 0,
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
  bibliography: cleanText(draft?.bibliography),
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
  bibliography: values.bibliography.trim(),
  prerequeriments: values.prerequeriments.trim(),
  workload: {
    studentTheory: values.studentWorkload.theory,
    studentPractice: values.studentWorkload.practice,
    studentTheoryPractice: values.studentWorkload.theoryPractice,
    studentInternship: values.studentWorkload.internship,
    studentPracticeInternship: values.studentWorkload.practiceInternship,
    teacherTheory: values.teacherWorkload.theory,
    teacherPractice: values.teacherWorkload.practice,
    teacherTheoryPractice: values.teacherWorkload.theoryPractice,
    teacherInternship: values.teacherWorkload.internship,
    teacherPracticeInternship: values.teacherWorkload.practiceInternship,
    moduleTheory: values.moduleWorkload.theory,
    modulePractice: values.moduleWorkload.practice,
    moduleTheoryPractice: values.moduleWorkload.theoryPractice,
    moduleInternship: values.moduleWorkload.internship,
    modulePracticeInternship: values.moduleWorkload.practiceInternship,
  },
});