import axios, { AxiosError } from 'axios';

import type {
  BulkRevokePublicSharesResult,
  Component,
  ComponentDraft,
  ComponentLog,
  ImportDraftPreviewResponse,
  ImportComponentsSummary,
  ListData,
  ListFilter,
  PublicShare,
  User,
} from '../types';
import { AppError } from './errors';

interface ApiValidationDetail {
  property?: string;
  reasons?: string[];
}

interface ApiErrorPayload {
  message?: string;
  error?: ApiValidationDetail[] | string;
}

const apiMessageMap: Record<string, string> = {
  'Validation failed': 'Existem campos inválidos. Revise os dados informados.',
  'Incorrect username and/or password. Please try again!': 'E-mail ou senha inválidos. Confira os dados e tente novamente.',
  'Username or password missing. Please try again!': 'Informe e-mail e senha para continuar.',
  'User does not exists!': 'Usuário não encontrado.',
  'This invite is invalid or already expired.': 'Convite inválido ou expirado.',
};

const normalizeApiMessage = (message?: string) => {
  if (!message) {
    return 'Erro interno no servidor.';
  }

  return apiMessageMap[message] || message;
};

const extractValidationReason = (payload?: ApiErrorPayload) => {
  if (!payload?.error || !Array.isArray(payload.error)) {
    return null;
  }

  const firstReason = payload.error.find((item) => item?.reasons?.length)?.reasons?.[0];

  if (!firstReason) {
    return null;
  }

  return firstReason
    .replace(
      /^code\s+deve\s+estar\s+de\s+acordo\s+com\s+a\s+expressão\s+regular\s+\/\^\[A-Z\]\{2,4\}\[0-9\]\{2,4\}\$\/$/i,
      'Código inválido. Use o formato AAA999 ou AAAA9999 (ex.: MAT245 ou IC045).'
    )
    .replace(
      /^code\s+deve\s+estar\s+de\s+acordo\s+com\s+a\s+expressão\s+regular\s+\/\^\[A-Z\]\{3,4\}\[0-9\]\{2,4\}\$\/$/i,
      'Código inválido. Use o formato AAA999 ou AAAA9999 (ex.: MAT245 ou IC045).'
    )
    .replace(/^([a-zA-Z]+) deve ser informado.*$/i, 'Preencha os campos obrigatórios para continuar.');
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3333/api',
});

let authToken: string | null = null;

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    const payload = error.response?.data;
    const validationReason = extractValidationReason(payload);
    const message = validationReason || normalizeApiMessage(payload?.message);
    const statusCode = error.response?.status || 500;

    return Promise.reject(new AppError(message, statusCode));
  }
);

export const setApiToken = (token?: string | null) => {
  authToken = token || null;
};

export const login = async (email: string, password: string) => {
  const response = await api.post<{ token: string }>('/auth/login', { email, password });

  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get<User>('/auth/user');

  return response.data;
};

export const resetPassword = async (email: string) => {
  await api.post('/auth/reset-password', { email });
};

export const register = async (
  inviteToken: string,
  name: string,
  email: string,
  password: string
) => {
  await api.post(`/users/${inviteToken}`, { name, email, password });
};

export const validateInviteToken = async (inviteToken: string) => {
  await api.get(`/invite/validate/${inviteToken}`);
};

export const updateUserEmail = async (email: string) => {
  await api.put('/users/update/email', { email });
};

export const updateUserPassword = async (password: string) => {
  await api.put('/users/update/password', { password });
};

export const updateUserSignature = async (signature: string) => {
  await api.put('/users/update/signature', { signature });
};

export const updateUserRole = async (userId: string, role: 'super_admin' | 'admin' | 'teacher') => {
  await api.put(`/users/${userId}/role`, { role });
};

export const getComponents = async (filter: ListFilter) => {
  const response = await api.get<ListData<Component>>('/components', {
    params: {
      page: filter.page,
      limit: filter.limit,
      search: filter.search?.trim() || undefined,
      sortBy: filter.sortBy,
      sortOrder: filter.sortOrder,
      academicLevel: filter.academicLevel,
      department: filter.department?.trim() || undefined,
    },
  });

  return response.data;
};

export const getComponentByCode = async (componentCode: string) => {
  const response = await api.get<Component>(`/components/${componentCode}`);

  return response.data;
};

export const getSharedComponentByToken = async (token: string) => {
  const response = await api.get<Component>(`/components/shared/${token}`);

  return response.data;
};

export const getComponentLogs = async (
  componentId: string,
  filter: ListFilter & { type?: ComponentLog['type'] }
) => {
  const response = await api.get<ListData<ComponentLog>>(`/components/${componentId}/logs`, {
    params: {
      page: filter.page,
      limit: filter.limit,
      type: filter.type,
      sortBy: filter.sortBy,
      sortOrder: filter.sortOrder,
    },
  });

  return response.data;
};

export const exportComponentPdf = async (componentId: string) => {
  const response = await api.get<ArrayBuffer>(`/components/${componentId}/export`, {
    responseType: 'arraybuffer',
    headers: { Accept: 'application/pdf' },
  });

  return new Blob([response.data], { type: 'application/pdf;charset=utf-8' });
};

