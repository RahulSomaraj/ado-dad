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
import { User } from 'src/users/schemas/user.schema';
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
          error: 'Incorrect password for the user.',
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

      return true;
    } catch (error) {
      console.log(error);
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
