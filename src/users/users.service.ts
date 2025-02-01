import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';  
import { EmailService } from '../utils/email.service';
import { generateOTP } from '../utils/otp-generator';
import { EncryptionUtil } from '../common/encryption.util'; // Import Encryption Utility

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('User') private userModel: Model<User>,
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
    // Hash the password before storing it
    if (userData.password) {
      userData.password = await EncryptionUtil.hashPassword(userData.password);
    }
    
    // Encrypt sensitive data (if any)
    if (userData.ssn) {
      userData.ssn = EncryptionUtil.encrypt(userData.ssn);
    }

    const newUser = new this.userModel(userData);
    return newUser.save();
  }

  async updateUser(id: string, updateData: any): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user || user.isDeleted) throw new Error('User not found or deleted');

    // Hash password if it's being updated
    if (updateData.password) {
      updateData.password = await EncryptionUtil.hashPassword(updateData.password);
    }

    // Encrypt sensitive data if it's being updated
    if (updateData.ssn) {
      updateData.ssn = EncryptionUtil.encrypt(updateData.ssn);
    }

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
    
    await user.generateAndSendOTP(this.emailService, generateOTP);
  }

  // Verify the OTP
  async verifyOTP(email: string, otp: string): Promise<string> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) throw new Error('User not found');
    
    if (user.otp !== otp) throw new Error('Invalid OTP');
    
    if (!user.otpExpires || user.otpExpires < new Date()) {
      throw new Error('OTP expired');
    }
    
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    return 'OTP verified successfully';
  }

  // Decrypt sensitive user data (e.g., SSN)
  async getDecryptedUser(id: string): Promise<any> {
    const user = await this.userModel.findById(id).exec();
    if (!user || user.isDeleted) throw new Error('User not found or deleted');

    return {
      ...user.toObject(),
      ssn: user.ssn ? EncryptionUtil.decrypt(user.ssn) : null,
    };
  }
}