export const exportComponentDocx = async (componentId: string) => {
  const response = await api.get<ArrayBuffer>(`/components/${componentId}/export`, {
    params: { format: 'docx' },
    responseType: 'arraybuffer',
    headers: { Accept: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  });

  return new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document;charset=utf-8',
  });
};

export const getUsers = async (filter: ListFilter) => {
  const response = await api.get<ListData<User>>('/users', {
    params: {
      page: filter.page,
      limit: filter.limit,
      search: filter.search?.trim() || undefined,
      sortBy: filter.sortBy,
      sortOrder: filter.sortOrder,
    },
  });

  return response.data;
};

export const generateInvite = async () => {
  const response = await api.get<{ token: string }>('/invite/generate');

  return response.data.token;
};

export const deleteUserById = async (userId: string) => {
  await api.delete(`/users/${userId}`);
};

export const createPublicShare = async (componentId: string, expiresInHours = 24) => {
  const response = await api.post<PublicShare>(`/components/${componentId}/public-shares`, {
    expiresInHours,
  });

  return response.data;
};

export const revokePublicShare = async (shareId: string) => {
  await api.post(`/components/public-shares/${shareId}/revoke`);
};

export const getActivePublicShares = async (
  componentId: string,
  filter: Pick<ListFilter, 'page' | 'limit' | 'sortBy' | 'sortOrder'> & {
    creatorId?: string;
    expirationRange?: '24h' | '72h' | '168h' | 'all';
  }
) => {
  const response = await api.get<ListData<PublicShare>>(`/components/${componentId}/public-shares`, {
    params: {
      page: filter.page,
      limit: filter.limit,
      sortBy: filter.sortBy,
      sortOrder: filter.sortOrder,
      creatorId: filter.creatorId,
      expirationRange: filter.expirationRange,
    },
  });

  return response.data;
};

export const revokeAllPublicShares = async (componentId: string) => {
  const response = await api.post<BulkRevokePublicSharesResult>(`/components/${componentId}/public-shares/revoke-all`);

  return response.data;
};

export const createTeacherByAdmin = async (
  name: string,
  email: string,
  sendCredentialsByEmail = true
) => {
  const response = await api.post<{
    id: string;
    name: string;
    email: string;
    temporaryPassword: string;
  }>('/users/create-teacher', {
    name,
    email,
    sendCredentialsByEmail,
  });

  return response.data;
};

export const importComponentsFromSiac = async (courseCode: number, semester: number) => {
  const response = await api.post<ImportComponentsSummary>('/components/import', {
    cdCurso: courseCode,
    nuPerCursoInicial: semester,
  });

  return response.data;
};

export const importComponentsFromSigaaPublic = async (
  sourceType: 'department' | 'program',
  sourceId: string,
  academicLevel: 'graduacao' | 'mestrado' | 'doutorado'
) => {
  const response = await api.post<ImportComponentsSummary>('/components/import/sigaa-public', {
    sourceType,
    sourceId,
    academicLevel,
  });

  return response.data;
};

export const getComponentDraftByCode = async (componentCode: string) => {
  const response = await api.get<ComponentDraft>(`/component-drafts/${componentCode}`);

  return response.data;
};

export const getComponentDrafts = async (filter: ListFilter) => {
  const response = await api.get<ListData<ComponentDraft>>('/component-drafts', {
    params: {
      page: filter.page,
      limit: filter.limit,
      search: filter.search?.trim() || undefined,
      sortBy: filter.sortBy,
      sortOrder: filter.sortOrder,
    },
  });

  return response.data;
};

export const createComponentDraft = async (data: Partial<ComponentDraft>) => {
  const response = await api.post<ComponentDraft>('/component-drafts', {
    code: data.code,
    name: data.name,
    department: data.department,
    semester: data.semester,
    modality: data.modality,
    program: data.program,
    objective: data.objective,
    syllabus: data.syllabus,
    methodology: data.methodology,
    learningAssessment: data.learningAssessment,
    bibliography: data.bibliography,
    prerequeriments: data.prerequeriments,
    workload: data.workload,
  });

  return response.data;
};

export const previewDraftImport = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<ImportDraftPreviewResponse>('/component-drafts/import-preview', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const updateComponentDraft = async (
  componentDraftId: string,
  data: Partial<ComponentDraft>
) => {
  const response = await api.put<ComponentDraft>(`/component-drafts/${componentDraftId}`, {
    code: data.code,
    name: data.name,
    department: data.department,
    semester: data.semester,
    modality: data.modality,
    program: data.program,
    objective: data.objective,
    syllabus: data.syllabus,
    methodology: data.methodology,
    learningAssessment: data.learningAssessment,
    bibliography: data.bibliography,
    prerequeriments: data.prerequeriments,
    workload: data.workload,
  });

  return response.data;
};

export const approveComponentDraft = async (
  componentDraftId: string,
  data: { agreementDate: string; agreementNumber: string; signature: string }
) => {
  await api.post(`/component-drafts/${componentDraftId}/approve`, data);
};