import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../shared/redis.service';

export interface ThrottleOptions {
  limit: number; // max requests within the window
  ttl: number; // window in seconds
  keyFields?: string[]; // body fields to include in the bucket key (e.g. username/email)
  name?: string; // logical bucket name
}

export const AUTH_THROTTLE_KEY = 'authThrottle';
export const Throttle = (options: ThrottleOptions) =>
  SetMetadata(AUTH_THROTTLE_KEY, options);

/**
 * Redis-backed brute-force throttle. Registered globally as an APP_GUARD but
 * only acts on routes decorated with @Throttle(). Fails open on Redis errors
 * so an outage cannot lock users out.
 */
@Injectable()
export class AuthThrottleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const opts = this.reflector.getAllAndOverride<ThrottleOptions>(
      AUTH_THROTTLE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!opts) return true;

    const req: any = context.switchToHttp().getRequest();
    if (!req) return true;

    const fwd = req.headers?.['x-forwarded-for'];
    const ip =
      (typeof fwd === 'string' ? fwd.split(',')[0].trim() : undefined) ||
      req.ip ||
      req.socket?.remoteAddress ||
      'unknown';

    const parts = [opts.name || 'auth', ip];
    for (const f of opts.keyFields || []) {
      const v = req.body?.[f];
      if (v) parts.push(String(v).toLowerCase().slice(0, 128));
    }
    const key = `ratelimit:${parts.join(':')}`;

    let count: number;
    try {
      count = await this.redis.incrementRateLimit(key, opts.ttl);
    } catch {
      return true; // fail open
    }
    if (count > opts.limit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: 'Too many attempts. Please try again later.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
