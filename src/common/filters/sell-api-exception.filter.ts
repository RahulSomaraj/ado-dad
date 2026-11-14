import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  ApiErrorCode,
  ApiErrorException,
  FieldErrors,
  FieldValidationException,
  VALIDATION_FAILED_MESSAGE,
} from '../errors/api-errors';
import { fieldCopy } from '../errors/field-copy';

/**
 * Scoped (NOT global) error envelope for the sell flow: GET /v2/sell/config,
 * /v2/media/*, POST /v2/ads. Apply with @UseFilters(SellApiExceptionFilter).
 *
 *   { statusCode, code, message, fields? , traceId? }
 *
 * - class-validator 400 arrays and FieldValidationException → 422 VALIDATION_FAILED
 * - SuspensionGuard 403 → ACCOUNT_SUSPENDED (message = guard reason)
 * - 5xx → INTERNAL with a traceId that is also logged. Request bodies are never logged.
 */
@Catch()
export class SellApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('SellApi');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res: any = ctx.getResponse();
    const req: any = ctx.getRequest();

    const body = this.toBody(exception, req);
    if (res.headersSent) return;
    res.status(body.statusCode).json(body);
  }

  /** Exposed for unit tests. */
  toBody(exception: unknown, req?: any): Record<string, any> {
    if (exception instanceof FieldValidationException) {
      return {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        code: ApiErrorCode.VALIDATION_FAILED,
        message: exception.message || VALIDATION_FAILED_MESSAGE,
        fields: exception.fields,
      };
    }
    if (exception instanceof ApiErrorException) {
      const r: any = exception.getResponse();
      return {
        statusCode: exception.getStatus(),
        code: exception.code,
        message: r?.message ?? exception.message,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const r: any = exception.getResponse();
      const rawMessage = typeof r === 'string' ? r : r?.message;

      if (status === HttpStatus.BAD_REQUEST && Array.isArray(rawMessage)) {
        return {
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          code: ApiErrorCode.VALIDATION_FAILED,
          message: VALIDATION_FAILED_MESSAGE,
          fields: validatorMessagesToFields(rawMessage),
        };
      }

      if (status >= 500) {
        return this.internal(exception, req, status);
      }

      const message = Array.isArray(rawMessage)
        ? rawMessage.join(', ')
        : String(rawMessage ?? exception.message);
      return { statusCode: status, code: codeForStatus(status, message), message };
    }

    return this.internal(exception, req, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  private internal(exception: unknown, req: any, status: number) {
    const traceId = uuidv4();
    const err = exception as Error;
    // Method + path only: bodies can carry phone numbers and addresses.
    this.logger.error(
      `[${traceId}] ${req?.method ?? '?'} ${String(req?.originalUrl ?? req?.url ?? '?').split('?')[0]} → ${err?.name ?? 'Error'}: ${err?.message ?? String(exception)}`,
      err?.stack,
    );
    return {
      statusCode: status,
      code: ApiErrorCode.INTERNAL,
      message: 'Something went wrong. Please try again.',
      traceId,
    };
  }
}

function codeForStatus(status: number, message: string): ApiErrorCode {
  switch (status) {
    case 400:
      return ApiErrorCode.BAD_REQUEST;
    case 401:
      return ApiErrorCode.UNAUTHORIZED;
    case 403:
      // SuspensionGuard is the only 403 on these routes that talks about the
      // account; RolesGuard's "Forbidden resource" stays FORBIDDEN.
      return /suspend|banned/i.test(message)
        ? ApiErrorCode.ACCOUNT_SUSPENDED
        : ApiErrorCode.FORBIDDEN;
    case 404:
      return ApiErrorCode.NOT_FOUND;
    case 409:
      return ApiErrorCode.CONFLICT;
    case 413:
      return ApiErrorCode.FILE_TOO_LARGE;
    case 415:
      return ApiErrorCode.UNSUPPORTED_MEDIA_TYPE;
    case 422:
      return ApiErrorCode.VALIDATION_FAILED;
    case 429:
      return ApiErrorCode.RATE_LIMITED;
    default:
      return ApiErrorCode.BAD_REQUEST;
  }
}

/**
 * "data.price must not be less than 0"          → data.price
 * "data.each value in images must be a string"  → data.images
 * "vehicle.year must be a number …"             → vehicle.year
 * First message per field wins; curated copy replaces the raw text when known.
 */
export function validatorMessagesToFields(messages: unknown[]): FieldErrors {
  const fields: FieldErrors = {};
  for (const m of messages) {
    if (typeof m !== 'string' || !m.trim()) continue;
    let key: string;
    let rest: string;
    const each = /^((?:[\w-]+\.)*)each value in ([\w-]+)\s+(.*)$/.exec(m);
    if (each) {
      key = `${each[1]}${each[2]}`;
      rest = each[3];
    } else {
      const idx = m.indexOf(' ');
      key = idx === -1 ? m : m.slice(0, idx);
      rest = idx === -1 ? '' : m.slice(idx + 1);
    }
    // Drop array indices: data.images.3 → data.images
    key = key
      .split('.')
      .filter((seg) => !/^\d+$/.test(seg))
      .join('.');
    if (!key || fields[key]) continue;
    fields[key] = fieldCopy(key) ?? humanise(key, rest);
  }
  return fields;
}

function humanise(key: string, rest: string): string {
  const leaf = key.split('.').pop() || key;
  const label = leaf
    .replace(/Id$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();
  const text = `${label.charAt(0).toUpperCase()}${label.slice(1)} ${rest}`.trim();
  return text;
}
