import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppVersionController } from './app-version.controller';
import { AppVersionService } from './app-version.service';
import { AppVersion, AppVersionSchema } from './schemas/app-version.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: AppVersion.name, schema: AppVersionSchema },
        ]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret:
                    configService.get('TOKEN_KEY') ||
                    'default-secret-key-change-in-production',
                signOptions: {
                    expiresIn: configService.get('ACCESS_TOKEN_EXPIRY') || '1h',
                    issuer: 'ado-dad-api',
                    audience: 'ado-dad-users',
                },
                verifyOptions: {
                    issuer: 'ado-dad-api',
                    audience: 'ado-dad-users',
                },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [AppVersionController],
    providers: [AppVersionService],
    exports: [AppVersionService],
})
export class AppVersionModule { }
