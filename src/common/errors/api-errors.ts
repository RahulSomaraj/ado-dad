import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Stable, client-facing error codes for the sell flow (sell config, media,
 * POST /v2/ads). The mobile app maps these to copy — never parse `message`.
 */
export enum ApiErrorCode {
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  IDEMPOTENCY_IN_PROGRESS = 'IDEMPOTENCY_IN_PROGRESS',
  IDEMPOTENCY_KEY_REUSED = 'IDEMPOTENCY_KEY_REUSED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_MEDIA_TYPE = 'UNSUPPORTED_MEDIA_TYPE',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL = 'INTERNAL',
}

/** Field path (e.g. `vehicle.color`) → human message. */
export type FieldErrors = Record<string, string>;

export const VALIDATION_FAILED_MESSAGE = 'Some details need fixing';

/** A domain validation failure that carries every field error at once → 422. */
export class FieldValidationException extends HttpException {
  constructor(
    public readonly fields: FieldErrors,
    message: string = VALIDATION_FAILED_MESSAGE,
  ) {
    super(
      {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        code: ApiErrorCode.VALIDATION_FAILED,
        message,
        fields,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

/** Any other coded error (409 IDEMPOTENCY_*, 413, 415, 404 …). */
export class ApiErrorException extends HttpException {
  constructor(
    status: number,
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super({ statusCode: status, code, message }, status);
  }
}
