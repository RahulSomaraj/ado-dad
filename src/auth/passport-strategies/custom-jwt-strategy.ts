import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  ExtractJwt,
  StrategyOptionsWithoutRequest,
} from 'passport-jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { AuthTokens } from '../schemas/schema.refresh-token';

@Injectable()
export class CustomJwtStrategy extends PassportStrategy(
  Strategy,
  'custom-jwt',
) {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(AuthTokens.name) private authTokenModel: Model<AuthTokens>,
  ) {
    const options: StrategyOptionsWithoutRequest = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.TOKEN_KEY || 'default-secret', // Ensure this value exists
    };

    super(options);
  }

  async validate(payload: any) {
    const [user, authToken] = await Promise.all([
      this.userModel.findById(payload.id).exec(),
      this.authTokenModel.findOne({ userId: payload.id }).exec(),
    ]);

    if (user && authToken) {
      return user;
    }
    return null;
  }
}
