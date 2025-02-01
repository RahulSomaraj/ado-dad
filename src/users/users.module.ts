import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './schemas/user.schema';
import { EmailService } from '../utils/email.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),  // Register User schema here
  ],
  providers: [UsersService, EmailService],  // Make sure the email service is added
  controllers: [UsersController],
})
export class UsersModule {}
