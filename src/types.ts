export interface ListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface ListData<T> {
  results: T[];
  total: number;
  meta?: ListMeta;
}

export interface ListFilter {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ImportDraftPreviewPayload {
  code: string;
  name: string;
  department: string;
  modality: string;
  program: string;
  semester: string;
  prerequeriments: string;
  methodology: string;
  objective: string;
  syllabus: string;
  learningAssessment: string;
  bibliography: string;
  workload: WorkloadEntry;
}

export interface ImportDraftPreviewResponse {
  fileName: string;
  mimeType: string;
  suggestedDraft: ImportDraftPreviewPayload;
  warnings: string[];
  unrecognizedSections: string[];
  extractedSections: Record<string, string>;
  rawText: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher';
  createdAt?: string;
}

export interface ComponentLog {
  id: string;
  type: 'creation' | 'approval' | 'draft_update';
  description?: string;
  agreementNumber?: string;
  agreementDate?: string;
  createdAt: string;
  user?: User;
}

export interface WorkloadEntry {
  studentTheory?: number;
  studentPractice?: number;
  studentTheoryPractice?: number;
  studentInternship?: number;
  studentPracticeInternship?: number;
  teacherTheory?: number;
  teacherPractice?: number;
  teacherTheoryPractice?: number;
  teacherInternship?: number;
  teacherPracticeInternship?: number;
  moduleTheory?: number;
  modulePractice?: number;
  moduleTheoryPractice?: number;
  moduleInternship?: number;
  modulePracticeInternship?: number;
}

export interface ComponentDraft {
  id: string;
  code: string;
  name: string;
  department?: string;
  semester?: string;
  modality?: string;
  program?: string;
  objective?: string;
  syllabus?: string;
  methodology?: string;
  learningAssessment?: string;
  bibliography?: string;
  prerequeriments?: string;
  workload?: WorkloadEntry;
  userId?: string;
}

export interface Component {
  id: string;
  code: string;
  name: string;
  department?: string;
  semester?: string;
  modality?: string;
  program?: string;
  objective?: string;
  syllabus?: string;
  methodology?: string;
  learningAssessment?: string;
  bibliography?: string;
  prerequeriments?: string;
  workload?: WorkloadEntry;
  logs?: ComponentLog[];
  draft?: ComponentDraft;
  userId: string;
}