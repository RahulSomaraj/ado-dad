import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserReportController } from './user-report.controller';
import { UserReportService } from './user-report.service';
import { UserReport, UserReportSchema } from './schemas/user-report.schema';
import { User, UserSchema } from './schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserReport.name, schema: UserReportSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [UserReportController],
  providers: [UserReportService],
  exports: [UserReportService],
})
export class UserReportModule {}
