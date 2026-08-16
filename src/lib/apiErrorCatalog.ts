import { AppError } from './errors';

export enum ApiErrorCode {
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  ROUTE_NOT_FOUND = 'ROUTE_NOT_FOUND',
  AUTH_CREDENTIALS_REQUIRED = 'AUTH_CREDENTIALS_REQUIRED',
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_INSTITUTIONAL_EMAIL_REQUIRED = 'AUTH_INSTITUTIONAL_EMAIL_REQUIRED',
  AUTH_USER_UNAVAILABLE = 'AUTH_USER_UNAVAILABLE',
  AUTH_TOKEN_REQUIRED = 'AUTH_TOKEN_REQUIRED',
  AUTH_SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',
  AUTH_FORBIDDEN = 'AUTH_FORBIDDEN',
  AUTH_PASSWORD_RESET_INPUT_REQUIRED = 'AUTH_PASSWORD_RESET_INPUT_REQUIRED',
  AUTH_PASSWORD_RESET_LINK_INVALID = 'AUTH_PASSWORD_RESET_LINK_INVALID',
  AUTH_PASSWORD_RESET_DELIVERY_FAILED = 'AUTH_PASSWORD_RESET_DELIVERY_FAILED',
  DRAFT_NOT_FOUND = 'DRAFT_NOT_FOUND',
  DRAFT_CODE_CONFLICT = 'DRAFT_CODE_CONFLICT',
  DRAFT_SAVE_FAILED = 'DRAFT_SAVE_FAILED',
  PUBLICATION_PASSWORD_REQUIRED = 'PUBLICATION_PASSWORD_REQUIRED',
  PUBLICATION_PASSWORD_INVALID = 'PUBLICATION_PASSWORD_INVALID',
  PUBLICATION_REQUIRED_FIELDS = 'PUBLICATION_REQUIRED_FIELDS',
  PUBLICATION_REFERENCES_REQUIRED = 'PUBLICATION_REFERENCES_REQUIRED',
  PUBLICATION_REFERENCE_YEAR_REQUIRED = 'PUBLICATION_REFERENCE_YEAR_REQUIRED',
  PUBLICATION_AGREEMENT_CONFLICT = 'PUBLICATION_AGREEMENT_CONFLICT',
  PUBLICATION_FAILED = 'PUBLICATION_FAILED',
  NETWORK_UNAVAILABLE = 'NETWORK_UNAVAILABLE',
}

export interface ApiValidationDetail {
  property?: string;
  reasons?: string[];
}

export interface ApiErrorPayload {
  code?: string;
  message?: string;
  reason?: string;
  recovery?: string;
  details?: Record<string, unknown>;
  error?: ApiValidationDetail[] | string;
}

type ErrorPresentation = {
  message: string;
  reason?: string;
  recovery?: string;
};

const FALLBACK_ERROR: ErrorPresentation = {
  message: 'Não foi possível concluir a operação.',
  reason: 'O servidor não retornou informações suficientes sobre o erro.',
  recovery: 'Tente novamente. Se o problema persistir, informe o horário e a operação realizada.',
};

const ERROR_PRESENTATIONS: Partial<Record<ApiErrorCode, ErrorPresentation>> = {
  [ApiErrorCode.NETWORK_UNAVAILABLE]: {
    message: 'Não foi possível conectar ao servidor.',
    reason: 'A API está indisponível ou o frontend aponta para um endereço incorreto.',
    recovery: 'Verifique sua conexão e tente novamente em alguns instantes.',
  },
};

const LEGACY_MESSAGE_CODES: Record<string, ApiErrorCode> = {
  'Incorrect username and/or password. Please try again!': ApiErrorCode.AUTH_INVALID_CREDENTIALS,
  'Username or password missing. Please try again!': ApiErrorCode.AUTH_CREDENTIALS_REQUIRED,
  'Only UFBA institutional email addresses are allowed.': ApiErrorCode.AUTH_INSTITUTIONAL_EMAIL_REQUIRED,
  'User not found.': ApiErrorCode.AUTH_USER_UNAVAILABLE,
  'No token provided.': ApiErrorCode.AUTH_TOKEN_REQUIRED,
  'Token expired.': ApiErrorCode.AUTH_SESSION_EXPIRED,
  'No userId provided.': ApiErrorCode.AUTH_TOKEN_REQUIRED,
  'User is not an admin.': ApiErrorCode.AUTH_FORBIDDEN,
  'User is not a super admin.': ApiErrorCode.AUTH_FORBIDDEN,
  'Draft not found.': ApiErrorCode.DRAFT_NOT_FOUND,
  'An error has been occurred.': ApiErrorCode.DRAFT_SAVE_FAILED,
  'An error has been occurred!': ApiErrorCode.DRAFT_SAVE_FAILED,
  'Internal Server Error': ApiErrorCode.INTERNAL_ERROR,
};

const resolveLegacyCode = (message?: string) => (
  message && Object.prototype.hasOwnProperty.call(LEGACY_MESSAGE_CODES, message)
    ? LEGACY_MESSAGE_CODES[message]
    : undefined
);

export const buildNetworkError = () => {
  const presentation = ERROR_PRESENTATIONS[ApiErrorCode.NETWORK_UNAVAILABLE] as ErrorPresentation;
  return new AppError(presentation.message, 503, {
    code: ApiErrorCode.NETWORK_UNAVAILABLE,
    reason: presentation.reason,
    recovery: presentation.recovery,
  });
};

export const buildApiError = (payload: ApiErrorPayload | undefined, statusCode: number) => {
  const code = payload?.code || resolveLegacyCode(payload?.message);
  const localPresentation = code
    ? ERROR_PRESENTATIONS[code as ApiErrorCode]
    : undefined;
  const fallback = localPresentation || FALLBACK_ERROR;

  return new AppError(payload?.message?.trim() || fallback.message, statusCode, {
    code,
    reason: payload?.reason || fallback.reason,
    recovery: payload?.recovery || fallback.recovery,
    details: payload?.details,
  });
};

const INVALID_SESSION_CODES = new Set<string>([
  ApiErrorCode.AUTH_TOKEN_REQUIRED,
  ApiErrorCode.AUTH_SESSION_EXPIRED,
  ApiErrorCode.AUTH_USER_UNAVAILABLE,
]);

export const isInvalidSessionError = (error: unknown) => (
  error instanceof AppError
  && (error.statusCode === 401 || Boolean(error.code && INVALID_SESSION_CODES.has(error.code)))
);
