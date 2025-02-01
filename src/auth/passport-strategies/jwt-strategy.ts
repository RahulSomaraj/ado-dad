import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User } from 'src/users/schemas/user.schema';
import { AuthTokens } from '../schemas/schema.refresh-token';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(AuthTokens.name) private authTokenModel: Model<AuthTokens>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.TOKEN_KEY || 'default-secret', // Ensure this is set
    });
  }

  async validate(payload: any) {
    // 🔹 Check if user and refresh token exist
    const [user, authToken] = await Promise.all([
      this.userModel.findById(payload.id).exec(),
      this.authTokenModel.findOne({ userId: payload.id }).exec(),
    ]);

    if (!user || !authToken) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          error: 'Invalid token or user not found',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return user; // ✅ Return user if valid
  }
}
