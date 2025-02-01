import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';
import { EncryptionUtil } from '../common/encryption.util';

@Module({
  imports: [PassportModule, JwtModule.register({ secret: 'your-secret-key' })],
  providers: [AuthService, JwtStrategy, LocalStrategy, EncryptionUtil],
  controllers: [AuthController],
})
export class AuthModule {}
