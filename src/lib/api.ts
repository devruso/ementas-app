import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import type {
  BulkRevokePublicSharesResult,
  Component,
  ComponentDraft,
  ComponentLog,
  ComponentMetadata,
  Course,
  Department,
  ImportDraftPreviewResponse,
  ImportComponentsSummary,
  ListData,
  ListFilter,
  PublicShare,
  PublicationContext,
  User,
} from '../types';
import { AppError } from './errors';
import { ApiErrorCode, buildApiError, buildNetworkError, type ApiErrorPayload } from './apiErrorCatalog';

interface AuthSessionResponse {
  token: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

interface PasswordResetConfirmResponse {
  email: string;
}

interface ApiSessionSnapshot {
  accessToken: string | null;
  refreshToken: string | null;
}

interface ApiAuthListeners {
  onSessionUpdate?: (session: { accessToken: string; refreshToken: string }) => void;
  onSessionClear?: () => void;
}

interface RetryableAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
}

const defaultApiBaseUrl =
  typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:3333/api';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultApiBaseUrl,
});

let authToken: string | null = null;
let refreshToken: string | null = null;
let listeners: ApiAuthListeners = {};
let refreshSessionPromise: Promise<AuthSessionResponse> | null = null;
let componentMetadataPromise: Promise<ComponentMetadata> | null = null;

const toAppError = (error: AxiosError<ApiErrorPayload>) => {
  if (!error.response) {
    return buildNetworkError();
  }

  const statusCode = error.response?.status || 500;
  return buildApiError(error.response?.data, statusCode);
};

const isAuthEndpoint = (url?: string) => {
  if (!url) {
    return false;
  }

  return url.includes('/auth/login') || url.includes('/auth/refresh');
};

const setSessionFromTokens = (session?: Partial<ApiSessionSnapshot> | null) => {
  authToken = session?.accessToken || null;
  refreshToken = session?.refreshToken || null;
};

