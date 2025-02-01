import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from './common/dtos/userLoginDto';
import { User } from './users/schemas/user.schema';
import { AuthTokens } from './auth/schemas/schema.refresh-token';
import { RefreshTokenDto } from './auth/dto/refresh-token.dto';

@Injectable()
export class AppService {
  constructor(
    private jwtService: JwtService,
    @InjectModel(AuthTokens.name)
    private readonly authTokenModel: Model<AuthTokens>,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async login(
    userLoginDto: LoginUserDto,
    user: User,
  ): Promise<{
    id: any;
    token: string;
    refreshToken: string;
    userName: string;
    email: string;
    userType: string;
  }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.sign(
        { id: user._id, email: user.email },
        { secret: process.env.TOKEN_KEY },
      ),
      this.jwtService.sign(
        { id: user._id, email: user.email },
        {
          secret: process.env.TOKEN_KEY,
          expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        },
      ),
    ]);

    // Extract 'iat' (Issued At) from the refresh token
    const { iat } = await this.jwtService.verify(refreshToken, {
      secret: process.env.TOKEN_KEY,
    });

    // 🔹 Store refresh token in MongoDB
    await new this.authTokenModel({
      userId: user._id, // MongoDB uses '_id' instead of 'id'
      token: refreshToken,
      iat,
    }).save();

    return {
      id: user._id, // Convert ObjectId to string
      token: `Bearer ${accessToken}`,
      refreshToken,
      userName: user.name,
      email: user.email,
      userType: user.type,
    };
  }

  async getRefreshToken(user: User) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.sign(
        { id: user._id, email: user.email },
        { secret: process.env.TOKEN_KEY },
      ),
      this.jwtService.sign(
        { id: user._id, email: user.email },
        { secret: process.env.TOKEN_KEY, expiresIn: '60d' },
      ),
    ]);

    await new this.authTokenModel({
      userId: user._id,
      token: refreshToken,
    }).save();

    return {
      id: user._id,
      token: `Bearer ${accessToken}`,
      refreshToken,
      userName: user.name,
      email: user.email,
      userType: user.type,
    };
  }

  async logoutAllSessions(user: User) {
    const deletedStatus = await this.authTokenModel
      .deleteMany({
        userId: user._id,
      })
      .exec();

    if (deletedStatus.deletedCount > 0) {
      return { message: 'Logged out from all instances' };
    }

    throw new HttpException(
      { status: HttpStatus.BAD_REQUEST, error: 'User instances not found' },
      HttpStatus.BAD_REQUEST,
    );
  }

  async logout(refreshTokenDto: RefreshTokenDto, user: User) {
    const jwtTokenDecode = this.jwtService.verify(
      refreshTokenDto.refreshToken,
      {
        secret: process.env.TOKEN_KEY,
      },
    );

    const userSessions = await this.authTokenModel
      .find({
        userId: user._id,
        iat: jwtTokenDecode.iat,
      })
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

    if (storedRefreshToken && storedRefreshToken._id) {
      const deletedStatus = await this.authTokenModel
        .deleteOne({
          _id: storedRefreshToken._id,
        })
        .exec();

      if (deletedStatus.deletedCount > 0) {
        return { message: 'Logged out successfully' };
      }
    }

    throw new HttpException(
      { status: HttpStatus.BAD_REQUEST, error: 'User instance not found' },
      HttpStatus.BAD_REQUEST,
    );
  }
}
