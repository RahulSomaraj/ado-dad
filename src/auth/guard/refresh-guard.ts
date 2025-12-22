import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenService } from '../auth.refresh.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/schemas/user.schema';
import { AuthTokens } from '../schemas/schema.refresh-token';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(AuthTokens.name)
    private readonly authTokenModel: Model<AuthTokens>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const refreshToken = request.body?.refreshToken;

    if (!refreshToken) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          error: 'Refresh token is required',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const decodedToken = this.jwtService.verify(refreshToken);

      // Fetch existing logins (AuthTokens) for the user
      const existingLogins = await this.authTokenModel
        .find({ userId: decodedToken.id })
        .exec();

      let storedRefreshToken: any = null;
      for (const userSession of existingLogins) {
        if (await bcrypt.compare(refreshToken, userSession.token)) {
          storedRefreshToken = userSession;
          break;
        }
      }

      if (
        !storedRefreshToken ||
        storedRefreshToken.userId.toString() !== decodedToken.id
      ) {
        throw new HttpException(
          {
            status: HttpStatus.UNAUTHORIZED,
            error: 'Credentials Expired. Please log in again.',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Fetch user details
      request.user = await this.userModel
        .findOne({ _id: storedRefreshToken.userId })
        .exec();

      // Store the old refresh token ID for deletion after new token generation
      request.storedRefreshTokenId = storedRefreshToken._id;

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw new HttpException(error.getResponse(), error.getStatus());
      } else {
        throw new HttpException(
          {
            status: HttpStatus.UNAUTHORIZED,
            error: 'Error processing credentials.',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }
    }
  }
}
