import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { UserType } from '../enums/user.types';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ required: true })
  password: string;

  @Prop({ enum: UserType, required: true })
  type: UserType;

  @Prop({ default: 'default-profile-pic-url' })
  profilePic?: string;

  @Prop()
  otp?: string;

  @Prop()
  otpExpires?: Date;

  @Prop({ default: false })
  isDeleted?: boolean;

  // Method to compare password
  async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  // Method to generate and send OTP
  async generateAndSendOTP(emailService, otpGenerator): Promise<void> {
    const otp = otpGenerator();
    this.otp = otp;
    this.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // expires in 10 minutes
    await emailService.sendOtp(this.email, otp);
    await this.save();
  }
}

// Create the schema for the User class
export const UserSchema = SchemaFactory.createForClass(User);

// Pre-save hook to hash password before saving
UserSchema.pre('save', async function (next) {
  if (this.isModified('password') || this.isNew) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});
