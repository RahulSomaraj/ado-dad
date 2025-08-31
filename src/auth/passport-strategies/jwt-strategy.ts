import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User } from '../../users/schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {
    const secret = process.env.TOKEN_KEY;
    if (!secret) {
      throw new Error('TOKEN_KEY is required for JWTStrategy');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
}

  async validate(payload: any) {
    // 🔹 Check if user exists
    console.log('JWT Strategy - Payload:', payload);
    const user = await this.userModel.findById(payload.id).exec();
    console.log('JWT Strategy - Payload:', payload);
    console.log('JWT Strategy - User from DB:', user);

    if (!user) {
      console.log('User not found');
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          error: 'User not found',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 🔹 Ensure userType is available for role checking
    const userWithType = {
      ...user.toObject(),
      userType: payload.userType || (user as any).userType,
    };

    console.log('JWT Strategy - Final user object:', userWithType);
    return userWithType; // ✅ Return user if valid
  }
}
