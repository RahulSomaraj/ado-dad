import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';

import { User } from '../../users/schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private configService: ConfigService,
  ) {
    const secret =
      configService.get('TOKEN_KEY') ||
      'default-secret-key-change-in-production';
    console.log('JWT Strategy - Using secret:', secret ? 'Set' : 'Not set');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    // Try to find user by ID (handle both string and ObjectId)
    let user;
    try {
      user = await this.userModel.findById(payload.id).exec();
    } catch (error) {
      // If findById fails, try to find by _id field
      user = await this.userModel.findOne({ _id: payload.id }).exec();
    }

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          error: 'User not found',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Return user with id property for compatibility
    const userWithType = {
      ...user.toObject(),
      id: (user as any)._id.toString(),
      type: (user as any).type,
    };

    return userWithType;
  }
}
