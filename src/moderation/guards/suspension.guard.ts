import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, ModerationStatus } from '../../users/schemas/user.schema';

/**
 * Blocks suspended/banned users from mutating actions (create/edit/boost ads).
 * Apply AFTER JwtAuthGuard so `req.user` is populated. Reads the user's current
 * moderation status from the DB (the JWT is not re-issued on suspension).
 *
 * Lazy expiry: if a temporary suspension's end date has passed, the user is
 * treated as active (and the denormalized status is corrected best-effort).
 */
@Injectable()
export class SuspensionGuard implements CanActivate {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id;
    if (!userId) return true; // auth guard handles unauthenticated requests

    const user = await this.userModel
      .findById(userId)
      .select('moderationStatus suspendedUntil')
      .lean();
    if (!user) return true;

    if (user.moderationStatus === ModerationStatus.BANNED) {
      throw new ForbiddenException(
        'Your account is permanently banned and cannot perform this action.',
      );
    }

    if (user.moderationStatus === ModerationStatus.SUSPENDED) {
      const expired =
        user.suspendedUntil &&
        new Date(user.suspendedUntil).getTime() <= Date.now();
      if (expired) {
        // Suspension elapsed — correct the denormalized status and allow.
        await this.userModel
          .findByIdAndUpdate(userId, {
            $set: { moderationStatus: ModerationStatus.ACTIVE },
            $unset: { suspendedUntil: '' },
          })
          .exec()
          .catch(() => undefined);
        return true;
      }
      throw new ForbiddenException(
        'Your account is suspended. You cannot create, edit or boost ads until the suspension ends.',
      );
    }

    return true;
  }
}
