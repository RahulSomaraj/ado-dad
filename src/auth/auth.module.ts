import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import appConfig from 'src/config/app.config';

import { RefreshTokenService } from './auth.refresh.service';
import { AuthService } from './auth.service';
import { CustomJwtStrategy } from './passport-strategies/custom-jwt-strategy';
import { JwtStrategy } from './passport-strategies/jwt-strategy';
import { LocalStrategy } from './passport-strategies/local-strategy';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { AuthTokens, AuthTokensSchema } from './schemas/schema.refresh-token';

@Module({
  imports: [
    PassportModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: AuthTokens.name, schema: AuthTokensSchema },
    ]), // ✅ Register UserModel
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
  providers: [
    RefreshTokenService,
    AuthService,
    RefreshTokenService,
    LocalStrategy,
    JwtStrategy,
    // FirebaseAuthStrategy,
    CustomJwtStrategy,
  ],
  exports: [RefreshTokenService, AuthService],
})
export class AuthModule {}
