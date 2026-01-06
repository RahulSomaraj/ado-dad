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
  countryCode?: string;
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

      // Trim username but don't convert to lowercase (phone numbers need to preserve + prefix)
      const trimmedUsername = username.trim();

      console.log('trimmedUsername', trimmedUsername);

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
      this.logger.error(
        `User validation failed for ${username}:`,
        error as any,
      );
      return null;
    }
  }

  /**
   * Find user by various credentials
   */
  private async findUserByCredentials(
    identifier: string,
  ): Promise<User | null> {
    // Check if identifier is an email
    const isEmail = /.+@.+\..+/.test(identifier);

    if (isEmail) {
      // If it's an email, search by email
      const query = {
        email: identifier.toLowerCase(),
        isDeleted: { $ne: true },
      };
      this.logger.debug('Email query:', query);
      return this.userModel
        .findOne(query)
        .select('+password +otp +isDeleted')
        .lean()
        .exec() as any;
    }

    // Try to parse phone number with country code
    const { parsePhoneNumber } =
      await import('../common/utils/phone-validator.util');
    const parsed = parsePhoneNumber(identifier);
    console.log('parsed', parsed);

    if (parsed) {
      // If phone number is successfully parsed, search by countryCode + phoneNumber
      const query = {
        countryCode: parsed.countryCode,
        phoneNumber: parsed.phoneNumber,
        isDeleted: { $ne: true },
      };
      this.logger.debug('Phone query:', query);
      return this.userModel
        .findOne(query)
        .select('+password +otp +isDeleted')
        .lean()
        .exec() as any;
    }

    // Fallback: search by phoneNumber only (for backward compatibility)
    // Try to extract just the phone number part (remove country code if present)
    let phoneNumberOnly = identifier;
    // Remove country code if present (e.g., +91, 91, +971, etc.)
    // Pattern: optional +, 1-4 digits (country code), followed by phone number
    const phoneCodeMatch = identifier.match(/^\+?(\d{1,4})(\d+)$/);
    if (phoneCodeMatch) {
      // Extract just the phone number part (after country code)
      phoneNumberOnly = phoneCodeMatch[2];
    } else {
      // If no country code pattern, remove all non-digits
      phoneNumberOnly = identifier.replace(/\D/g, '');
    }

    const query = {
      phoneNumber: phoneNumberOnly,
      isDeleted: { $ne: true },
    };
    this.logger.debug('Fallback query:', query);
    return this.userModel
      .findOne(query)
      .select('+password +otp +isDeleted')
      .lean()
      .exec() as any;
  }

  /**
   * Validate user password
   */
  private async validatePassword(
    password: string,
    user: User,
  ): Promise<boolean> {
    try {
      // Check if user has a password
      if (!user.password) {
        this.logger.warn(`User ${user.email} has no password set`);
        return false;
      }

      // Check if password matches hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (isPasswordValid) {
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(
        `Password validation error for user ${user.email}:`,
        error as any,
      );
      return false;
    }
  }

  /**
   * Sanitize user data for response
   */
  private sanitizeUserData(user: User): UserValidationResult {
    const { password, otp, otpExpires, ...sanitizedUser } = user;
    console.log('sanitizedUser', sanitizedUser);
    return {
      ...sanitizedUser,
      _id: sanitizedUser._id.toString(),
    } as UserValidationResult;
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
      // Don't convert to lowercase - let findUserByCredentials handle email/phone number detection
      const user = await this.findUserByCredentials(identifier.trim());
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
