export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'UPSTREAM_NOT_CONFIGURED'
  | 'UPSTREAM_RATE_LIMIT'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR';

export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly statusCode: number;

  constructor(code: ApiErrorCode, message: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class UpstreamNotConfiguredError extends ApiError {
  constructor(message = 'Proveedor externo no configurado para esta zona') {
    super('UPSTREAM_NOT_CONFIGURED', message, 503);
  }
}

export class UpstreamRateLimitError extends ApiError {
  constructor(message = 'Rate limit exceeded for provider request') {
    super('UPSTREAM_RATE_LIMIT', message, 429);
  }
}

export class UpstreamError extends ApiError {
  constructor(message = 'Error del proveedor externo', statusCode = 502) {
    super('UPSTREAM_ERROR', message, statusCode);
  }
}

