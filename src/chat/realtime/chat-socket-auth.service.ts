import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import { getJwtSecret } from '../../common/jwt-secret.util';
import { ModerationStatus, User } from '../../users/schemas/user.schema';
import { ChatErrorCode } from '../chat-errors';

export interface SocketUser {
  id: string;
  type?: string;
  /** Token expiry, epoch seconds. */
  exp?: number;
}

export type SocketAuthResult =
  | { ok: true; user: SocketUser }
  | { ok: false; code: ChatErrorCode.UNAUTHORIZED | ChatErrorCode.TOKEN_EXPIRED | ChatErrorCode.SUSPENDED };

/**
 * Authenticates a socket ONCE at handshake: verifies the access token with the
 * same secret/issuer/audience as the HTTP JwtStrategy and checks the account is
 * usable. Per-event checks only look at the cached expiry (see ChatGateway).
 */
@Injectable()
export class ChatSocketAuthService {
  private readonly logger = new Logger(ChatSocketAuthService.name);

  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  extractToken(client: Socket): string | null {
    const raw =
      client.handshake?.auth?.token ??
      client.handshake?.headers?.authorization ??
      client.handshake?.query?.token;
    if (!raw) return null;
    const token = String(Array.isArray(raw) ? raw[0] : raw)
      .replace(/^Bearer\s+/i, '')
      .trim();
    return token || null;
  }

  async authenticate(client: Socket): Promise<SocketAuthResult> {
    const token = this.extractToken(client);
    if (!token) return { ok: false, code: ChatErrorCode.UNAUTHORIZED };

    let payload: any;
    try {
      payload = jwt.verify(token, getJwtSecret(), {
        algorithms: ['HS256'],
        issuer: 'ado-dad-api',
        audience: 'ado-dad-users',
      });
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return { ok: false, code: ChatErrorCode.TOKEN_EXPIRED };
      }
      return { ok: false, code: ChatErrorCode.UNAUTHORIZED };
    }

    const userId = String(payload?.id ?? payload?.sub ?? '');
    if (!Types.ObjectId.isValid(userId)) {
      return { ok: false, code: ChatErrorCode.UNAUTHORIZED };
    }

    const status = await this.accountStatus(userId);
    if (status !== 'ok') {
      return {
        ok: false,
        code: status === 'missing' ? ChatErrorCode.UNAUTHORIZED : ChatErrorCode.SUSPENDED,
      };
    }

    return {
      ok: true,
      user: { id: userId, type: payload.userType ?? payload.type, exp: payload.exp },
    };
  }

  /** 'ok' | 'missing' (deleted/unknown) | 'blocked' (banned or currently suspended). */
  async accountStatus(userId: string): Promise<'ok' | 'missing' | 'blocked'> {
    const user = await this.userModel
      .findById(userId)
      .select('isDeleted moderationStatus suspendedUntil')
      .lean<{ isDeleted?: boolean; moderationStatus?: ModerationStatus; suspendedUntil?: Date }>()
      .exec();
    if (!user || user.isDeleted) return 'missing';
    if (user.moderationStatus === ModerationStatus.BANNED) return 'blocked';
    if (user.moderationStatus === ModerationStatus.SUSPENDED) {
      const elapsed = user.suspendedUntil && new Date(user.suspendedUntil).getTime() <= Date.now();
      return elapsed ? 'ok' : 'blocked';
    }
    return 'ok';
  }

  isExpired(user: SocketUser | undefined, nowMs = Date.now()): boolean {
    return !!user?.exp && user.exp * 1000 <= nowMs;
  }
}
