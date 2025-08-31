import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { User } from './schemas/user.schema';
import { EmailService } from '../utils/email.service';
import { generateOTP } from '../utils/otp-generator';
import { EncryptionUtil } from '../common/encryption.util';
import { AuthTokens } from '../auth/schemas/schema.refresh-token';
import { GetUsersDto, UserResponseDto } from './dto/get-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UserType } from './enums/user.types';
import { RedisService } from '../shared/redis.service';

interface PaginatedUsersResponse {
  users: Partial<User>[];
  totalPages: number;
  currentPage: number;
  totalUsers: number;
  hasNext: boolean;
  hasPrev: boolean;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    @InjectModel(AuthTokens.name) private readonly authTokenModel: Model<AuthTokens>,
  ) {}

  /**
   * Get all users with pagination, filtering, and sorting
   */
  async getAllUsers(
    getUsersDto: GetUsersDto,
    currentUser: User,
  ): Promise<PaginatedUsersResponse> {
    try {
      const cacheKey = `users:list:${JSON.stringify({ getUsersDto, uid: currentUser?._id || currentUser?.id })}`;
      const cached =
        await this.redisService.cacheGet<PaginatedUsersResponse>(cacheKey);
      if (cached) return cached;
      const { page = 1, limit = 10, search, type, sort } = getUsersDto;

      // Validate pagination parameters
      const validatedPage = Math.max(1, page);
      const validatedLimit = Math.min(Math.max(1, limit), 100); // Max 100 users per page

      // Build query with filters
      const query: any = { isDeleted: { $ne: true } };

      // Add search functionality
      if (search?.trim()) {
        query.$text = { $search: search.trim() } as any;
      }


      // Apply role-based filtering
      if (currentUser.type === UserType.SUPER_ADMIN) {
        query.type = {
          $in: [UserType.ADMIN, UserType.USER, UserType.SHOWROOM],
        };
      }

      // Apply type filter if provided
      if (type) {
        query.type = type;
      }

      // Build sort options
      const sortOptions = this.buildSortOptions(sort);

      // Execute query with pagination
      const [users, totalUsers] = await Promise.all([
        this.userModel
          .find(query)
          .sort(sortOptions)
          .skip((validatedPage - 1) * validatedLimit)
          .limit(validatedLimit)
          .select('_id name email type phoneNumber profilePic createdAt')
          .lean()
          .exec(),
        this.userModel.countDocuments(query).exec(),
      ]);

      const totalPages = Math.ceil(totalUsers / validatedLimit);

      this.logger.debug(
        `Retrieved ${users.length} users out of ${totalUsers} total`,
      );

      const response: PaginatedUsersResponse = {
        users,
        totalPages,
        currentPage: validatedPage,
        totalUsers,
        hasNext: validatedPage < totalPages,
        hasPrev: validatedPage > 1,
      };
      await this.redisService.cacheSet(cacheKey, response, 300);
      return response;
    } catch (error) {
      this.logger.error('Failed to get users:', error);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to retrieve users',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<Partial<User>> {
    try {
      const cacheKey = `users:byId:${id}`;
      const cached = await this.redisService.cacheGet<Partial<User>>(cacheKey);
      if (cached) return cached;
      if (!this.isValidObjectId(id)) {
        throw new BadRequestException('Invalid user ID format');
      }

      const user = await this.userModel
        .findById(id)
        .select('_id name email type phoneNumber profilePic createdAt')
        .lean()
        .exec();

      if (!user || user.isDeleted) {
        throw new NotFoundException('User not found or deleted');
      }

      await this.redisService.cacheSet(cacheKey, user, 600);
      return user;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Failed to get user by ID ${id}:`, error);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to retrieve user',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserDto): Promise<UserResponseDto> {
    try {
      this.logger.log(`Creating new user: ${userData.email}`);

      // Validate input data
      await this.validateUserData(userData);

      // Check for existing users
      await this.checkExistingUser(userData.email, userData.phoneNumber);

      // Create new user
      const newUser = new this.userModel(userData);
      const savedUser = await newUser.save();

      this.logger.log(`User created successfully: ${savedUser.email}`);

      // Return user without sensitive data
      const { password, otp, otpExpires, ...userResponse } =
        savedUser.toObject();
      // Map to UserResponseDto
      const response: UserResponseDto = {
        name: userResponse.name,
        email: userResponse.email,
        phoneNumber: userResponse.phoneNumber,
        type: userResponse.type,
        profilePic: userResponse.profilePic,
        isDeleted: userResponse.isDeleted,
      };
      await this.invalidateUsersListCaches();
      return response;
    } catch (error) {
      this.logger.error(`Failed to create user ${userData.email}:`, error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to create user',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update user details
   */
  async updateUser(
    id: string,
    updateData: UpdateUserDto,
  ): Promise<Partial<User>> {
    try {
      if (!this.isValidObjectId(id)) {
        throw new BadRequestException('Invalid user ID format');
      }

      this.logger.log(`Updating user: ${id}`);

      // Check if user exists
      const existingUser = await this.userModel.findById(id).exec();
      if (!existingUser || existingUser.isDeleted) {
        throw new NotFoundException('User not found or deleted');
      }

      // Validate update data
      if (updateData.email || updateData.phoneNumber) {
        await this.checkExistingUserForUpdate(
          id,
          updateData.email,
          updateData.phoneNumber,
        );
      }

      // Update user
      const updatedUser = await this.userModel
        .findByIdAndUpdate(id, updateData, {
          new: true,
          runValidators: true,
          select: '_id name email type phoneNumber profilePic updatedAt',
        })
        .exec();

      if (!updatedUser) {
        throw new NotFoundException('User not found');
      }

      this.logger.log(`User updated successfully: ${updatedUser.email}`);

      await this.redisService.cacheDel(`users:byId:${id}`);
      await this.invalidateUsersListCaches();
      return updatedUser;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Failed to update user ${id}:`, error);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to update user',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Soft delete user
   */
  async deleteUser(id: string): Promise<{ message: string }> {
    try {
      if (!this.isValidObjectId(id)) {
        throw new BadRequestException('Invalid user ID format');
      }

      this.logger.log(`Soft deleting user: ${id}`);

      const user = await this.userModel.findById(id).exec();
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.isDeleted) {
        throw new BadRequestException('User is already deleted');
      }

      user.isDeleted = true;
      await user.save();

      this.logger.log(`User soft deleted successfully: ${user.email}`);

      await this.redisService.cacheDel(`users:byId:${id}`);
      await this.invalidateUsersListCaches();
      return { message: 'User deleted successfully' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Failed to delete user ${id}:`, error);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to delete user',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Send OTP via email
   */
  async sendOTP(email: string): Promise<{ message: string }> {
    try {
      this.logger.log(`Sending OTP to: ${email}`);
      // Throttle OTP sends per email (max 5 per 10 minutes)
      try {
        const count = await this.redisService.incrementRateLimit(`send_otp:${email.toLowerCase()}`, 600);
        if (count > 5) {
          throw new BadRequestException('Too many OTP requests. Please try again later.');
        }
      } catch (e) {
        // If Redis unavailable, continue without rate limit
        this.logger.warn('Rate limit check failed (Redis down?)');
      }


      const user = await this.userModel
        .findOne({
          email: email.toLowerCase(),
          isDeleted: { $ne: true },
        })
        .exec();

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await this.userModel.updateOne(
        { _id: user._id },
        { $set: { otp, otpExpires } },
      );

      await this.emailService.sendOtp(user.email, otp);

      this.logger.log(`OTP sent successfully to: ${email}`);

      await this.invalidateUsersListCaches();
      return { message: 'OTP sent successfully' };
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${email}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to send OTP',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(email: string, otp: string): Promise<{ message: string }> {
    try {
      this.logger.log(`Verifying OTP for: ${email}`);

      const user = await this.userModel
        .findOne({
          email: email.toLowerCase(),
          otp,
          otpExpires: { $gt: new Date() },
          isDeleted: { $ne: true },
        })
        .exec();

      if (!user) {
        throw new BadRequestException('Invalid OTP or OTP expired');
      }

      // Clear OTP after successful verification
      await this.userModel.updateOne(
        { _id: user._id },
        { $unset: { otp: 1, otpExpires: 1 } },
      );

      this.logger.log(`OTP verified successfully for: ${email}`);

      await this.invalidateUsersListCaches();
      return { message: 'OTP verified successfully' };
    } catch (error) {
      this.logger.error(`Failed to verify OTP for ${email}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to verify OTP',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Utility methods
   */
  private escapeRegex(text: string): string {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  }

  private buildSortOptions(sort?: string): Record<string, 1 | -1> {
    const defaultSort: Record<string, 1 | -1> = { createdAt: -1 };

    if (!sort) return defaultSort;

    const [field, order] = sort.split(':');
    const validFields = ['name', 'email', 'type', 'createdAt', 'updatedAt'];
    const validOrders = ['asc', 'desc'];

    if (!validFields.includes(field) || !validOrders.includes(order)) {
      return defaultSort;
    }

    return { [field]: order === 'asc' ? 1 : -1 };
  }

  private isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  private async validateUserData(userData: CreateUserDto): Promise<void> {
    if (
      !userData.email ||
      !userData.phoneNumber ||
      !userData.name ||
      !userData.password
    ) {
      throw new BadRequestException('All required fields must be provided');
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Phone number validation (basic)
    if (userData.phoneNumber.length < 10) {
      throw new BadRequestException('Invalid phone number');
    }
  }

  private async checkExistingUser(
    email: string,
    phoneNumber: string,
  ): Promise<void> {
    const existingUser = await this.userModel
      .findOne({
        $or: [{ email: email.toLowerCase() }, { phoneNumber }],
        isDeleted: { $ne: true },
      })
      .exec();

    if (existingUser) {
      if (existingUser.email.toLowerCase() === email.toLowerCase()) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'User already exists with this email',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      if (existingUser.phoneNumber === phoneNumber) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'User already exists with this phone number',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  private async checkExistingUserForUpdate(
    userId: string,
    email?: string,
    phoneNumber?: string,
  ): Promise<void> {
    const query: any = {
      _id: { $ne: userId },
      isDeleted: { $ne: true },
    };

    if (email || phoneNumber) {
      query.$or = [];
      if (email) query.$or.push({ email: email.toLowerCase() });
      if (phoneNumber) query.$or.push({ phoneNumber });
    }

    const existingUser = await this.userModel.findOne(query).exec();

    if (existingUser) {
      if (email && existingUser.email.toLowerCase() === email.toLowerCase()) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'User already exists with this email',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      if (phoneNumber && existingUser.phoneNumber === phoneNumber) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'User already exists with this phone number',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  private async invalidateUsersListCaches(): Promise<void> {
    try {
      const keys = await this.redisService.keys('users:list:*');
      if (keys?.length) {
        await Promise.all(keys.map((k) => this.redisService.cacheDel(k)));
      }
    } catch (e) {
      this.logger.warn('Failed to invalidate users list caches', e as any);
    }
  }


  /**
   * Change user password.
   */
  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.userModel.findById(id).exec();
    if (!user || (user as any).isDeleted) {
      throw new NotFoundException('User not found or deleted');
    }
    const ok = await bcrypt.compare(currentPassword, (user as any).password);
    if (!ok) {
      throw new BadRequestException('Current password incorrect');
    }
    this.assertStrongPassword(newPassword);
    (user as any).password = await bcrypt.hash(newPassword, 12);
    await user.save();
    try {
      await this.authTokenModel.deleteMany({ userId: user._id }).exec();
    } catch (e) {
      this.logger.warn('Failed to revoke refresh tokens after password change', e as any);
    }
    await this.redisService.cacheDel(`users:byId:${id}`);
    await this.invalidateUsersListCaches();
    return { message: 'Password changed successfully' };
  }

  private assertStrongPassword(pw: string) {
    if (typeof pw !== 'string' || pw.length < 12) {
      throw new BadRequestException('Password must be at least 12 characters long');
    }
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasDigit = /\d/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    if (!(hasUpper && hasLower && hasDigit && hasSpecial)) {
      throw new BadRequestException('Password must include upper, lower, number, and special character');
    }
  }
}
