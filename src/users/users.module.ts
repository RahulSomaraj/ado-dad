import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './schemas/user.schema';
import { EmailService } from '../utils/email.service';
import { S3Service } from '../shared/s3.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]), // Register User schema here
  ],
  providers: [UsersService, EmailService, S3Service], // Add S3Service
  controllers: [UsersController],
})
export class UsersModule {}
