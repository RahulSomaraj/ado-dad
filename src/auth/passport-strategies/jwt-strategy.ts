import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User } from '../../users/schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.TOKEN_KEY || 'default-secret',
    });
  }

  async validate(payload: any) {
    // 🔹 Check if user exists
    const user = await this.userModel.findById(payload.id).exec();

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          error: 'User not found',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return user; // ✅ Return user if valid
  }
}
