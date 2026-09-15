import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../shared/redis.service';
import { AUTH_THROTTLE_KEY, ThrottleOptions } from './auth-throttle.guard';

/**
 * Per-user variant of AuthThrottleGuard for routes decorated with
 * `@Throttle({ ..., by: 'user' })`. The global AuthThrottleGuard runs before
 * route guards (no `req.user` yet) and skips these routes, so this guard must
 * be listed AFTER JwtAuthGuard: `@UseGuards(JwtAuthGuard, UserThrottleGuard)`.
 *
 * Keyed by user id rather than IP because mobile carriers put many users
 * behind one CGNAT address. Falls back to IP when unauthenticated. Fails open
 * on Redis errors, like AuthThrottleGuard.
 */
@Injectable()
export class UserThrottleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const opts = this.reflector.getAllAndOverride<ThrottleOptions>(
      AUTH_THROTTLE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!opts || opts.by !== 'user') return true;

    const req: any = context.switchToHttp().getRequest();
    if (!req) return true;

    const userId: string | undefined = req.user?.id;
    let subject: string;
    if (userId) {
      subject = `u:${String(userId)}`;
    } else {
      const fwd = req.headers?.['x-forwarded-for'];
      subject = `ip:${
        (typeof fwd === 'string' ? fwd.split(',')[0].trim() : undefined) ||
        req.ip ||
        'unknown'
      }`;
    }
    const key = `ratelimit:${opts.name || 'user'}:${subject}`;

    let count: number;
    try {
      count = await this.redis.incrementRateLimit(key, opts.ttl);
    } catch {
      return true; // fail open
    }
    if (typeof count === 'number' && count > opts.limit) {
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
