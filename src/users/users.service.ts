import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { EmailService } from '../utils/email.service';
import { generateOTP } from '../utils/otp-generator';
import { EncryptionUtil } from '../common/encryption.util';
import { GetUsersDto } from './dto/get-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('User') private userModel: Model<User>,
    private emailService: EmailService,
  ) {}

  // Get all users with pagination and filters
  async getAllUsers(getUsersDto: GetUsersDto) {
    const { page = 1, limit = 10, search } = getUsersDto;

    // Build query with filters and ensure `isDeleted: false`
    const query: any = { isDeleted: false };

    // If a search term is provided, add it to the query
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } }, // Case-insensitive search
        { email: { $regex: search, $options: 'i' } }, // Extendable to more fields
      ];
    }

    console.log('Query:', query);

    // Fetch paginated users
    const users = await this.userModel
      .find(query)
      .skip((page - 1) * limit) // ✅ Ensure correct pagination logic
      .limit(limit)
      .exec();

    // Count total documents that match the query
    const count = await this.userModel.countDocuments(query);

    return {
      users,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    };
  }

  // Get user by ID
  async getUserById(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user || user.isDeleted)
      throw new NotFoundException('User not found or deleted');
    return user;
  }

  // Create a new user
  async createUser(userData: any): Promise<User> {
    if (userData.password) {
      userData.password = await EncryptionUtil.hashPassword(userData.password);
    }
    if (userData.ssn) {
      userData.ssn = EncryptionUtil.encrypt(userData.ssn);
    }
    const newUser = new this.userModel(userData);
    return newUser.save();
  }

  // Update user details
  async updateUser(id: string, updateData: any): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user || user.isDeleted)
      throw new NotFoundException('User not found or deleted');

    if (updateData.password) {
      updateData.password = await EncryptionUtil.hashPassword(
        updateData.password,
      );
    }

    if (updateData.ssn) {
      updateData.ssn = EncryptionUtil.encrypt(updateData.ssn);
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    return updatedUser!;
  }

  // Soft delete user
  async deleteUser(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    user.isDeleted = true;
    await user.save();
    return user;
  }

  // Send OTP via email
  async sendOTP(email: string): Promise<void> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) throw new NotFoundException('User not found');

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60000); // OTP expires in 10 minutes
    await user.save();

    await this.emailService.sendOtp(user.email, otp);
  }

  // Verify OTP
  async verifyOTP(email: string, otp: string): Promise<string> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) throw new NotFoundException('User not found');

    if (user.otp !== otp) throw new BadRequestException('Invalid OTP');

    if (!user.otpExpires || user.otpExpires < new Date()) {
      throw new BadRequestException('OTP expired');
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    return 'OTP verified successfully';
  }

  // Decrypt sensitive user data (e.g., SSN)
  async getDecryptedUser(id: string): Promise<any> {
    const user = await this.userModel.findById(id).exec();
    if (!user || user.isDeleted)
      throw new NotFoundException('User not found or deleted');

    return {
      ...user.toObject(),
      ssn: user.ssn ? EncryptionUtil.decrypt(user.ssn) : null,
    };
  }
}
