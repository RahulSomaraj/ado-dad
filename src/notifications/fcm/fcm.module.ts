import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FirebaseProvider } from '../../shared/firebase/firebase.provider';
import { FcmService } from './fcm.service';
import { FcmToken, FcmTokenSchema } from './schemas/fcm-token.schema';
import { FcmTokenRepository } from './repositories/fcm-token.repo';
import { FcmController } from './fcm.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: FcmToken.name, schema: FcmTokenSchema },
        ]),
    ],
    providers: [FirebaseProvider, FcmService, FcmTokenRepository],
    controllers: [FcmController],
    exports: [FcmService],
})
export class FcmModule { }
