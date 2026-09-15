import { HttpException, HttpStatus } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

/** Stable, client-facing error codes. The app maps these to copy; never show raw messages. */
export enum ChatErrorCode {
  VALIDATION = 'VALIDATION',
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  SUSPENDED = 'SUSPENDED',
  NOT_PARTICIPANT = 'NOT_PARTICIPANT',
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  AD_NOT_FOUND = 'AD_NOT_FOUND',
  AD_UNAVAILABLE = 'AD_UNAVAILABLE',
  ROOM_CLOSED = 'ROOM_CLOSED',
  CONTENT_BLOCKED = 'CONTENT_BLOCKED',
  ATTACHMENT_INVALID = 'ATTACHMENT_INVALID',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL = 'INTERNAL',
}

const STATUS: Record<ChatErrorCode, number> = {
  [ChatErrorCode.VALIDATION]: HttpStatus.BAD_REQUEST,
  [ChatErrorCode.UNAUTHORIZED]: HttpStatus.UNAUTHORIZED,
  [ChatErrorCode.TOKEN_EXPIRED]: HttpStatus.UNAUTHORIZED,
  [ChatErrorCode.SUSPENDED]: HttpStatus.FORBIDDEN,
  [ChatErrorCode.NOT_PARTICIPANT]: HttpStatus.FORBIDDEN,
  [ChatErrorCode.ROOM_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ChatErrorCode.AD_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ChatErrorCode.AD_UNAVAILABLE]: HttpStatus.CONFLICT,
  [ChatErrorCode.ROOM_CLOSED]: HttpStatus.CONFLICT,
  [ChatErrorCode.CONTENT_BLOCKED]: HttpStatus.UNPROCESSABLE_ENTITY,
  [ChatErrorCode.ATTACHMENT_INVALID]: HttpStatus.BAD_REQUEST,
  [ChatErrorCode.RATE_LIMITED]: HttpStatus.TOO_MANY_REQUESTS,
  [ChatErrorCode.INTERNAL]: HttpStatus.INTERNAL_SERVER_ERROR,
};

export class ChatError extends HttpException {
  constructor(
    public readonly code: ChatErrorCode,
    message: string,
  ) {
    super({ success: false, code, message, statusCode: STATUS[code] }, STATUS[code]);
  }
}

/** Normalises anything thrown into `{ success:false, code, error }` for socket acks. */
export function toAckError(err: unknown): { success: false; code: ChatErrorCode; error: string } {
  if (err instanceof ChatError) {
    return { success: false, code: err.code, error: err.message };
  }
  if (err instanceof HttpException) {
    const status = err.getStatus();
    const res: any = err.getResponse();
    const raw = typeof res === 'string' ? res : res?.message;
    const message = Array.isArray(raw) ? raw.join(', ') : String(raw ?? err.message);
    const code =
      status === 400
        ? ChatErrorCode.VALIDATION
        : status === 401
          ? ChatErrorCode.UNAUTHORIZED
          : status === 403
            ? ChatErrorCode.NOT_PARTICIPANT
            : status === 404
              ? ChatErrorCode.ROOM_NOT_FOUND
              : status === 429
                ? ChatErrorCode.RATE_LIMITED
                : ChatErrorCode.INTERNAL;
    return { success: false, code, error: message };
  }
  if (err instanceof WsException) {
    const e: any = err.getError();
    if (e && typeof e === 'object' && e.code) {
      return { success: false, code: e.code, error: String(e.message ?? 'Invalid request') };
    }
    return { success: false, code: ChatErrorCode.VALIDATION, error: String(e ?? 'Invalid request') };
  }
  return { success: false, code: ChatErrorCode.INTERNAL, error: 'Something went wrong' };
}
