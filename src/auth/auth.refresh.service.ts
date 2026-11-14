import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthTokens } from './schemas/schema.refresh-token';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectModel(AuthTokens.name) private refreshTokenModel: Model<AuthTokens>,
  ) {}

  async createRefreshToken(userId: string, token: string): Promise<AuthTokens> {
    const refreshToken = new this.refreshTokenModel({ userId, token });
    return refreshToken.save();
  }

  async removeRefreshToken(token: string): Promise<void> {
    await this.refreshTokenModel.deleteOne({ token }).exec();
  }
}
