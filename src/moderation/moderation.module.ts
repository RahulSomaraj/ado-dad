import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

import { User, UserSchema } from '../users/schemas/user.schema';
import { Ad, AdSchema } from '../ads/schemas/ad.schema';
import {
  UserReport,
  UserReportSchema,
} from '../users/schemas/user-report.schema';
import { UserStrike, UserStrikeSchema } from './schemas/user-strike.schema';
import { Suspension, SuspensionSchema } from './schemas/suspension.schema';
import {
  AdminActionLog,
  AdminActionLogSchema,
} from './schemas/admin-action-log.schema';
import {
  ModerationSettings,
  ModerationSettingsSchema,
} from './schemas/moderation-settings.schema';
import { Appeal, AppealSchema } from './schemas/appeal.schema';

import { FcmModule } from '../notifications/fcm/fcm.module';
import { EmailService } from '../utils/email.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Ad.name, schema: AdSchema },
      { name: UserReport.name, schema: UserReportSchema },
      { name: UserStrike.name, schema: UserStrikeSchema },
      { name: Suspension.name, schema: SuspensionSchema },
      { name: AdminActionLog.name, schema: AdminActionLogSchema },
      { name: ModerationSettings.name, schema: ModerationSettingsSchema },
      { name: Appeal.name, schema: AppealSchema },
    ]),
    FcmModule,
  ],
  controllers: [ModerationController],
  providers: [ModerationService, EmailService],
  exports: [ModerationService, MongooseModule],
})
export class ModerationModule {}