const requestSessionRefresh = async () => {
  if (!refreshToken) {
    throw new AppError('Sessão expirada. Faça login novamente.', 401, {
      code: ApiErrorCode.AUTH_SESSION_EXPIRED,
      reason: 'Não há um token de renovação válido para manter a sessão.',
      recovery: 'Entre novamente com seu e-mail institucional e senha.',
    });
  }

  const response = await api.post<AuthSessionResponse>(
    '/auth/refresh',
    { refreshToken },
    { skipAuthRefresh: true } as RetryableAxiosRequestConfig
  );

  return response.data;
};

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorPayload>) => {
    const originalRequest = (error.config || {}) as RetryableAxiosRequestConfig;
    const shouldTryRefresh =
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.skipAuthRefresh &&
      !isAuthEndpoint(originalRequest.url) &&
      Boolean(refreshToken);

    if (shouldTryRefresh) {
      try {
        originalRequest._retry = true;

        if (!refreshSessionPromise) {
          refreshSessionPromise = requestSessionRefresh().finally(() => {
            refreshSessionPromise = null;
          });
        }

        const refreshedSession = await refreshSessionPromise;

        setSessionFromTokens({
          accessToken: refreshedSession.accessToken || refreshedSession.token,
          refreshToken: refreshedSession.refreshToken,
        });

        if (authToken && refreshToken) {
          listeners.onSessionUpdate?.({ accessToken: authToken, refreshToken });
        }

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${authToken}`;

        return api.request(originalRequest);
      } catch (refreshError) {
        setSessionFromTokens(null);
        listeners.onSessionClear?.();

        if (refreshError instanceof AppError) {
          return Promise.reject(refreshError);
        }

        return Promise.reject(toAppError(refreshError as AxiosError<ApiErrorPayload>));
      }
    }

    return Promise.reject(toAppError(error));
  }
);

export const setApiToken = (token?: string | null) => {
  setSessionFromTokens({ accessToken: token || null, refreshToken });
};

export const setApiSession = (session?: Partial<ApiSessionSnapshot> | null) => {
  setSessionFromTokens(session);
};

export const setApiAuthListeners = (apiAuthListeners: ApiAuthListeners) => {
  listeners = {
    ...listeners,
    ...apiAuthListeners,
  };
};

export const login = async (email: string, password: string) => {
  const response = await api.post<AuthSessionResponse>('/auth/login', { email, password });

  return response.data;
};

export const refreshAuthSession = async (sessionRefreshToken: string) => {
  const response = await api.post<AuthSessionResponse>('/auth/refresh', {
    refreshToken: sessionRefreshToken,
  });

  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get<User>('/auth/user');

  return response.data;
};

export const resetPassword = async (email: string) => {
  await api.post('/auth/reset-password', { email });
};

export const confirmResetPassword = async (token: string, password: string) => {
  const response = await api.post<PasswordResetConfirmResponse>('/auth/reset-password/confirm', {
    token,
    password,
  });

  return response.data;
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

export const resolveInviteShortCode = async (shortCode: string) => {
  const response = await api.get<{ inviteToken: string }>(`/invite/resolve/${shortCode}`);

  return response.data.inviteToken;
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

export const uploadUserSignatureFile = async (signatureFile: File, signature?: string) => {
  const formData = new FormData();
  formData.append('signatureFile', signatureFile);

  if (signature?.trim()) {
    formData.append('signature', signature.trim());
  }

  await api.put('/users/update/signature/file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getUserSignatureFilePreview = async () => {
  const response = await api.get<Blob>('/users/signature/file', {
    responseType: 'blob',
  });

  return response.data;
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
      course: (filter.course || filter.department)?.trim() || undefined,
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

export const getDepartments = async (filter: Pick<ListFilter, 'page' | 'limit' | 'search' | 'sortBy' | 'sortOrder'>) => {
  const response = await api.get<ListData<Department>>('/departments', {
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

export const createDepartment = async (name: string, code?: string) => {
  const response = await api.post<Department>('/departments', {
    name,
    code,
  });

  return response.data;
};

export const updateDepartment = async (departmentId: string, payload: { name: string; code?: string }) => {
  const response = await api.put<Department>(`/departments/${departmentId}`, payload);

  return response.data;
};

export const deleteDepartment = async (departmentId: string) => {
  await api.delete(`/departments/${departmentId}`);
};

export const getCourses = async (filter: Pick<ListFilter, 'page' | 'limit' | 'search' | 'sortBy' | 'sortOrder'>) => {
  const response = await api.get<ListData<Course>>('/courses', {
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

export const createCourse = async (name: string, code?: string) => {
  const response = await api.post<Course>('/courses', { name, code });
  componentMetadataPromise = null;
  return response.data;
};

export const updateCourse = async (courseId: string, payload: { name: string; code?: string }) => {
  const response = await api.put<Course>(`/courses/${courseId}`, payload);
  componentMetadataPromise = null;
  return response.data;
};

export const deleteCourse = async (courseId: string) => {
  await api.delete(`/courses/${courseId}`);
  componentMetadataPromise = null;
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
    passwordSetupLink?: string;
    emailDeliveryStatus?: 'sent' | 'mock' | 'failed' | 'disabled';
    emailDeliveryError?: string;
  }>('/users/create-teacher', {
    name,
    email,
    sendCredentialsByEmail,
  });

  return response.data;
};

export const sendInviteByEmail = async (email: string, registrationBaseUrl: string) => {
  const response = await api.post<{
    email: string;
    token: string;
    inviteLink: string;
    directInviteLink: string;
    inviteShortCode: string;
    emailDeliveryStatus: 'sent' | 'mock' | 'failed';
    emailDeliveryError?: string;
  }>('/users/invite-email', {
    email,
    registrationBaseUrl,
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
  academicLevel: 'graduacao' | 'mestrado' | 'doutorado' | 'all',
  sourceIdsByLevel?: Partial<Record<'graduacao' | 'mestrado' | 'doutorado', string>>
) => {
  const response = await api.post<ImportComponentsSummary>('/components/import/sigaa-public', {
    sourceType,
    sourceId,
    academicLevel,
    sourceIdsByLevel,
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
    referencesBasic: data.referencesBasic,
    referencesComplementary: data.referencesComplementary,
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
    referencesBasic: data.referencesBasic,
    referencesComplementary: data.referencesComplementary,
    prerequeriments: data.prerequeriments,
    workload: data.workload,
  });

  return response.data;
};

export const approveComponentDraft = async (
  componentDraftId: string,
  data: { password: string }
) => {
  const response = await api.post<Component>(`/component-drafts/${componentDraftId}/approve`, data);
  return response.data;
};

export const getComponentMetadata = () => {
  if (!componentMetadataPromise) {
    componentMetadataPromise = api
      .get<ComponentMetadata>('/components/metadata')
      .then((response) => response.data)
      .catch((error) => {
        componentMetadataPromise = null;
        throw error;
      });
  }

  return componentMetadataPromise;
};

export const getDraftPublicationContext = async (componentDraftId: string) => {
  const response = await api.get<PublicationContext>(`/component-drafts/${componentDraftId}/publication-context`);
  return response.data;
};
