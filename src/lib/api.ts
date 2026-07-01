import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import type {
  BulkRevokePublicSharesResult,
  Component,
  ComponentDraft,
  ComponentLog,
  Department,
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

interface AuthSessionResponse {
  token: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
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

const apiMessageMap: Record<string, string> = {
  'Validation failed': 'Existem campos inválidos. Revise os dados informados.',
  'Incorrect username and/or password. Please try again!': 'E-mail ou senha inválidos. Confira os dados e tente novamente.',
  'Username or password missing. Please try again!': 'Informe e-mail e senha para continuar.',
  'User does not exists!': 'Usuário não encontrado.',
  'User not found.': 'Usuário não encontrado.',
  'User already exists.': 'Já existe uma conta cadastrada com esse e-mail.',
  'Only UFBA institutional email addresses are allowed.': 'Use um e-mail institucional da UFBA (@ufba.br).',
  'Invalid registration base URL. Use a full URL, e.g. http://localhost:3000.': 'URL de cadastro inválida para gerar convite por e-mail.',
  'Only super admin can remove users.': 'Apenas super admin pode remover usuarios.',
  'Super admin cannot remove own account.': 'Nao e permitido remover o proprio usuario.',
  'This invite is invalid or already expired.': 'Convite inválido ou expirado.',
  'An error has been occurred.': 'Não foi possível concluir a operação. Tente novamente.',
  'An error has been occurred!': 'Não foi possível concluir a operação. Tente novamente.',
  'Internal Server Error': 'Não foi possível concluir a operação. Tente novamente.',
};

const normalizeApiMessage = (message?: string) => {
  const normalizedMessage = message?.trim();

  if (!normalizedMessage) {
    return 'Erro interno no servidor.';
  }

  if (Object.prototype.hasOwnProperty.call(apiMessageMap, normalizedMessage)) {
    return apiMessageMap[normalizedMessage];
  }

  if (/^internal server error$/i.test(normalizedMessage)) {
    return 'Não foi possível concluir a operação. Tente novamente.';
  }

  return normalizedMessage;
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
    .replace(/^email\s+deve\s+ser\s+um\s+endere[cç]o\s+de\s+email$/i, 'Informe um e-mail válido.')
    .replace(/^name\s+deve\s+ser\s+informado.*$/i, 'Informe seu nome.')
    .replace(/^email\s+deve\s+ser\s+informado.*$/i, 'Informe seu e-mail.')
    .replace(/^password\s+deve\s+ser\s+informado.*$/i, 'Informe sua senha.')
    .replace(/^password\s+deve\s+estar\s+de\s+acordo\s+com\s+a\s+expressão\s+regular.*$/i, 'A senha deve ter de 8 a 20 caracteres e incluir letra maiúscula, minúscula, número e caractere especial.')
    .replace(/^([a-zA-Z]+) deve ser informado.*$/i, 'Preencha os campos obrigatórios para continuar.');
};

const defaultApiBaseUrl =
  typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:3333/api';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultApiBaseUrl,
});

let authToken: string | null = null;
let refreshToken: string | null = null;
let listeners: ApiAuthListeners = {};
let refreshSessionPromise: Promise<AuthSessionResponse> | null = null;

const toAppError = (error: AxiosError<ApiErrorPayload>) => {
  if (!error.response) {
    return new AppError(
      'Nao foi possivel conectar na API. Verifique se o frontend foi configurado com VITE_API_URL correto e se o backend esta online.',
      503
    );
  }

  const payload = error.response?.data;
  const validationReason = extractValidationReason(payload);
  const message = validationReason || normalizeApiMessage(payload?.message);
  const statusCode = error.response?.status || 500;

  return new AppError(message, statusCode);
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
    throw new AppError('Sessão expirada. Faça login novamente.', 401);
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
  data: { agreementDate: string; agreementNumber: string; signature: string }
) => {
  await api.post(`/component-drafts/${componentDraftId}/approve`, data);
};