import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User } from '../../users/schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {
    const secret =
      process.env.TOKEN_KEY || 'default-secret-key-change-in-production';
    console.log('JWT Strategy - Using secret:', secret ? 'Set' : 'Not set');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    // 🔹 Check if user exists
    console.log('JWT Strategy - Payload:', payload);
    
    // Try to find user by ID (handle both string and ObjectId)
    let user;
    try {
      user = await this.userModel.findById(payload.id).exec();
    } catch (error) {
      console.log('JWT Strategy - Error finding user by ID:', error.message);
      // If findById fails, try to find by _id field
      user = await this.userModel.findOne({ _id: payload.id }).exec();
    }
    
    console.log('JWT Strategy - User from DB:', user);

    if (!user) {
      console.log('User not found for ID:', payload.id);
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          error: 'User not found',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 🔹 Ensure userType is available for role checking and add id property

    console.log(user);
    const userWithType = {
      ...user.toObject(),
      id: (user as any)._id.toString(), // Add id property for compatibility
      userType: payload.userType || (user as any).userType,
    };

    console.log('JWT Strategy - Final user object:', userWithType);
    return userWithType; // ✅ Return user if valid
  }
}
