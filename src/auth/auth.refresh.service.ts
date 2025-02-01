// refresh-token.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import * as bcrypt from 'bcrypt';
import { AuthTokens } from './schemas/schema.refresh-token';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(AuthTokens)
    private refreshTokenRepository: Repository<AuthTokens>,
  ) {}

  async createRefreshToken(userId: number, token: string): Promise<AuthTokens> {
    const refreshToken = this.refreshTokenRepository.create({
      userId,
      token,
    });
    return this.refreshTokenRepository.save(refreshToken);
  }

  async removeRefreshToken(token: string): Promise<void> {
    await this.refreshTokenRepository.delete({ token });
  }
}
