import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UploadModule } from '../shared/upload.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { SuspensionGuard } from '../moderation/guards/suspension.guard';
import { UserThrottleGuard } from '../common/guards/user-throttle.guard';
import { Media, MediaSchema } from './schemas/media.schema';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaCleanupService } from './media-cleanup.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Media.name, schema: MediaSchema },
      { name: User.name, schema: UserSchema }, // SuspensionGuard
    ]),
    UploadModule, // S3Service
  ],
  controllers: [MediaController],
  providers: [
    MediaService,
    MediaCleanupService,
    SuspensionGuard,
    UserThrottleGuard,
  ],
  exports: [MediaService],
})
export class MediaModule {}
