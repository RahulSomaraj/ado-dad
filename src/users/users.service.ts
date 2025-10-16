import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { User } from './schemas/user.schema';
import { EmailService } from '../utils/email.service';
import { generateOTP } from '../utils/otp-generator';
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

  // Cache TTL constants (in seconds)
  private static readonly CACHE_TTL = {
    USER_BY_ID: 300, // 5 minutes for individual user
    USER_LIST: 300, // 5 minutes for user lists
    OTP_RATE_LIMIT: 300, // 5 minutes for OTP rate limiting
  };

  // Cache version for better invalidation
  private cacheVersion = 1;

  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    private readonly emailService: EmailService,
    private readonly redisService: RedisService,
    @InjectModel(AuthTokens.name)
    private readonly authTokenModel: Model<AuthTokens>,
  ) {}

  // Reusable field sets
  private static readonly BASE_PROJECTION =
    '_id name email type phoneNumber profilePic createdAt updatedAt';

  // Deterministic cache key helper
  private key(obj: Record<string, unknown>): string {
    const parts = Object.keys(obj)
      .sort()
      .map((k) => `${k}=${JSON.stringify(obj[k])}`)
      .join('&');
    return `v${this.cacheVersion}:${parts}`;
  }

  /**
   * Get all users with pagination, filtering, and sorting
   */
  async getAllUsers(
    getUsersDto: GetUsersDto,
    currentUser: User,
  ): Promise<PaginatedUsersResponse> {
    try {
      const cacheKey = `users:list:${this.key({
        page: getUsersDto.page ?? 1,
        limit: getUsersDto.limit ?? 10,
        search: (getUsersDto.search || '').trim(),
        type: getUsersDto.type || 'any',
        sort: getUsersDto.sort || 'createdAt:desc',
        uid:
          (currentUser as any)?._id?.toString?.() ||
          (currentUser as any)?.id ||
          'na',
      })}`;
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

      // Role-based visibility (compose with explicit `type` filter if present)
      let allowedTypes: UserType[] | undefined;
      if (currentUser?.type === UserType.SUPER_ADMIN) {
        allowedTypes = undefined; // see all
      } else if (currentUser?.type === UserType.ADMIN) {
        allowedTypes = [UserType.ADMIN, UserType.USER, UserType.SHOWROOM];
      } else {
        allowedTypes = [UserType.USER];
      }
      if (type && allowedTypes) {
        // both role and explicit type → intersection
        if (allowedTypes.includes(type as UserType)) {
          query.type = type;
        } else {
          // empty set → force no results cheaply
          query.type = { $in: [] };
        }
      } else if (!type && allowedTypes) {
        query.type = { $in: allowedTypes };
      } else if (type && !allowedTypes) {
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
          .select(UsersService.BASE_PROJECTION)
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
      await this.redisService.cacheSet(
        cacheKey,
        response,
        UsersService.CACHE_TTL.USER_LIST,
      );
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
      const cacheKey = `users:byId:${this.key({ id })}`;
      const cached = await this.redisService.cacheGet<Partial<User>>(cacheKey);
      if (cached) return cached;
      if (!this.isValidObjectId(id)) {
        throw new BadRequestException('Invalid user ID format');
      }

      // Ensure deleted users are excluded at query-time (bug fix)
      const user = await this.userModel
        .findOne({ _id: id, isDeleted: { $ne: true } })
        .select(UsersService.BASE_PROJECTION)
        .lean()
        .exec();

      if (!user) {
        throw new NotFoundException('User not found or deleted');
      }

      await this.redisService.cacheSet(
        cacheKey,
        user,
        UsersService.CACHE_TTL.USER_BY_ID,
      );
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
        _id: (savedUser as any)._id.toString(),
        name: userResponse.name,
        email: userResponse.email,
        phoneNumber: userResponse.phoneNumber,
        type: userResponse.type,
        profilePic: userResponse.profilePic,
        isDeleted: userResponse.isDeleted,
      };

      // Cache the newly created user and invalidate list caches
      await this.redisService.cacheSet(
        `users:byId:${this.key({ id: (savedUser as any)._id.toString() })}`,
        response,
        UsersService.CACHE_TTL.USER_BY_ID,
      );
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

      // Handle password change specially to ensure it gets hashed
      if (updateData.password) {
        this.assertStrongPassword(updateData.password);
        // Use save() method to trigger pre-save hook for password hashing
        existingUser.password = updateData.password;
        await existingUser.save();

        // Remove password from updateData to avoid double processing
        const { password, ...updateDataWithoutPassword } = updateData;

        // Update other fields if any
        if (Object.keys(updateDataWithoutPassword).length > 0) {
          await this.userModel
            .findByIdAndUpdate(id, updateDataWithoutPassword, {
              new: true,
              runValidators: true,
            })
            .exec();
        }

        // Fetch updated user without password field
        const updatedUser = await this.userModel
          .findById(id)
          .select('_id name email type phoneNumber profilePic updatedAt')
          .exec();

        if (!updatedUser) {
          throw new NotFoundException('User not found');
        }

        this.logger.log(`User updated successfully: ${updatedUser.email}`);
        await this.redisService.cacheDel(`users:byId:${this.key({ id })}`);
        await this.invalidateUsersListCaches();
        return updatedUser;
      }

      // Update user (no password change)
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

      await this.redisService.cacheDel(`users:byId:${this.key({ id })}`);
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

      await this.redisService.cacheDel(`users:byId:${this.key({ id })}`);
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
        const count = await this.redisService.incrementRateLimit(
          `send_otp:${email.toLowerCase()}`,
          UsersService.CACHE_TTL.OTP_RATE_LIMIT,
        );
        if (count > 5) {
          throw new BadRequestException(
            'Too many OTP requests. Please try again later.',
          );
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
    return Types.ObjectId.isValid(id);
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

    const ors: any[] = [];
    if (email) ors.push({ email: email.toLowerCase() });
    if (phoneNumber) ors.push({ phoneNumber });
    if (ors.length > 0) query.$or = ors;

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
      // Increment cache version to invalidate all cached data
      this.cacheVersion++;
      this.logger.debug(`Cache version incremented to ${this.cacheVersion}`);

      // Also clear existing keys for immediate invalidation
      const keys = await this.redisService.keys('users:list:*');
      if (keys?.length) {
        await Promise.all(keys.map((k) => this.redisService.cacheDel(k)));
      }
    } catch (e) {
      this.logger.warn('Failed to invalidate users list caches', e as any);
    }
  }

  /**
   * Get current cache version
   */
  getCacheVersion(): number {
    return this.cacheVersion;
  }

  /**
   * Force cache invalidation by incrementing version
   */
  async forceCacheInvalidation(): Promise<{
    message: string;
    newVersion: number;
  }> {
    this.cacheVersion++;
    this.logger.log(
      `Forced cache invalidation. New version: ${this.cacheVersion}`,
    );

    // Clear all user-related caches
    try {
      const userKeys = await this.redisService.keys('users:*');
      if (userKeys?.length) {
        await Promise.all(userKeys.map((k) => this.redisService.cacheDel(k)));
      }
    } catch (e) {
      this.logger.warn(
        'Failed to clear user caches during forced invalidation',
        e as any,
      );
    }

    return {
      message: 'Cache invalidation completed',
      newVersion: this.cacheVersion,
    };
  }

  /**
   * Change user password.
   */
  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.userModel.findById(id).exec();
    if (!user || (user as any).isDeleted) {
      throw new NotFoundException('User not found or deleted');
    }
    const ok = await bcrypt.compare(currentPassword, (user as any).password);
    if (!ok) {
      throw new BadRequestException('Current password incorrect');
    }
    this.assertStrongPassword(newPassword);
    // Set plain text password - the pre-save hook will handle hashing
    (user as any).password = newPassword;
    await user.save();
    try {
      await this.authTokenModel.deleteMany({ userId: user._id }).exec();
    } catch (e) {
      this.logger.warn(
        'Failed to revoke refresh tokens after password change',
        e as any,
      );
    }
    await this.redisService.cacheDel(`users:byId:${this.key({ id })}`);
    await this.invalidateUsersListCaches();
    return { message: 'Password changed successfully' };
  }

  private assertStrongPassword(pw: string) {
    if (typeof pw !== 'string' || pw.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasDigit = /\d/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    if (!(hasUpper && hasLower && hasDigit && hasSpecial)) {
      throw new BadRequestException(
        'Password must include upper, lower, number, and special character',
      );
    }
  }

  /**
   * Cache warming method to pre-populate frequently accessed data
   */
  async warmCache(): Promise<{ message: string; warmedCount: number }> {
    try {
      this.logger.log('Starting cache warming for frequently accessed users');

      // Get recent active users (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentUsers = await this.userModel
        .find({
          isDeleted: { $ne: true },
          createdAt: { $gte: thirtyDaysAgo },
        })
        .select(UsersService.BASE_PROJECTION)
        .limit(50) // Limit to prevent overwhelming the cache
        .lean()
        .exec();

      let warmedCount = 0;

      // Cache individual users
      for (const user of recentUsers) {
        try {
          await this.redisService.cacheSet(
            `users:byId:${this.key({ id: (user as any)._id.toString() })}`,
            user,
            UsersService.CACHE_TTL.USER_BY_ID,
          );
          warmedCount++;
        } catch (error) {
          this.logger.warn(`Failed to warm cache for user ${user._id}:`, error);
        }
      }

      // Cache default user list (first page)
      try {
        await this.getAllUsers({ page: 1, limit: 10 }, {
          type: UserType.SUPER_ADMIN,
        } as unknown as User);
        warmedCount++;
      } catch (error) {
        this.logger.warn('Failed to warm default user list cache:', error);
      }

      this.logger.log(`Cache warming completed. Warmed ${warmedCount} items`);
      return {
        message: 'Cache warming completed successfully',
        warmedCount,
      };
    } catch (error) {
      this.logger.error('Cache warming failed:', error);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Cache warming failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Forgot password - send reset email if user exists
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      // 1. Check if user exists with this email
      const user = await this.userModel.findOne({ email }).lean();

      if (!user) {
        // Return success message even if user doesn't exist (security best practice)
        return {
          message: 'User Not found. Please Check your email.',
        };
      }

      // 2. Generate reset token
      const resetToken = this.generateResetToken();

      // 3. Store reset token in cache with expiry (1 hour)
      const cacheKey = `password_reset:${user._id}`;
      await this.redisService.cacheSet(cacheKey, resetToken, 3600); // 1 hour TTL

      // 4. Generate reset link
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&userId=${user._id}`;

      // 5. Send email with reset link
      await this.sendPasswordResetEmail(user.email, user.name, resetLink);

      return {
        message: 'Please Signin to your email and reset your password.',
      };
    } catch (error) {
      this.logger.error('Error in forgotPassword:', error);
      // Return success message even on error (security best practice)
      return {
        message: 'If the email exists, a password reset link has been sent.',
      };
    }
  }

  /**
   * Generate a secure reset token
   */
  private generateResetToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Send password reset email
   */
  private async sendPasswordResetEmail(
    email: string,
    name: string,
    resetLink: string,
  ): Promise<void> {
    try {
      const {
        EMAIL_TEMPLATES,
        EMAIL_TEMPLATE_VARIABLES,
      } = require('../common/constants/email-templates');

      // Replace template variables
      const htmlContent = EMAIL_TEMPLATES.FORGOT_PASSWORD.html.replace(
        EMAIL_TEMPLATE_VARIABLES.FORGOT_PASSWORD.resetLink,
        resetLink,
      );

      const textContent = EMAIL_TEMPLATES.FORGOT_PASSWORD.text.replace(
        EMAIL_TEMPLATE_VARIABLES.FORGOT_PASSWORD.resetLink,
        resetLink,
      );

      await this.emailService.sendEmail({
        to: email,
        subject: EMAIL_TEMPLATES.FORGOT_PASSWORD.subject,
        html: htmlContent,
        text: textContent,
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}:`,
        error,
      );
      throw error;
    }
  }
}
