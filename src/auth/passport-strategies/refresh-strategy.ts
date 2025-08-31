import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { User } from '../../users/schemas/user.schema';
import { AuthTokens } from '../schemas/schema.refresh-token';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'refresh-token',
) {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(AuthTokens.name) private authTokenModel: Model<AuthTokens>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: (() => { const s = process.env.TOKEN_KEY; if (!s) { throw new Error('TOKEN_KEY is required for RefreshTokenStrategy'); } return s; })(),
    });
  }

  async validate(payload: any) {
    const refreshToken = payload.refreshToken;
    const existingLogins = await this.authTokenModel.find().exec();

    let storedRefreshToken: any = null;
    for (const userSession of existingLogins) {
      if (await bcrypt.compare(refreshToken, userSession.token)) {
        storedRefreshToken = userSession;
        break;
      }
    }

    if (
      !storedRefreshToken ||
      storedRefreshToken.userId.toString() !== payload.id
    ) {
      throw new HttpException(
        { status: HttpStatus.UNAUTHORIZED, error: 'Invalid Token' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.userModel.findById(storedRefreshToken.userId).exec();
  }
}
