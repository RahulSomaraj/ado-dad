import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './schemas/user.schema';
import { EmailService } from '../utils/email.service';
import { S3Service } from '../shared/s3.service';
import { RedisService } from '../shared/redis.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]), // Register User schema here
  ],
  providers: [UsersService, EmailService, S3Service, RedisService], // Add S3Service and Redis
  controllers: [UsersController],
})
export class UsersModule {}
