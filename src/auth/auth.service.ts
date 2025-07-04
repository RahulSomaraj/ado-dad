import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

import { User } from '../users/schemas/user.schema';

interface UserValidationResult {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  type: string;
  profilePic?: string;
  isDeleted?: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validate user credentials
   */
  async validateUser(
    username: string,
    password: string,
  ): Promise<UserValidationResult | null> {
    try {
      this.logger.debug(`Validating user: ${username}`);

      // Input validation
      if (!this.isValidInput(username) || !this.isValidInput(password)) {
        this.logger.warn('Invalid input provided for user validation');
        return null;
      }

      const trimmedUsername = username.trim().toLowerCase();

      // Find user with optimized query
      const user = await this.findUserByCredentials(trimmedUsername);

      if (!user) {
        this.logger.debug(`User not found: ${trimmedUsername}`);
        return null;
      }

      // Check if user is deleted
      if (user.isDeleted) {
        this.logger.warn(`Attempted login for deleted user: ${user.email}`);
        return null;
      }

      // Validate password
      const isPasswordValid = await this.validatePassword(password, user);

      if (!isPasswordValid) {
        this.logger.warn(`Invalid password for user: ${user.email}`);
        return null;
      }

      this.logger.log(`User validation successful: ${user.email}`);

      // Return user data without sensitive information
      return this.sanitizeUserData(user);
    } catch (error) {
      this.logger.error(`User validation failed for ${username}:`, error);
      return null;
    }
  }

  /**
   * Find user by various credentials
   */
  private async findUserByCredentials(
    identifier: string,
  ): Promise<User | null> {
    const query = {
      $or: [
        { email: identifier },
        { phoneNumber: identifier },
        { name: { $regex: new RegExp(`^${identifier}$`, 'i') } },
      ],
      isDeleted: { $ne: true },
    };

    return this.userModel
      .findOne(query)
      .select('+password +otp +isDeleted')
      .lean()
      .exec();
  }

  /**
   * Validate user password
   */
  private async validatePassword(
    password: string,
    user: User,
  ): Promise<boolean> {
    try {
      // Check if password matches hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (isPasswordValid) {
        return true;
      }

      // Check if password matches OTP (for temporary access)
      if (user.otp && user.otp === password) {
        this.logger.debug(`OTP used for user: ${user.email}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(
        `Password validation error for user ${user.email}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Sanitize user data for response
   */
  private sanitizeUserData(user: User): UserValidationResult {
    const { password, otp, otpExpires, ...sanitizedUser } = user;
    return sanitizedUser as UserValidationResult;
  }

  /**
   * Validate input string
   */
  private isValidInput(input: string): boolean {
    return typeof input === 'string' && input.length > 0 && input.length <= 255;
  }

  /**
   * Generate OTP for user
   */
  async generateOTP(email: string): Promise<string> {
    try {
      const user = await this.userModel.findOne({
        email,
        isDeleted: { $ne: true },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const otp = this.generateRandomOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await this.userModel.updateOne(
        { _id: user._id },
        {
          $set: {
            otp,
            otpExpires,
          },
        },
      );

      this.logger.log(`OTP generated for user: ${email}`);
      return otp;
    } catch (error) {
      this.logger.error(`OTP generation failed for ${email}:`, error);
      throw error;
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(email: string, otp: string): Promise<boolean> {
    try {
      const user = await this.userModel.findOne({
        email,
        otp,
        otpExpires: { $gt: new Date() },
        isDeleted: { $ne: true },
      });

      if (!user) {
        return false;
      }

      // Clear OTP after successful verification
      await this.userModel.updateOne(
        { _id: user._id },
        { $unset: { otp: 1, otpExpires: 1 } },
      );

      this.logger.log(`OTP verified for user: ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`OTP verification failed for ${email}:`, error);
      return false;
    }
  }

  /**
   * Generate random 6-digit OTP
   */
  private generateRandomOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Check if user exists
   */
  async userExists(identifier: string): Promise<boolean> {
    try {
      const user = await this.findUserByCredentials(identifier.toLowerCase());
      return !!user;
    } catch (error) {
      this.logger.error(
        `User existence check failed for ${identifier}:`,
        error,
      );
      return false;
    }
  }
}
