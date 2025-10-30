import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './schemas/user.schema';
import { EmailService } from '../utils/email.service';
import { S3Service } from '../shared/s3.service';
import { RedisService } from '../shared/redis.service';
import {
  AuthTokens,
  AuthTokensSchema,
} from '../auth/schemas/schema.refresh-token';
import { AdSchema } from 'src/ads/schemas/ad.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Ad', schema: AdSchema },
      { name: AuthTokens.name, schema: AuthTokensSchema },
    ]),
  ],
  providers: [UsersService, EmailService, S3Service, RedisService],
  controllers: [UsersController],
})
export class UsersModule {}
