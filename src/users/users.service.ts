import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';  // Import the User schema
import { EmailService } from '../utils/email.service';
import { generateOTP } from '../utils/otp-generator';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('User') private userModel: Model<User>,  // Inject the model by name 'User'
    private emailService: EmailService,
  ) {}

  async getAllUsers(page: number, limit: number, filters: any) {
    const query = { ...filters, isDeleted: false };
    const users = await this.userModel
      .find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
    const count = await this.userModel.countDocuments(query);
    return { users, totalPages: Math.ceil(count / limit), currentPage: page };
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user || user.isDeleted) throw new Error('User not found or deleted');
    return user;
  }

  async createUser(userData: any): Promise<User> {
    const newUser = new this.userModel(userData);
    return newUser.save();
  }

  async updateUser(id: string, updateData: any): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user || user.isDeleted) throw new Error('User not found or deleted');
    // Cast user as User type to satisfy TypeScript
    const updatedUser = await this.userModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
    return updatedUser!;
  }
  

  async deleteUser(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new Error('User not found');
    user.isDeleted = true;
    await user.save();
    return user;
  }

  // Send OTP to a user via email
  async sendOTP(email: string): Promise<void> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) throw new Error('User not found');
    
    // Call the generateAndSendOTP method from the schema to generate OTP and send email
    await user.generateAndSendOTP(this.emailService, generateOTP);
  }

  // Verify the OTP
  async verifyOTP(email: string, otp: string): Promise<string> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) throw new Error('User not found');
    
    // Check if OTP matches
    if (user.otp !== otp) throw new Error('Invalid OTP');
    
    // Check if OTP expired (making sure otpExpires is defined)
    if (!user.otpExpires || user.otpExpires < new Date()) {
      throw new Error('OTP expired');
    }
    
    // Clear OTP and expiration date after verification
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    return 'OTP verified successfully';
  }
  
}
