import { Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ModerationStatus } from '../../users/schemas/user.schema';

/**
 * Optional authentication for public read endpoints.
 *
 * Runs the same `jwt` passport strategy as {@link JwtAuthGuard} — so the token
 * signature, expiry and the *existence of the user* are all verified through
 * one pipeline — but resolves to an anonymous request instead of throwing when
 * the caller sends no token, an expired token, or a token for a deleted user.
 *
 * P0-6: replaces the hand-rolled `extractUserIdFromToken()` that used to sit in
 * `AdsV2Controller`, which called `jwtService.verify()` directly and therefore
 * skipped the user-existence and moderation checks entirely.
 *
 * Suspended and banned accounts are downgraded to anonymous rather than
 * rejected: these are public read routes, so the request still succeeds, it
 * just loses personalisation (`isFavorite`). Mutating routes keep using
 * `JwtAuthGuard` + `SuspensionGuard`, which reject outright.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(OptionalJwtAuthGuard.name);

  handleRequest(err: any, user: any): any {
    if (err || !user) {
      return null;
    }

    if (user.moderationStatus === ModerationStatus.BANNED) {
      this.logger.warn(`Banned user ${user.id} treated as anonymous`);
      return null;
    }

    if (user.moderationStatus === ModerationStatus.SUSPENDED) {
      const expired =
        user.suspendedUntil &&
        new Date(user.suspendedUntil).getTime() <= Date.now();
      if (!expired) {
        this.logger.warn(`Suspended user ${user.id} treated as anonymous`);
        return null;
      }
    }

    return user;
  }
}
