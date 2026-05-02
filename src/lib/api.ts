import axios, { AxiosError } from 'axios';

import type {
  Component,
  ComponentDraft,
  ComponentLog,
  ImportDraftPreviewResponse,
  ListData,
  ListFilter,
  User,
} from '../types';
import { AppError } from './errors';

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
  (error: AxiosError<{ message?: string }>) => {
    const message = error.response?.data?.message || 'Erro interno no servidor.';
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

export const getComponents = async (filter: ListFilter) => {
  const response = await api.get<ListData<Component>>('/components', {
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

export const getComponentByCode = async (componentCode: string) => {
  const response = await api.get<Component>(`/components/${componentCode}`);

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

export const importComponentsFromSiac = async (courseCode: number, semester: number) => {
  await api.post('/components/import', {
    cdCurso: courseCode,
    nuPerCursoInicial: semester,
  });
};

export const getComponentDraftByCode = async (componentCode: string) => {
  const response = await api.get<ComponentDraft>(`/component-drafts/${componentCode}`);

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
  data: { agreementDate: string; agreementNumber: string }
) => {
  await api.post(`/component-drafts/${componentDraftId}/approve`, data);
};