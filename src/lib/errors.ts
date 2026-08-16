export class AppError extends Error {
  statusCode: number;
  code?: string;
  reason?: string;
  recovery?: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode = 500,
    options?: {
      code?: string;
      reason?: string;
      recovery?: string;
      details?: Record<string, unknown>;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = options?.code;
    this.reason = options?.reason;
    this.recovery = options?.recovery;
    this.details = options?.details;
  }
}
