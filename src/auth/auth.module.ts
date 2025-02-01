import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import appConfig from 'src/config/app.config';

import { RefreshTokenService } from './auth.refresh.service';

@Module({
  imports: [
    PassportModule,
    ConfigModule.forRoot({
      load: [appConfig],
      ignoreEnvFile: true,
      isGlobal: true,
    }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        // secret: configService.get<string>('jwt.secret'),
        secret: process.env.TOKEN_KEY,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [RefreshTokenService],
  exports: [RefreshTokenService],
})
export class AuthModule {}
