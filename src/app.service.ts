import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// DTOs and Schemas
import { LoginUserDto } from './common/dtos/userLoginDto';
import { User } from './users/schemas/user.schema';
import { AuthTokens } from './auth/schemas/schema.refresh-token';
import { RefreshTokenDto } from './auth/dto/refresh-token.dto';

// Types
export interface LoginResponse {
  id: string;
  token: string;
  refreshToken: string;
  userName: string;
  email: string;
  userType: string;
}

interface TokenPayload {
  id: string;
  email: string;
  userType: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(AuthTokens.name)
    private readonly authTokenModel: Model<AuthTokens>,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  /**
   * Authenticate user and generate access and refresh tokens
   */
  async login(userLoginDto: LoginUserDto, user: User): Promise<LoginResponse> {
    try {
      this.logger.log(`User login attempt: ${user.email}`);

      const tokenPayload: TokenPayload = {
        id: user._id?.toString() || '',
        email: user.email,
        userType: user.type,
      };

      const [accessToken, refreshToken] = await Promise.all([
        this.generateAccessToken(tokenPayload),
        this.generateRefreshToken(tokenPayload),
      ]);

      // Extract 'iat' from the refresh token
      const { iat } = await this.jwtService.verify(refreshToken, {
        secret: this.configService.get('TOKEN_KEY'),
      });

      // Clean up existing tokens and save new refresh token
      await this.saveRefreshToken(
        user._id?.toString() || '',
        refreshToken,
        iat,
      );

      this.logger.log(`User login successful: ${user.email}`);

      return {
        id: user._id?.toString() || '',
        token: `Bearer ${accessToken}`,
        refreshToken,
        userName: user.name,
        email: user.email,
        userType: user.type,
      };
    } catch (error) {
      this.logger.error(`Login failed for user ${user.email}:`, error);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Authentication failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate new access and refresh tokens
   */
  async getRefreshToken(user: User): Promise<LoginResponse> {
    try {
      this.logger.log(`Token refresh for user: ${user.email}`);

      const tokenPayload: TokenPayload = {
        id: user._id?.toString() || '',
        email: user.email,
        userType: user.type,
      };

      const [accessToken, refreshToken] = await Promise.all([
        this.generateAccessToken(tokenPayload),
        this.generateRefreshToken(tokenPayload),
      ]);

      const { iat } = await this.jwtService.verify(refreshToken, {
        secret: this.configService.get('TOKEN_KEY'),
      });

      await this.saveRefreshToken(
        user._id?.toString() || '',
        refreshToken,
        iat,
      );

      this.logger.log(`Token refresh successful: ${user.email}`);

      return {
        id: user._id?.toString() || '',
        token: `Bearer ${accessToken}`,
        refreshToken,
        userName: user.name,
        email: user.email,
        userType: user.type,
      };
    } catch (error) {
      this.logger.error(`Token refresh failed for user ${user.email}:`, error);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Token refresh failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Logout user from all sessions
   */
  async logoutAllSessions(user: User): Promise<{ message: string }> {
    try {
      this.logger.log(`Logout all sessions for user: ${user.email}`);

      const { deletedCount } = await this.authTokenModel.deleteMany({
        userId: user._id,
      });

      if (deletedCount > 0) {
        this.logger.log(
          `Logged out from ${deletedCount} sessions for user: ${user.email}`,
        );
        return { message: `Logged out from ${deletedCount} sessions` };
      }

      this.logger.warn(`No active sessions found for user: ${user.email}`);
      return { message: 'No active sessions found' };
    } catch (error) {
      this.logger.error(
        `Logout all sessions failed for user ${user.email}:`,
        error,
      );
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Logout failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Logout user from specific session
   */
  async logout(
    refreshTokenDto: RefreshTokenDto,
    user: User,
  ): Promise<{ message: string }> {
    try {
      this.logger.log(`Logout attempt for user: ${user.email}`);

      if (!refreshTokenDto.refreshToken) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Refresh token is required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const jwtTokenDecode = this.jwtService.verify(
        refreshTokenDto.refreshToken,
        {
          secret: this.configService.get('TOKEN_KEY'),
        },
      ) as TokenPayload;

      const userSessions = await this.authTokenModel
        .find({
          userId: user._id,
          iat: jwtTokenDecode.iat,
        })
        .lean()
        .exec();

      let storedRefreshToken: any = null;
      for (const userSession of userSessions) {
        if (
          await bcrypt.compare(refreshTokenDto.refreshToken, userSession.token)
        ) {
          storedRefreshToken = userSession;
          break;
        }
      }

      if (storedRefreshToken?._id) {
        const { deletedCount } = await this.authTokenModel
          .deleteOne({ _id: storedRefreshToken._id })
          .exec();

        if (deletedCount > 0) {
          this.logger.log(`Logout successful for user: ${user.email}`);
          return { message: 'Logged out successfully' };
        }
      }

      this.logger.warn(`No matching session found for user: ${user.email}`);
      return { message: 'No matching session found' };
    } catch (error) {
      this.logger.error(`Logout failed for user ${user.email}:`, error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Logout failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate access token
   */
  private async generateAccessToken(payload: TokenPayload): Promise<string> {
    return this.jwtService.sign(payload, {
      secret: this.configService.get('TOKEN_KEY'),
      expiresIn: this.configService.get('ACCESS_TOKEN_EXPIRY') || '1h',
      issuer: 'ado-dad-api',
      audience: 'ado-dad-users',
    });
  }

  /**
   * Generate refresh token
   */
  private async generateRefreshToken(payload: TokenPayload): Promise<string> {
    return this.jwtService.sign(payload, {
      secret: this.configService.get('TOKEN_KEY'),
      expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRY') || '60d',
      issuer: 'ado-dad-api',
      audience: 'ado-dad-users',
    });
  }

  /**
   * Save refresh token to database
   */
  private async saveRefreshToken(
    userId: string,
    refreshToken: string,
    iat: number,
  ): Promise<void> {
    // Clean up existing tokens with same iat
    await this.authTokenModel.deleteMany({
      userId,
      iat,
    });

    // Save new refresh token
    await new this.authTokenModel({
      userId,
      token: refreshToken,
      iat,
    }).save();
  }
}
