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
  academicLevel?: 'graduacao' | 'mestrado' | 'doutorado';
  department?: string;
}

export interface ImportComponentsSummary {
  source: 'siac' | 'sigaa-public';
  requested: number;
  created: number;
  skippedExisting: number;
  failed: number;
  failures: string[];
  failureCategories: Record<string, number>;
  parameters?: Record<string, string>;
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
  referencesBasic?: string;
  referencesComplementary?: string;
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
  role: 'super_admin' | 'admin' | 'teacher';
  signatureUpdatedAt?: string;
  signatureFileKey?: string;
  signatureFileProvider?: string;
  signatureFileContentType?: string;
  signatureFileSize?: number;
  signatureFileHash?: string;
  createdAt?: string;
}

export interface PublicShare {
  id: string;
  token: string;
  expiresAt: string;
  publicLink: string;
  createdAt?: string;
  createdBy?: string;
  createdByUser?: Pick<User, 'id' | 'name' | 'email'>;
}

export interface BulkRevokePublicSharesResult {
  revokedCount: number;
}

export interface ComponentLog {
  id: string;
  type: 'creation' | 'approval' | 'draft_update';
  description?: string;
  agreementNumber?: string;
  agreementDate?: string;
  versionCode?: string;
  officialProgram?: string;
  officialSyllabus?: string;
  createdAt: string;
  user?: User;
}

export interface WorkloadEntry {
  studentTheory?: number;
  studentPractice?: number;
  studentTheoryPractice?: number;
  studentExtension?: number;
  studentInternship?: number;
  studentPracticeInternship?: number;
  teacherTheory?: number;
  teacherPractice?: number;
  teacherTheoryPractice?: number;
  teacherExtension?: number;
  teacherInternship?: number;
  teacherPracticeInternship?: number;
  moduleTheory?: number;
  modulePractice?: number;
  moduleTheoryPractice?: number;
  moduleExtension?: number;
  moduleInternship?: number;
  modulePracticeInternship?: number;
}

export interface ComponentDraft {
  id: string;
  code: string;
  name: string;
  department?: string;
  semester?: string;
  academicLevel?: 'graduacao' | 'mestrado' | 'doutorado';
  modality?: string;
  program?: string;
  objective?: string;
  syllabus?: string;
  methodology?: string;
  learningAssessment?: string;
  bibliography?: string;
  referencesBasic?: string;
  referencesComplementary?: string;
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
  academicLevel?: 'graduacao' | 'mestrado' | 'doutorado';
  modality?: string;
  program?: string;
  objective?: string;
  syllabus?: string;
  methodology?: string;
  learningAssessment?: string;
  bibliography?: string;
  referencesBasic?: string;
  referencesComplementary?: string;
  prerequeriments?: string;
  workload?: WorkloadEntry;
  logs?: ComponentLog[];
  draft?: ComponentDraft;
  userId: string;
}